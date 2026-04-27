import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEjYFVxJ7re-EkCYjDjSJaL2baj-qeOQZPe7udqyiYMHZnTzOuvaaRiNx7GvUSsz3s_w/exec'

// Email tim
const DESIGNER_EMAIL   = 'designer@asuransiastra.com'
const DISPATCHER_EMAIL = 'fpranadjaja@asuransiastra.com'
const QC_EMAIL         = 'ssaraswati@asuransiastra.com'
const BRANDCOM_TEAM    = ['eflowrenza@asuransiastra.com', 'osaputri@asuransiastra.com']

interface EmailPayload {
  type: 'submitted' | 'assigned' | 'review' | 'approved' | 'shared'
  ticket: {
    ticketNumber:    string
    fullName:        string
    email:           string
    emailOptional1?: string
    emailOptional2?: string
    department:      string
    title:           string
    description:     string
    requestType?:    string
    category:        string
    linkReference?:  string
    attachmentName?:      string
    attachmentDriveUrl?:  string
    attachmentName2?:     string
    attachmentDriveUrl2?: string
    attachmentName3?:     string
    attachmentDriveUrl3?: string
    deadline:             string
    prepDate?:            string
    assignedDesigner?:    string
    assignedDesigners?:   string[]
    designerNotes?:       string
    feedback?:            string
  }
}

