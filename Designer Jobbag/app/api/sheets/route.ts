import { NextRequest, NextResponse } from 'next/server'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzEjYFVxJ7re-EkCYjDjSJaL2baj-qeOQZPe7udqyiYMHZnTzOuvaaRiNx7GvUSsz3s_w/exec'

export const dynamic = 'force-dynamic'

async function callGAS(body: Record<string, unknown>) {
  const ctrl    = new AbortController()
  const timer   = setTimeout(() => ctrl.abort(), 35_000)
  const reqBody = JSON.stringify(body)
  const headers = {
    'Content-Type': 'application/json',
    'Accept':       'application/json, text/plain, */*',
    'User-Agent':   'Mozilla/5.0',
  }

  try {
    // Step 1: POST dengan redirect:manual — Apps Script balas 302
    const res1 = await fetch(GAS_URL, {
      method: 'POST', headers, body: reqBody,
      redirect: 'manual', signal: ctrl.signal,
    })

    let text: string
    if (res1.status === 200) {
      text = await res1.text()
    } else if ([301, 302, 307, 308].includes(res1.status)) {
      // Step 2: POST ke URL redirect (scriptusercontent.com)
      const loc = res1.headers.get('location')
      if (!loc) { clearTimeout(timer); return { success: false, error: 'No redirect location' } }
      const res2 = await fetch(loc, {
        method: 'POST', headers, body: reqBody,
        redirect: 'follow', signal: ctrl.signal,
      })
      text = await res2.text()
    } else {
      text = await res1.text()
    }

    clearTimeout(timer)
    const t = text.trim()
    if (!t.startsWith('{')) return { success: false, error: 'Non-JSON: ' + t.slice(0, 150) }
    return JSON.parse(t) as Record<string, unknown>
  } catch (e) {
    clearTimeout(timer)
    return { success: false, error: String(e) }
  }
}

// POST — submit tiket baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = await callGAS({
      action:            'submitTicket',
      ticketNumber:      body.ticketNumber      || '',
      submittedAt:       body.submittedAt       || new Date().toLocaleString('id-ID'),
      fullName:          body.fullName          || '',
      email:             body.email             || '',
      emailOptional1:    body.emailOptional1    || '',
      emailOptional2:    body.emailOptional2    || '',
      initials:          body.initials          || '',
      department:        body.department        || '',
      title:             body.title             || '',
      description:       body.description       || '',
      requestType:       body.requestType       || 'Design',
      category:          body.category          || '',
      linkReference:     body.linkReference     || '',
      file1DriveUrl:     body.file1DriveUrl     || '',
      file2DriveUrl:     body.file2DriveUrl     || '',
      file3DriveUrl:     body.file3DriveUrl     || '',
      deadline:          body.deadline          || '',
      prepDate:          body.prepDate          || '',
      assignedDesigner:  body.assignedDesigner  || '',
      assignedDesigners: body.assignedDesigners || '',
      status:            body.status            || 'New',
      designerStatus:    body.designerStatus    || 'Not Review',
      feedback:          body.feedback          || '',
      designerNotes:     body.designerNotes     || '',
    })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

// PATCH — update field tiket yang sudah ada
export async function PATCH(req: NextRequest) {
  try {
    const { ticketNumber, updates } = await req.json()
    const data = await callGAS({ action: 'updateTicket', ticketNumber, ...updates })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

// DELETE — hapus tiket dari Sheets
export async function DELETE(req: NextRequest) {
  try {
    const { ticketNumber } = await req.json()
    const data = await callGAS({ action: 'deleteTicket', ticketNumber })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
