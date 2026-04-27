'use client'

import { Ticket, STATUS_COLORS, DESIGNER_STATUS_COLORS, REQUEST_TYPE_COLORS } from '@/lib/store'
import { X, ExternalLink, Paperclip, Calendar, Tag, User, Mail, Clock } from 'lucide-react'

// Parse timestamp dari berbagai format:
// - ISO: "2026-04-15T09:30:00.000Z"
// - Indonesian: "15/04/2026 09:30:00"
// - Fallback ke string asli jika tidak dikenali
function parseTimestamp(ts: string): string {
  if (!ts || ts.trim() === '') return ''

  // Format ISO — langsung parse
  if (ts.includes('T') || ts.includes('-')) {
    const d = new Date(ts)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    }
  }

  // Format dd/MM/yyyy HH:mm:ss (dari Apps Script)
  const match = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (match) {
    const [, dd, mm, yyyy, hh, min] = match
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min)
    )
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    }
  }

  // Kembalikan string asli jika semua parse gagal
  return ts
}

// Hitung durasi pengerjaan: dari timestampSubmit sampai timestampShared/Done
function calcDuration(start: string, end: string): string {
  const parseToDate = (ts: string): Date | null => {
    if (!ts) return null
    if (ts.includes('T') || ts.includes('-')) {
      const d = new Date(ts)
      return isNaN(d.getTime()) ? null : d
    }
    const m = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/)
    if (m) {
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]))
      return isNaN(d.getTime()) ? null : d
    }
    return null
  }
  const s = parseToDate(start)
  const e = parseToDate(end)
  if (!s || !e) return ''
  const diff = Math.max(0, e.getTime() - s.getTime())
  const totalSec = Math.floor(diff / 1000)
  const days     = Math.floor(totalSec / 86400)
  const hours    = Math.floor((totalSec % 86400) / 3600)
  const mins     = Math.floor((totalSec % 3600) / 60)
  const parts = []
  if (days  > 0) parts.push(`${days}h`)
  if (hours > 0) parts.push(`${hours}j`)
  if (mins  > 0) parts.push(`${mins}m`)
  return parts.length > 0 ? parts.join(' ') : '< 1 menit'
}

// Renders text with clickable URLs
function ClickableText({ text, className }: { text: string; className?: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return (
    <p className={className}>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 break-all inline-flex items-center gap-0.5">
            {part}<ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        ) : part
      )}
    </p>
  )
}

interface Props {
  ticket: Ticket
  onClose: () => void
}

