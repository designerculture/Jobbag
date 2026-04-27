'use client'

import { useState } from 'react'
import {
  ticketStore, Ticket, STATUS_COLORS, DESIGNER_STATUS_COLORS, TicketStatus,
} from '@/lib/store'
import TicketDetailModal from '@/components/TicketDetailModal'
import ShareModal from '@/components/ShareModal'
import { LogOut, Layout, Eye, RefreshCw, ExternalLink, X, Save, Share2, Wifi, WifiOff } from 'lucide-react'
import { syncTicketToSheets } from '@/lib/sheetsSync'
import { useTickets } from '@/hooks/use-tickets'

interface Props {
  designerName: string
  onLogout: () => void
}

interface UpdateModal {
  ticket: Ticket
  designerNotes: string
  status: TicketStatus
}

export default function DesignerDashboard({ designerName, onLogout }: Props) {
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null)
  const [updateModal, setUpdateModal] = useState<UpdateModal | null>(null)
  const [shareTicket, setShareTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)

  const { tickets, loading: syncLoading, syncState, error: syncError, refresh: reload, lastSynced } = useTickets({
    designerFilter: designerName,
    pollInterval: 30_000,
  })

  const handleUpdate = async () => {
    if (!updateModal) return
    setLoading(true)
    try {
      const isSubmittingForReview = updateModal.status === 'Review' && updateModal.ticket.status !== 'Review'
      const timelineEvent = isSubmittingForReview
        ? { action: 'Submitted for Review', timestamp: new Date().toISOString(), actor: designerName }
        : { action: `Status updated to ${updateModal.status}`, timestamp: new Date().toISOString(), actor: designerName }

      const updated = ticketStore.update(
        updateModal.ticket.id,
        {
          designerNotes: updateModal.designerNotes,
          status: updateModal.status,
          designerStatus: updateModal.status === 'Review' ? 'Review' : updateModal.ticket.designerStatus,
        },
        timelineEvent
      )

      if (updated) {
        syncTicketToSheets(updateModal.ticket.ticketNumber, {
          status:        updateModal.status,
          designerStatus: updateModal.status === 'Review' ? 'Review' : updateModal.ticket.designerStatus,
          designerNotes: updateModal.designerNotes,
        })
        if (isSubmittingForReview) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'review',
              ticket: {
                ticketNumber:       updated.ticketNumber,
                fullName:           updated.fullName,
                email:              updated.email,
                emailOptional1:     updated.emailOptional1,
                emailOptional2:     updated.emailOptional2,
                department:         updated.department,
                title:              updated.title,
                description:        updated.description,
                requestType:        updated.requestType,
                category:           updated.category,
                linkReference:      updated.linkReference,
                attachmentName:     updated.attachmentName,
                attachmentName2:    updated.attachmentName2,
                attachmentName3:    updated.attachmentName3,
                attachmentDriveUrl:  updated.attachmentDriveUrl,
                attachmentDriveUrl2: updated.attachmentDriveUrl2,
                attachmentDriveUrl3: updated.attachmentDriveUrl3,
                deadline:           updated.deadline,
                prepDate:           updated.prepDate,
                assignedDesigner:   updated.assignedDesigner,
                assignedDesigners:  updated.assignedDesigners,
                designerNotes:      updated.designerNotes,
                feedback:           updated.feedback,
              }
            })
          }).catch(() => {})
        }
      }
      reload()
      setUpdateModal(null)
    } finally {
      setLoading(false)
    }
  }

  const DESIGNER_TICKET_STATUSES: TicketStatus[] = ['New', 'In Progress', 'Pending', 'Review', 'Done']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-[#0055A9] shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 h-14">
            <Layout className="w-5 h-5 text-white flex-shrink-0" />
            <span className="text-white font-bold text-sm">Designer Jobbag System</span>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                  {designerName.charAt(0)}
                </div>
                <span className="text-white text-xs">{designerName}</span>
              </div>
              <button onClick={onLogout} className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Design Task Manager</h1>
            <p className="text-gray-500 text-sm mt-1">Jobbag yang di-assign ke {designerName}</p>
          </div>
          <div className="flex items-center gap-3">
            {syncState === 'synced' && lastSynced && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-green-600">
                <Wifi className="w-3 h-3" />
                Sync {lastSynced.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {(syncState === 'error' || syncState === 'needs-deploy') && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-orange-500">
                <WifiOff className="w-3 h-3" /> Data lokal
              </span>
            )}
            <button onClick={reload} className="text-gray-400 hover:text-[#0055A9] transition-colors flex items-center gap-1.5 text-sm">
              <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:block">Refresh</span>
            </button>
          </div>
        </div>

        {/* Kanban Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {(
            [
              { status: 'New' as TicketStatus,         bg: 'bg-[#0055A9]',   label: 'New',         icon: '📥' },
              { status: 'In Progress' as TicketStatus, bg: 'bg-yellow-500',  label: 'In Progress', icon: '⚙️' },
              { status: 'Pending' as TicketStatus,     bg: 'bg-orange-500',  label: 'Pending',     icon: '⏸️' },
              { status: 'Review' as TicketStatus,      bg: 'bg-purple-600',  label: 'Review',      icon: '🔍' },
              { status: 'Done' as TicketStatus,        bg: 'bg-green-500',   label: 'Done',        icon: '✅' },
            ]
          ).map(({ status, bg, label }) => {
            const count = tickets.filter(t => t.status === status).length
            return (
              <div key={status} className={`${bg} rounded-2xl px-5 py-4 text-white shadow-md flex flex-col gap-1`}>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-extrabold leading-none">{count}</p>
                <p className="text-white/50 text-xs">tiket</p>
              </div>
            )
          })}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Ticket ID</th>
                  <th className="px-4 py-3 text-left font-medium">Judul</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Requester</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Kategori</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Deadline</th>
                  <th className="px-4 py-3 text-left font-medium">Status Ticket</th>
                  <th className="px-4 py-3 text-left font-medium">Status Designer</th>
                  <th className="px-4 py-3 text-left font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="text-gray-300 mb-2">
                        <Layout className="w-10 h-10 mx-auto" />
                      </div>
                      <p className="text-gray-400 text-sm">Belum ada jobbag yang di-assign</p>
                    </td>
                  </tr>
                ) : (
                  tickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => setDetailTicket(ticket)} className="text-[#0055A9] font-mono text-xs font-bold hover:underline">
                          {ticket.ticketNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700 text-xs font-medium max-w-[120px] truncate">{ticket.title}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-gray-600 text-xs">{ticket.fullName}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{ticket.category}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-gray-600 text-xs">{ticket.deadline}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DESIGNER_STATUS_COLORS[ticket.designerStatus]}`}>
                          {ticket.designerStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailTicket(ticket)}
                            title="View Detail"
                            className="p-1.5 text-gray-400 hover:text-[#0055A9] hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {/* Tombol Update selalu tampil agar Designer Notes bisa diedit kapanpun */}
                          <button
                            onClick={() => setUpdateModal({
                              ticket,
                              designerNotes: ticket.designerNotes || '',
                              status: ticket.status,
                            })}
                            title="Update Ticket / Edit Notes"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          {ticket.designerStatus === 'Approved By Manager' && (
                            <button
                              onClick={() => setShareTicket(ticket)}
                              title="Share Hasil"
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailTicket && (
        <TicketDetailModal
          ticket={detailTicket}
          onClose={() => setDetailTicket(null)}
        />
      )}

      {/* Update Ticket Modal */}
      {updateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#0055A9] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm">Update Ticket</h3>
                <p className="text-blue-200 text-xs mt-0.5">{updateModal.ticket.ticketNumber} &mdash; {updateModal.ticket.title}</p>
              </div>
              <button onClick={() => setUpdateModal(null)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Readonly: Designer Status */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Status Designer (Read Only)</label>
                <div className={`px-3 py-2.5 rounded-xl text-sm font-medium ${DESIGNER_STATUS_COLORS[updateModal.ticket.designerStatus]} border border-transparent`}>
                  {updateModal.ticket.designerStatus}
                </div>
              </div>

              {/* Editable: Status Ticket */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Status Ticket <span className="text-red-400">*</span></label>
                <select
                  value={updateModal.status}
                  onChange={e => setUpdateModal(prev => prev ? { ...prev, status: e.target.value as TicketStatus } : null)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30"
                >
                  {DESIGNER_TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {updateModal.status === 'Review' && (
                  <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 px-3 py-1.5 rounded-lg">
                    Mengubah ke "Review" akan mengirim notifikasi ke Dispatcher untuk review.
                  </p>
                )}
              </div>

              {/* Editable: Designer Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Designer Notes</label>
                <textarea
                  value={updateModal.designerNotes}
                  onChange={e => setUpdateModal(prev => prev ? { ...prev, designerNotes: e.target.value } : null)}
                  placeholder="Masukkan link hasil pekerjaan atau catatan untuk manager..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30"
                />
                {updateModal.designerNotes && updateModal.designerNotes.startsWith('http') && (
                  <a href={updateModal.designerNotes} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#0055A9] mt-1 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Preview Link
                  </a>
                )}
              </div>

              {/* Readonly: Feedback Manager — selalu tampil */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Feedback Manager <span className="text-gray-300">(View Only)</span></label>
                <div className={`px-3 py-2.5 rounded-xl text-sm border ${updateModal.ticket.feedback ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400 italic'}`}>
                  {updateModal.ticket.feedback || 'Belum ada feedback dari manager'}
                </div>
              </div>

              <button
                onClick={handleUpdate}
                disabled={loading}
                className="w-full py-3 bg-[#0055A9] text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-[#003070] transition-colors"
              >
                {loading ? 'Menyimpan...' : 'Update Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareTicket && (
        <ShareModal
          ticket={shareTicket}
          onClose={() => setShareTicket(null)}
          onShared={() => {
            ticketStore.update(
              shareTicket.id,
              { status: 'Done' },
              { action: 'Result Shared to Requester', timestamp: new Date().toISOString(), actor: designerName }
            )
            reload()
          }}
        />
      )}
    </div>
  )
}
