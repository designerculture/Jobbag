import { NextResponse } from 'next/server'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzEjYFVxJ7re-EkCYjDjSJaL2baj-qeOQZPe7udqyiYMHZnTzOuvaaRiNx7GvUSsz3s_w/exec'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp:  new Date().toISOString(),
    gas_url:    GAS_URL,
  }

  // Test 1: GET getTickets (manual redirect)
  try {
    const ctrl  = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20_000)

    const res1 = await fetch(`${GAS_URL}?action=getTickets&_=${Date.now()}`, {
      signal:   ctrl.signal,
      redirect: 'manual',
      cache:    'no-store',
      headers:  { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    })

    result.get_status1      = res1.status
    result.get_location     = res1.headers.get('location')

    let text = ''
    if (res1.status === 200) {
      text = await res1.text()
    } else if (res1.status === 302 || res1.status === 301) {
      const loc = res1.headers.get('location') || ''
      const res2 = await fetch(loc, { redirect: 'follow', cache: 'no-store', signal: ctrl.signal })
      result.get_status2 = res2.status
      text = await res2.text()
    } else {
      text = await res1.text()
    }

    clearTimeout(timer)

    result.get_body_preview = text.slice(0, 500)
    result.get_is_json      = text.trim().startsWith('{')

    if (text.startsWith('{')) {
      try {
        result.get_parsed = JSON.parse(text)
      } catch {
        result.get_parse_error = 'JSON.parse gagal'
      }
    }
  } catch (e) {
    result.get_error = String(e)
  }

  // Test 2: POST submitTicket (test ticket)
  try {
    const ctrl  = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20_000)
    const res   = await fetch(GAS_URL, {
      method:   'POST',
      headers:  { 'Content-Type': 'application/json' },
      body:     JSON.stringify({
        action:       'submitTicket',
        ticketNumber: 'TEST_CONN_' + Date.now(),
        fullName:     'Test Connection',
        email:        'test@test.com',
        title:        'Test Koneksi - Hapus',
        description:  'Test koneksi otomatis - boleh dihapus',
        requestType:  'Design',
        category:     'Test',
        status:       'New',
        designerStatus: 'Not Review',
      }),
      redirect: 'follow',
      signal:   ctrl.signal,
    })
    clearTimeout(timer)

    const text = await res.text()
    result.post_status       = res.status
    result.post_final_url    = res.url
    result.post_body_preview = text.slice(0, 500)
    result.post_is_json      = text.startsWith('{')

    if (text.startsWith('{')) {
      try {
        result.post_parsed = JSON.parse(text)
      } catch {
        result.post_parse_error = 'JSON.parse gagal'
      }
    }
  } catch (e) {
    result.post_error = String(e)
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
