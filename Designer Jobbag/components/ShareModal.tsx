'use client'

import { useState } from 'react'
import { Ticket } from '@/lib/store'
import { syncTicketToSheets } from '@/lib/sheetsSync'
import { X, Send, ExternalLink, CheckCircle } from 'lucide-react'

interface Props {
  ticket: Ticket
  onClose: () => void
  onShared: () => void
}

export default function ShareModal({ ticket, onClose, onShared }: Props) {
  const [extraEmail1, setExtraEmail1] = useState(ticket.email)
  const [extraEmail2, setExtraEmail2] = useState(ticket.emailOptional1 || '')
  const [extraEmail3, setExtraEmail3] = useState(ticket.emailOptional2 || '')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleShare = async () => {
    setLoading(true)
    try {
      // Kirim email notifikasi shared
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'shared',
          ticket: {
            ticketNumber:        ticket.ticketNumber,
            fullName:            ticket.fullName,
            email:               extraEmail1,
            emailOptional1:      extraEmail2 || undefined,
            emailOptional2:      extraEmail3 || undefined,
            department:          ticket.department,
            title:               ticket.title,
            description:         ticket.description,
            category:            ticket.category,
            linkReference:       ticket.linkReference,
            requestType:         ticket.requestType,
            attachmentName:      ticket.attachmentName,
            attachmentName2:     ticket.attachmentName2,
            attachmentName3:     ticket.attachmentName3,
            attachmentDriveUrl:  ticket.attachmentDriveUrl,
            attachmentDriveUrl2: ticket.attachmentDriveUrl2,
            attachmentDriveUrl3: ticket.attachmentDriveUrl3,
            deadline:            ticket.deadline,
            prepDate:            ticket.prepDate,
            designerNotes:       ticket.designerNotes,
            feedback:            ticket.feedback,
            assignedDesigner:    ticket.assignedDesigner,
            assignedDesigners:   ticket.assignedDesigners,
          }
        })
      })
      // Sync status 'Done' ke Sheets → Apps Script akan set timestampShared (kolom AC)
      syncTicketToSheets(ticket.ticketNumber, { status: 'Done' }).catch(() => {})
      setSent(true)
      setTimeout(() => {
        onShared()
        onClose()
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#0055A9] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-sm">Share Hasil Jobbag</h3>
            <p className="text-blue-200 text-xs mt-0.5">{ticket.ticketNumber}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {sent ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-800 font-semibold">Berhasil Dikirim!</p>
              <p className="text-gray-400 text-sm mt-1">Hasil jobbag sudah dikirimkan ke penerima.</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">View Summary</h4>
                <div className="space-y-1">
                  <div className="flex gap-2 text-xs">
                    <span className="text-gray-400 w-28 flex-shrink-0">Judul</span>
                    <span className="text-gray-700 font-medium">{ticket.title}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-gray-400 w-28 flex-shrink-0">Kategori</span>
                    <span className="text-gray-700">{ticket.category}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-gray-400 w-28 flex-shrink-0">Deadline</span>
                    <span className="text-gray-700">{ticket.deadline}</span>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-purple-500 mb-1">Designer Notes</p>
                {ticket.designerNotes ? (
                  ticket.designerNotes.startsWith('http') ? (
                    <a href={ticket.designerNotes} target="_blank" rel="noopener noreferrer"
                      className="text-purple-600 text-xs flex items-center gap-1 hover:underline truncate">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {ticket.designerNotes}
                    </a>
                  ) : (
                    <p className="text-purple-700 text-xs">{ticket.designerNotes}</p>
                  )
                ) : (
                  <p className="text-purple-400 text-xs italic">Belum ada catatan dari designer</p>
                )}
              </div>

              {ticket.feedback && (
                <div className="bg-green-50 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-green-600 mb-1">Feedback Manager</p>
                  <p className="text-green-700 text-xs">{ticket.feedback}</p>
                </div>
              )}

              {/* Email Recipients */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Kirim Ke (maks 3 email)</h4>
                <div className="space-y-2">
                  <input
                    type="email"
                    value={extraEmail1}
                    onChange={e => setExtraEmail1(e.target.value)}
                    placeholder="Email 1"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/20"
                  />
                  <input
                    type="email"
                    value={extraEmail2}
                    onChange={e => setExtraEmail2(e.target.value)}
                    placeholder="Email 2 (opsional)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/20"
                  />
                  <input
                    type="email"
                    value={extraEmail3}
                    onChange={e => setExtraEmail3(e.target.value)}
                    placeholder="Email 3 (opsional)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/20"
                  />
                </div>
              </div>

              <button
                onClick={handleShare}
                disabled={loading || !extraEmail1}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#0055A9] text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#003070] transition-colors"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Mengirim...' : 'Share Hasil Jobbag'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