function buildEmailPayload(type: EmailPayload['type'], ticket: EmailPayload['ticket']) {
  const t = ticket
  const recipientEmails = [t.email, t.emailOptional1, t.emailOptional2].filter(Boolean) as string[]

  const isFileLink = (v?: string) => v?.startsWith('http')

  // Build designer display string
  const designerDisplay = t.assignedDesigners && t.assignedDesigners.length > 1
    ? t.assignedDesigners.join(', ')
    : t.assignedDesigner || ''

  // Deadline label depends on request type
  const deadlineLabel =
    t.requestType === 'Multimedia' ? 'Event Date'
    : t.requestType === 'Bundle Request' ? 'Target Date'
    : 'Design Deadline'

  // File upload details — hanya tampilkan yang ada
  const fileDetails = []
  if (t.attachmentName || t.attachmentDriveUrl) {
    fileDetails.push({
      label: 'File Upload 1',
      value: t.attachmentDriveUrl || t.attachmentName || '',
      isLink: !!t.attachmentDriveUrl,
    })
  }
  if (t.attachmentName2 || t.attachmentDriveUrl2) {
    fileDetails.push({
      label: 'File Upload 2',
      value: t.attachmentDriveUrl2 || t.attachmentName2 || '',
      isLink: !!t.attachmentDriveUrl2,
    })
  }
  if (t.attachmentName3 || t.attachmentDriveUrl3) {
    fileDetails.push({
      label: 'File Upload 3',
      value: t.attachmentDriveUrl3 || t.attachmentName3 || '',
      isLink: !!t.attachmentDriveUrl3,
    })
  }

  const baseDetails = [
    { label: 'Request ID',       value: t.ticketNumber },
    { label: 'Nama Requester',   value: t.fullName },
    { label: 'Email',            value: t.email },
    { label: 'Department',       value: t.department },
    ...(t.requestType ? [{ label: 'Tipe Permintaan', value: t.requestType }] : []),
    { label: 'Judul Permintaan', value: t.title },
    { label: 'Deskripsi',        value: t.description },
    { label: 'Kategori',         value: t.category },
    ...(t.linkReference ? [{ label: 'Link File', value: t.linkReference, isLink: true }] : []),
    ...fileDetails,
    { label: deadlineLabel, value: t.deadline },
    ...(t.prepDate ? [{ label: 'Event Date 2', value: t.prepDate }] : []),
    ...(designerDisplay ? [{ label: t.assignedDesigners && t.assignedDesigners.length > 1 ? 'Designers' : 'Designer', value: designerDisplay }] : []),
  ]

  const approvedDetails = [
    { label: 'Request ID',       value: t.ticketNumber },
    { label: 'Nama Requester',   value: t.fullName },
    { label: 'Judul Permintaan', value: t.title },
    { label: 'Deskripsi',        value: t.description },
    ...(t.requestType ? [{ label: 'Tipe Permintaan', value: t.requestType }] : []),
    { label: 'Kategori',         value: t.category },
    { label: deadlineLabel,      value: t.deadline },
    ...(t.prepDate ? [{ label: 'Event Date 2', value: t.prepDate }] : []),
    ...(designerDisplay ? [{ label: t.assignedDesigners && t.assignedDesigners.length > 1 ? 'Designers' : 'Designer', value: designerDisplay }] : []),
    { label: 'Designer Notes',   value: t.designerNotes || '-', isLink: isFileLink(t.designerNotes) },
    { label: 'Feedback Manager', value: t.feedback || '-' },
  ]

  const sharedDetails = [
    { label: 'Request ID',       value: t.ticketNumber },
    { label: 'Nama Requester',   value: t.fullName },
    { label: 'Judul Permintaan', value: t.title },
    { label: 'Deskripsi',        value: t.description },
    ...(t.requestType ? [{ label: 'Tipe Permintaan', value: t.requestType }] : []),
    { label: 'Kategori',         value: t.category },
    { label: deadlineLabel,      value: t.deadline },
    ...(t.prepDate ? [{ label: 'Event Date 2', value: t.prepDate }] : []),
    ...(designerDisplay ? [{ label: t.assignedDesigners && t.assignedDesigners.length > 1 ? 'Designers' : 'Designer', value: designerDisplay }] : []),
    { label: 'Designer Notes',   value: t.designerNotes || '-', isLink: isFileLink(t.designerNotes) },
    { label: 'Feedback Manager', value: t.feedback || '-' },
  ]

  const reviewDetails = [
    ...baseDetails,
    ...(t.designerNotes ? [{ label: 'Designer Note', value: t.designerNotes, isLink: isFileLink(t.designerNotes) }] : []),
  ]

  const baseSubject = `[${t.ticketNumber}] ${t.title}`

  // For assigned email: if multi-designer, we note in message
  const isMultiDesigner = !!(t.assignedDesigners && t.assignedDesigners.length > 1)
  const assignedMessage = isMultiDesigner
    ? `Request Anda sudah kami assign ke ${t.assignedDesigners!.length} designer (${designerDisplay}) dan saat ini sedang dalam proses pengerjaan. Tim kami sedang menyiapkan hasil terbaik untuk Anda.`
    : 'Request Anda sudah kami assign ke designer dan saat ini sedang dalam proses pengerjaan. Tim kami sedang menyiapkan hasil terbaik untuk Anda. Stay tuned ya!'

  switch (type) {
    case 'submitted':
      return {
        action: 'sendEmail', type,
        ticketNumber: t.ticketNumber,
        isFirst: true,
        subject: `Jobbag Submitted - ${baseSubject}`,
        to: recipientEmails,
        cc: [DISPATCHER_EMAIL, DESIGNER_EMAIL],
        headline: 'Jobbag Berhasil Disubmit',
        message: 'Terima kasih! Request Anda berhasil diterima dan akan segera diproses oleh tim designer.',
        status: 'Pending', statusColor: '#f59e0b',
        details: baseDetails,
      }
    case 'assigned':
      return {
        action: 'sendEmail', type,
        ticketNumber: t.ticketNumber,
        isFirst: false,
        subject: `Jobbag Assigned To - ${baseSubject}`,
        to: recipientEmails,
        cc: [DESIGNER_EMAIL],
        headline: isMultiDesigner ? `Jobbag Di Assign ke ${t.assignedDesigners!.length} Designer` : 'Jobbag Di Assign',
        message: assignedMessage,
        status: 'In Progress', statusColor: '#3b82f6',
        details: baseDetails,
      }
    case 'review':
      return {
        action: 'sendEmail', type,
        ticketNumber: t.ticketNumber,
        isFirst: false,
        subject: `Ready For Review - ${baseSubject}`,
        to: [DISPATCHER_EMAIL],
        cc: [DESIGNER_EMAIL],
        headline: 'Jobbag Siap Di Review',
        message: 'Hasil pekerjaan sudah siap untuk direview. Silakan masuk ke Dashboard untuk melihat preview dan memberikan feedback atau revisi jika diperlukan.',
        status: 'Review', statusColor: '#8b5cf6',
        details: reviewDetails,
      }
    case 'approved':
      return {
        action: 'sendEmail', type,
        ticketNumber: t.ticketNumber,
        isFirst: false,
        subject: `Jobbag Approved - ${baseSubject}`,
        to: [DISPATCHER_EMAIL],
        cc: [DESIGNER_EMAIL],
        headline: 'Jobbag Disetujui Manager',
        message: 'Hasil pekerjaan anda telah disetujui oleh Manager. Selanjutnya, segera diproses untuk pengiriman kepada user/tujuan akhir. Terima kasih atas kerja samanya.',
        status: 'Approved By Manager', statusColor: '#10b981',
        details: approvedDetails,
      }
    case 'shared':
      return {
        action: 'sendEmail', type,
        ticketNumber: t.ticketNumber,
        isFirst: false,
        subject: `Shared Jobbag - ${baseSubject}`,
        to: recipientEmails,
        cc: [DESIGNER_EMAIL, QC_EMAIL, ...BRANDCOM_TEAM],
        headline: 'Jobbag Anda Telah Selesai',
        message: 'Jobbag Anda telah selesai dan hasilnya sudah dibagikan. Semoga hasilnya sesuai kebutuhan Anda. Jangan ragu hubungi kami jika masih ada revisi atau request tambahan.',
        status: 'Done', statusColor: '#10b981',
        details: sharedDetails,
      }
  }
}