export default function TicketDetailModal({ ticket, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0055A9] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <p className="text-blue-200 text-xs mb-0.5">Detail Tiket</p>
            <h2 className="text-white font-bold text-base">{ticket.ticketNumber}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {ticket.requestType && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${REQUEST_TYPE_COLORS[ticket.requestType] || 'bg-gray-100 text-gray-700'}`}>
                {ticket.requestType}
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[ticket.status]}`}>
              {ticket.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${DESIGNER_STATUS_COLORS[ticket.designerStatus]}`}>
              Designer: {ticket.designerStatus}
            </span>
            {/* Single designer */}
            {ticket.assignedDesigner && !(ticket.assignedDesigners?.length) && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {ticket.assignedDesigner}
              </span>
            )}
            {/* Multi-designer */}
            {ticket.assignedDesigners && ticket.assignedDesigners.length > 0 && ticket.assignedDesigners.map(d => (
              <span key={d} className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {d}
              </span>
            ))}
          </div>

          {/* Title */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 text-balance">{ticket.title}</h3>
            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
              <Tag className="w-3 h-3 inline mr-1" />{ticket.category}
            </span>
          </div>

          {/* Grid Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                <User className="w-3 h-3" /> Requester
              </div>
              <p className="text-gray-800 font-semibold text-sm">{ticket.fullName}</p>
              <p className="text-gray-400 text-xs">{ticket.initials} &bull; {ticket.department}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                {ticket.requestType === 'Multimedia' || ticket.requestType === 'Bundle Request' ? 'Event Date' : 'Design Deadline'}
              </div>
              <p className="text-gray-800 font-semibold text-sm">{ticket.deadline}</p>
              {ticket.prepDate && (
                <p className="text-gray-500 text-xs mt-1">Event Date 2: {ticket.prepDate}</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 col-span-2">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                <Mail className="w-3 h-3" /> Email
              </div>
              <p className="text-gray-800 text-sm">{ticket.email}</p>
              {ticket.emailOptional1 && <p className="text-gray-500 text-xs">{ticket.emailOptional1}</p>}
              {ticket.emailOptional2 && <p className="text-gray-500 text-xs">{ticket.emailOptional2}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deskripsi</p>
            <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 rounded-xl px-4 py-3">{ticket.description}</p>
          </div>

          {/* Files & Referensi */}
          {(() => {
            const hasLink  = !!ticket.linkReference
            const hasFile1 = !!ticket.attachmentDriveUrl
            const hasFile2 = !!ticket.attachmentDriveUrl2
            const hasFile3 = !!ticket.attachmentDriveUrl3
            // Folder Drive dibentuk dari ticketNumber — selalu ada jika ada file upload
            const hasLocalFile = !!(ticket.attachmentName || ticket.attachmentName2 || ticket.attachmentName3)
            // Folder URL generik — link ke root Drive folder jobbag
            const DRIVE_ROOT = 'https://drive.google.com/drive/folders/126lg-HSRV2K2r7VVs7MzTLpOWoEInszp'

            const showSection = hasLink || hasFile1 || hasFile2 || hasFile3 || hasLocalFile
            if (!showSection) return null

            const FileLink = ({
              url, name, label,
            }: { url?: string; name?: string; label: string }) => {
              if (!url && !name) return null
              if (url) {
                return (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm hover:bg-green-100 active:bg-green-200 transition-colors cursor-pointer select-none"
                  >
                    <Paperclip className="w-4 h-4 flex-shrink-0 text-green-600" />
                    <span className="truncate flex-1 font-medium">{name || label}</span>
                    <span className="flex items-center gap-1 text-xs text-green-600 flex-shrink-0 font-semibold">
                      Lihat File <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </a>
                )
              }
              // Nama file lokal saja — arahkan ke folder Drive root
              return (
                <a
                  href={DRIVE_ROOT}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm hover:bg-green-100 active:bg-green-200 transition-colors cursor-pointer select-none"
                >
                  <Paperclip className="w-4 h-4 flex-shrink-0 text-green-600" />
                  <span className="truncate flex-1 font-medium">{name}</span>
                  <span className="flex items-center gap-1 text-xs text-green-600 flex-shrink-0 font-semibold">
                    Lihat File <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </a>
              )
            }

            return (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">File &amp; Referensi</p>
                <div className="flex flex-col gap-2">
                  {/* Link Referensi */}
                  {hasLink && (
                    <a
                      href={ticket.linkReference}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-[#0055A9] text-sm hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate flex-1">{ticket.linkReference}</span>
                      <span className="text-xs font-semibold flex-shrink-0">Buka Link</span>
                    </a>
                  )}

                  {/* File 1, 2, 3 — URL per file dari Drive */}
                  <FileLink url={ticket.attachmentDriveUrl}  name={ticket.attachmentName}  label="File Upload 1" />
                  <FileLink url={ticket.attachmentDriveUrl2} name={ticket.attachmentName2} label="File Upload 2" />
                  <FileLink url={ticket.attachmentDriveUrl3} name={ticket.attachmentName3} label="File Upload 3" />

                  {/* Jika tidak ada URL per-file sama sekali tapi ada nama file lokal —
                      tampilkan tombol "Lihat Folder Drive" sebagai fallback */}
                  {!hasFile1 && !hasFile2 && !hasFile3 && hasLocalFile && (
                    <a
                      href={DRIVE_ROOT}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm hover:bg-green-100 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4 flex-shrink-0 text-green-600" />
                      <span className="flex-1 font-medium">Lihat File di Google Drive</span>
                      <span className="flex items-center gap-1 text-xs text-green-600 font-semibold flex-shrink-0">
                        Buka Folder <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </a>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Lihat Attachment — selalu tampil, mengarah ke folder Drive */}
          {(() => {
            const driveRoot   = 'https://drive.google.com/drive/folders/126lg-HSRV2K2r7VVs7MzTLpOWoEInszp'
            // Gunakan URL file pertama jika ada, fallback ke folder root
            const primaryUrl  = ticket.attachmentDriveUrl || ticket.attachmentDriveUrl2 || ticket.attachmentDriveUrl3 || driveRoot
            return (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Lihat Attachment</p>
                <a
                  href={primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-3 px-4 py-3 bg-[#0055A9]/5 border border-[#0055A9]/20 rounded-xl text-[#0055A9] text-sm hover:bg-[#0055A9]/10 active:bg-[#0055A9]/15 transition-colors cursor-pointer"
                >
                  <Paperclip className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 font-medium">
                    {ticket.attachmentDriveUrl || ticket.attachmentDriveUrl2 || ticket.attachmentDriveUrl3
                      ? (ticket.attachmentName || ticket.attachmentName2 || ticket.attachmentName3 || 'File Upload')
                      : 'Lihat Folder Google Drive'}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold flex-shrink-0">
                    Buka <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </a>
              </div>
            )
          })()}

          {/* Designer Notes */}
          {ticket.designerNotes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Designer Notes</p>
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                <ClickableText
                  text={ticket.designerNotes}
                  className="text-purple-700 text-sm leading-relaxed break-words"
                />
              </div>
            </div>
          )}

          {/* Feedback Manager */}
          {ticket.feedback && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Feedback Manager</p>
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                <ClickableText
                  text={ticket.feedback}
                  className="text-green-700 text-sm leading-relaxed break-words"
                />
              </div>
            </div>
          )}

          {/* Timeline */}
          {ticket.timeline && ticket.timeline.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timeline Pengerjaan</p>
                {(() => {
                  const first = ticket.timeline![0]
                  const last  = ticket.timeline![ticket.timeline!.length - 1]
                  const dur   = calcDuration(first.timestamp, last.timestamp)
                  return dur ? (
                    <p className="text-xs text-gray-500">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Durasi: <span className="font-semibold">{dur}</span>
                    </p>
                  ) : null
                })()}
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
                <div className="flex flex-col gap-3">
                  {ticket.timeline.map((event, idx) => {
                    const isLast = idx === ticket.timeline!.length - 1
                    // Durasi dari step sebelumnya ke step ini
                    const stepDur = idx > 0
                      ? calcDuration(ticket.timeline![idx - 1].timestamp, event.timestamp)
                      : null
                    return (
                      <div key={idx} className="flex items-start gap-3 pl-2">
                        <div className="relative flex-shrink-0 w-4 flex items-center justify-center mt-0.5">
                          <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                            isLast
                              ? 'bg-[#0055A9] border-[#0055A9]'
                              : 'bg-white border-gray-300'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Durasi dari step sebelumnya */}
                          {stepDur && (
                            <div className="flex items-center gap-1 mb-1 ml-1">
                              <div className="h-px flex-1 bg-gray-100" />
                              <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 flex-shrink-0">
                                {stepDur}
                              </span>
                              <div className="h-px flex-1 bg-gray-100" />
                            </div>
                          )}
                          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-gray-700 text-xs font-semibold">{event.action}</p>
                              {event.actor && (
                                <span className="text-gray-400 text-xs">{event.actor}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-300" />
                              <p className="text-gray-400 text-xs">{parseTimestamp(event.timestamp)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
