import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEjYFVxJ7re-EkCYjDjSJaL2baj-qeOQZPe7udqyiYMHZnTzOuvaaRiNx7GvUSsz3s_w/exec'

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileData, ticketNumber, requesterName, jobTitle } = await req.json()

    if (!fileData || !fileName) {
      return NextResponse.json({ success: true, skipped: true, driveUrl: null })
    }

    const payload = {
      action: 'uploadFile',
      fileName,
      fileData,
      ticketNumber,
      requesterName: requesterName || 'Unknown',
      jobTitle:      jobTitle      || '',
    }

    // Apps Script selalu redirect — gunakan GET dengan query params sebagai fallback
    // Kirim via POST dulu, jika gagal fallback ke GET
    let data: Record<string, string> = {}
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60_000) // 60 detik timeout
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const text = await res.text()
      try { data = JSON.parse(text) } catch { data = {} }
    } catch {
      // fetch error atau timeout — driveUrl tetap null
    }

    return NextResponse.json({
      success:   true,
      driveUrl:  data.driveUrl  || null,
      folderUrl: data.folderUrl || null,
      fileId:    data.fileId    || null,
    })
  } catch (error) {
    console.error('[Drive] Error:', error)
    return NextResponse.json({ success: false, error: String(error), driveUrl: null }, { status: 500 })
  }
}