async function callGAS(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 35_000)
  const body  = JSON.stringify(payload)
  const headers = {
    'Content-Type': 'application/json',
    'Accept':       'application/json, text/plain, */*',
    'User-Agent':   'Mozilla/5.0',
  }

  try {
    // Step 1: POST ke Apps Script /exec dengan redirect:manual
    // Apps Script akan balas 302 ke scriptusercontent.com
    const res1 = await fetch(APPS_SCRIPT_URL, {
      method:   'POST',
      headers,
      body,
      redirect: 'manual',
      signal:   ctrl.signal,
    })

    let text: string

    if (res1.status === 200) {
      // Langsung dapat response (tidak biasa tapi handle saja)
      text = await res1.text()
    } else if (res1.status === 302 || res1.status === 301 || res1.status === 307 || res1.status === 308) {
      // Dapat redirect — ambil Location lalu POST lagi ke URL baru
      const location = res1.headers.get('location')
      if (!location) {
        clearTimeout(timer)
        return { success: false, error: 'Redirect tanpa Location header' }
      }
      // POST ke scriptusercontent URL (ini yang benar-benar diproses Apps Script)
      const res2 = await fetch(location, {
        method:   'POST',
        headers,
        body,
        redirect: 'follow',
        signal:   ctrl.signal,
      })
      text = await res2.text()
    } else {
      text = await res1.text()
    }

    clearTimeout(timer)
    const trimmed = text.trim()
    if (!trimmed.startsWith('{')) {
      return { success: false, raw: trimmed.slice(0, 200) }
    }
    return JSON.parse(trimmed)
  } catch (e) {
    clearTimeout(timer)
    return { success: false, error: String(e) }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: EmailPayload = await req.json()
    const emailPayload = buildEmailPayload(body.type, body.ticket)
    const data = await callGAS(emailPayload as unknown as Record<string, unknown>)
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
