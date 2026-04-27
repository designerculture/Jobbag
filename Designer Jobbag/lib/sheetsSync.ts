'use client'

import { Ticket } from '@/lib/store'

// Semua request ke Apps Script harus melalui Next.js API route (server-side)
// karena browser memblokir POST langsung ke script.google.com akibat CORS policy

// ── SUBMIT: kirim tiket baru ke Sheets ──────────────────────────────────────
export async function submitToSheets(ticket: Ticket): Promise<boolean> {
  try {
    const payload = buildSubmitPayload(ticket)

    const res = await fetch('/api/sheets', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

// ── UPDATE: update field tiket di Sheets ────────────────────────────────────
export async function syncTicketToSheets(
  ticketNumber: string,
  updates: Partial<Pick<Ticket,
    | 'status' | 'designerStatus' | 'feedback' | 'designerNotes'
    | 'assignedDesigner' | 'assignedDesigners'
    | 'deadline' | 'prepDate'
    | 'attachmentDriveUrl' | 'attachmentDriveUrl2' | 'attachmentDriveUrl3'
  >>
): Promise<void> {
  try {
    // Map nama field Ticket → nama field Apps Script v2
    const mapped: Record<string, unknown> = {}

    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) continue
      if (k === 'attachmentDriveUrl')  { mapped['file1DriveUrl'] = v; continue }
      if (k === 'attachmentDriveUrl2') { mapped['file2DriveUrl'] = v; continue }
      if (k === 'attachmentDriveUrl3') { mapped['file3DriveUrl'] = v; continue }
      if (k === 'assignedDesigners' && Array.isArray(v)) {
        mapped[k] = (v as string[]).join(', ')
        continue
      }
      mapped[k] = v
    }

    await fetch('/api/sheets', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ticketNumber, updates: mapped }),
    })
  } catch {
    // Non-blocking — jangan throw
  }
}

// ── BUILD PAYLOAD: hanya field teks, tanpa base64 ───────────────────────────
function buildSubmitPayload(t: Ticket): Record<string, unknown> {
  return {
    ticketNumber:     t.ticketNumber,
    submittedAt:      t.createdAt || new Date().toLocaleString('id-ID'),
    fullName:         t.fullName          || '',
    email:            t.email             || '',
    emailOptional1:   t.emailOptional1    || '',
    emailOptional2:   t.emailOptional2    || '',
    initials:         t.initials          || '',
    department:       t.department        || '',
    title:            t.title             || '',
    description:      t.description       || '',
    requestType:      t.requestType       || 'Design',
    category:         Array.isArray(t.categories) && t.categories.length > 0
                        ? t.categories.join(', ')
                        : (t.category     || ''),
    linkReference:    t.linkReference     || '',
    file1DriveUrl:    t.attachmentDriveUrl  || '',
    file2DriveUrl:    t.attachmentDriveUrl2 || '',
    file3DriveUrl:    t.attachmentDriveUrl3 || '',
    deadline:         t.deadline          || '',
    prepDate:         t.prepDate          || '',
    assignedDesigner: t.assignedDesigner  || '',
    assignedDesigners: Array.isArray(t.assignedDesigners)
                         ? t.assignedDesigners.join(', ')
                         : '',
    status:           t.status            || 'New',
    designerStatus:   t.designerStatus    || 'Not Review',
    feedback:         t.feedback          || '',
    designerNotes:    t.designerNotes     || '',
    // Tidak ada: attachmentData, attachmentData2, attachmentData3, id, timeline
  }
}
