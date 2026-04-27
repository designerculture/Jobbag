'use client'

import { useState } from 'react'
import { AppView } from '@/app/page'
import { ticketStore, Ticket, STATUS_COLORS, DESIGNER_STATUS_COLORS } from '@/lib/store'
import { FileText, Layout, Settings, Search, X, Clock, Tag, User, Calendar } from 'lucide-react'

interface Props {
  onNavigate: (view: AppView) => void
}

// Parse timestamp dari berbagai format (ISO & dd/MM/yyyy HH:mm:ss dari Apps Script)
function parseTimestamp(ts: string): string {
  if (!ts || ts.trim() === '') return '-'
  if (ts.includes('T') || ts.includes('-')) {
    const d = new Date(ts)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
    }
  }
  const match = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (match) {
    const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5]))
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
    }
  }
  return ts
}

function TicketSearchWidget() {
  const [open,      setOpen]      = useState(false)
  const [query,     setQuery]     = useState('')
  const [result,    setResult]    = useState<Ticket | null | 'not-found'>()
  const [searching, setSearching] = useState(false)

  const handleSearch = async () => {
    const trimmed = query.trim().toUpperCase()
    if (!trimmed) return
    setSearching(true)
    setResult(undefined)
    try {
      // Cek localStorage dulu (cepat)
      const local = ticketStore.getAll().find(t => t.ticketNumber.toUpperCase() === trimmed)
      if (local) { setResult(local); return }

      // Jika tidak ada di lokal, fetch dari Sheets (real-time)
      const res = await fetch(`/api/tickets?t=${Date.now()}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.tickets)) {
          const found = (data.tickets as Ticket[]).find(
            t => (t.ticketNumber || '').toUpperCase() === trimmed
          )
          if (found) {
            // Simpan ke lokal agar tersinkron
            ticketStore.upsert({ ...found, id: found.ticketNumber })
            setResult(found)
            return
          }
        }
      }
      setResult('not-found')
    } catch {
      // Jika fetch gagal, coba hanya lokal
      const local = ticketStore.getAll().find(t => t.ticketNumber.toUpperCase() === trimmed)
      setResult(local ?? 'not-found')
    } finally {
      setSearching(false)
    }
  }

  const reset = () => { setQuery(''); setResult(undefined) }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => { setOpen(true); reset() }}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-white text-[#0055A9] rounded-full shadow-2xl px-4 py-3 font-semibold text-sm hover:bg-blue-50 transition-all duration-200 hover:shadow-blue-900/30 border border-white/80"
        title="Cek Status Tiket"
      >
        <Search className="w-4 h-4" />
        <span>Cek Status Tiket</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#0055A9] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-white" />
                <h3 className="text-white font-bold text-sm">Cek Status Jobbag</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-5 py-5">
              <p className="text-gray-500 text-xs mb-4">Masukkan nomor tiket untuk melihat progress jobbag Anda.</p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value.toUpperCase()); setResult(undefined) }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Contoh: DSG_AB1234"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30 font-mono"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2.5 bg-[#0055A9] text-white rounded-xl text-sm font-semibold hover:bg-[#003070] transition-colors disabled:opacity-60"
                >
                  {searching ? 'Mencari...' : 'Cari'}
                </button>
              </div>

              {/* Result */}
              {result === 'not-found' && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm text-center">
                  Nomor tiket tidak ditemukan. Pastikan format benar (DSG_XXXXXX).
                </div>
              )}

              {result && result !== 'not-found' && (
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                    <p className="font-mono font-bold text-[#0055A9] text-sm">{result.ticketNumber}</p>
                    <p className="text-gray-700 font-semibold text-sm mt-0.5 text-balance">{result.title}</p>
                  </div>

                  <div className="px-4 py-3 space-y-3">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[result.status]}`}>
                        {result.status}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${DESIGNER_STATUS_COLORS[result.designerStatus]}`}>
                        {result.designerStatus}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{result.fullName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{result.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Deadline: {result.deadline}</span>
                      </div>
                      {result.assignedDesigner && (
                        <div className="flex items-center gap-1.5">
                          <Layout className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate">{result.assignedDesigner}</span>
                        </div>
                      )}
                    </div>

                    {/* Mini Timeline */}
                    {result.timeline && result.timeline.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Progress</p>
                        <div className="flex flex-col gap-1.5">
                          {result.timeline.map((ev, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${i === result.timeline!.length - 1 ? 'bg-[#0055A9]' : 'bg-gray-300'}`} />
                              <div className="min-w-0">
                                <p className="text-xs text-gray-700 font-medium">{ev.action}</p>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {parseTimestamp(ev.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function HomePage({ onNavigate }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0055A9 0%, #003070 100%)' }}
    >
      {/* Logo / Brand */}
      <div className="mb-2 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
          <Layout className="w-6 h-6 text-white" />
        </div>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-white text-center text-balance mb-3 tracking-tight">
        Designer Jobbag System
      </h1>
      <p className="text-blue-200 text-sm md:text-base mb-10 text-center">
        Pilih role untuk melanjutkan
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
        {/* Submit Jobbag */}
        <button
          onClick={() => onNavigate('user-submit')}
          className="flex-1 group flex flex-col items-center gap-3 bg-white rounded-2xl px-6 py-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-white/80"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <FileText className="w-6 h-6 text-[#0055A9]" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-[#0055A9] text-sm">Submit Jobbag</p>
            <p className="text-gray-400 text-xs mt-1">User</p>
          </div>
        </button>

        {/* Designer */}
        <button
          onClick={() => onNavigate('designer-login')}
          className="flex-1 group flex flex-col items-center gap-3 bg-white/10 rounded-2xl px-6 py-6 shadow-lg hover:bg-white/20 transition-all duration-200 hover:-translate-y-1 border border-white/20"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-semibold text-white text-sm">Login As Designer</p>
            <p className="text-blue-200 text-xs mt-1">Tim Designer</p>
          </div>
        </button>

        {/* Dispatcher */}
        <button
          onClick={() => onNavigate('dispatcher-login')}
          className="flex-1 group flex flex-col items-center gap-3 bg-white/10 rounded-2xl px-6 py-6 shadow-lg hover:bg-white/20 transition-all duration-200 hover:-translate-y-1 border border-white/20"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white text-sm">Login As Dispatcher</p>
            <p className="text-blue-200 text-xs mt-1">Admin / Manager</p>
          </div>
        </button>
      </div>

      <p className="mt-12 text-blue-300/60 text-xs">
        Designer Jobbag System &mdash; Asuransi Astra
      </p>

      <TicketSearchWidget />
    </div>
  )
}
