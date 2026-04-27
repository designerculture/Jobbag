import { NextResponse } from 'next/server'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzEjYFVxJ7re-EkCYjDjSJaL2baj-qeOQZPe7udqyiYMHZnTzOuvaaRiNx7GvUSsz3s_w/exec'

const VALID_STATUSES = ['New', 'In Progress', 'Pending', 'Review', 'Done'] as const
const VALID_DS       = ['Not Review', 'Review', 'Approved By Manager'] as const
const VALID_RT       = ['Design', 'Multimedia', 'Bundle Request'] as const

export const dynamic       = 'force-dynamic'
export const revalidate    = 0
export const fetchCache    = 'force-no-store'

// Fungsi fetch yang handle redirect Apps Script dengan benar
async function fetchGAS(url: string, options: RequestInit = {}): Promise<string> {
  // Step 1: fetch tanpa follow redirect untuk dapat Location header
  const res1 = await fetch(url, {
    ...options,
    redirect: 'manual',
    cache:    'no-store',
  })

  // Jika langsung 200, ambil body
  if (res1.status === 200) return res1.text()

  // Jika ada redirect (301/302), follow manual ke Location URL
  if (res1.status === 301 || res1.status === 302 || res1.status === 307 || res1.status === 308) {
    const location = res1.headers.get('location')
    if (!location) throw new Error('Redirect tanpa Location header')
    const res2 = await fetch(location, {
      ...options,
      redirect: 'follow',
      cache:    'no-store',
    })
    return res2.text()
  }

  // Status lain — coba baca body
  return res1.text()
}

export async function GET() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)

  try {
    const text = await fetchGAS(
      `${GAS_URL}?action=getTickets&_=${Date.now()}`,
      {
        signal:  controller.signal,
        headers: {
          'Accept':          'application/json, text/plain, */*',
          'User-Agent':      'Mozilla/5.0',
        },
      }
    )
    clearTimeout(timer)

    if (!text || !text.trim().startsWith('{')) {
      return NextResponse.json(
        { success: false, tickets: [], error: 'Response bukan JSON: ' + text.slice(0, 150) },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const raw = JSON.parse(text) as {
      success?: boolean
      tickets?: Record<string, string>[]
      status?:  string
      error?:   string
      total?:   number
    }

    // Schema lama — perlu deploy ulang
    if (raw.status && !raw.success) {
      return NextResponse.json(
        { success: false, tickets: [], needsDeploy: true },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    if (!Array.isArray(raw.tickets)) {
      return NextResponse.json(
        { success: false, tickets: [], error: raw.error || 'Format response tidak valid' },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const tickets = raw.tickets
      .filter(r => !!r.ticketNumber)
      .map(r => ({
        id:                  r.ticketNumber,
        ticketNumber:        r.ticketNumber,
        fullName:            r.fullName          || '',
        email:               r.email             || '',
        emailOptional1:      r.emailOptional1    || undefined,
        emailOptional2:      r.emailOptional2    || undefined,
        initials:            r.initials          || '',
        department:          r.department        || '',
        title:               r.title             || '',
        description:         r.description       || '',
        requestType:         VALID_RT.includes(r.requestType as never) ? r.requestType : 'Design',
        category:            r.category          || '',
        linkReference:       r.linkReference     || undefined,
        attachmentDriveUrl:  r.file1DriveUrl     || undefined,
        attachmentDriveUrl2: r.file2DriveUrl     || undefined,
        attachmentDriveUrl3: r.file3DriveUrl     || undefined,
        deadline:            r.deadline          || '',
        prepDate:            r.prepDate          || undefined,
        assignedDesigner:    r.assignedDesigner  || undefined,
        assignedDesigners:   r.assignedDesigners
          ? r.assignedDesigners.split(',').map((s: string) => s.trim()).filter(Boolean)
          : undefined,
        status:              VALID_STATUSES.includes(r.status as never) ? r.status : 'New',
        designerStatus:      VALID_DS.includes(r.designerStatus as never) ? r.designerStatus : 'Not Review',
        feedback:            r.feedback          || undefined,
        designerNotes:       r.designerNotes     || undefined,
        submittedAt:         r.submittedAt       || '',
        createdAt:           r.timestampSubmit   || r.submittedAt || new Date().toISOString(),
        updatedAt:           r.lastUpdated       || r.submittedAt || new Date().toISOString(),
        timeline:            buildTimeline(r),
      }))

    return NextResponse.json(
      { success: true, tickets, total: tickets.length },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err: unknown) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, tickets: [], error: msg },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

function buildTimeline(r: Record<string, string>) {
  const ev = []
  if (r.timestampSubmit)   ev.push({ action: 'Jobbag Submitted',     timestamp: r.timestampSubmit,   actor: r.fullName })
  if (r.timestampAssign)   ev.push({ action: 'Assigned to Designer', timestamp: r.timestampAssign,   actor: 'Dispatcher' })
  if (r.timestampReview)   ev.push({ action: 'Submitted for Review', timestamp: r.timestampReview,   actor: r.assignedDesigner || 'Designer' })
  if (r.timestampApproved) ev.push({ action: 'Approved By Manager',  timestamp: r.timestampApproved, actor: 'Manager' })
  if (r.timestampShared)   ev.push({ action: 'Shared to Requester',  timestamp: r.timestampShared,   actor: 'Designer' })
  return ev
}
