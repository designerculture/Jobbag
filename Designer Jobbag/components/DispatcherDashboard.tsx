'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ticketStore, type Ticket, DESIGNERS, STATUS_COLORS, DESIGNER_STATUS_COLORS, TicketStatus, REQUEST_TYPE_COLORS, RequestType,
} from '@/lib/store'
import TicketDetailModal from '@/components/TicketDetailModal'
import UserSubmitForm from '@/components/UserSubmitForm'
import { LogOut, Layout, BarChart2, PlusCircle, Trash2, RefreshCw, Eye, UserPlus, X, Check, Download, CalendarDays, Wifi, WifiOff, Pencil } from 'lucide-react'
import { syncTicketToSheets } from '@/lib/sheetsSync'
import { useTickets } from '@/hooks/use-tickets'

type Tab = 'assign' | 'monitoring' | 'submit'

interface Props {
  dispatcherName: string
  dispatcherRole?: 'dispatcher' | 'manager'
  onLogout: () => void
}

const TICKET_STATUSES: TicketStatus[]   = ['New', 'In Progress', 'Pending', 'Review', 'Done']
const DESIGNER_STATUSES                 = ['Not Review', 'Review', 'Approved By Manager'] as const
type DesignerStatusType = typeof DESIGNER_STATUSES[number]

interface EditModal {
  ticket:         Ticket
  title:          string
  status:         TicketStatus
  designerStatus: DesignerStatusType
  designerNotes:  string
  feedback:       string
}

export default function DispatcherDashboard({ dispatcherName, dispatcherRole = 'dispatcher', onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('assign')
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null)
  const [assignModal, setAssignModal] = useState<{ ticket: Ticket; designer: string; designers: string[] } | null>(null)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterDesigner, setFilterDesigner] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [feedbackModal, setFeedbackModal] = useState<{ ticket: Ticket; feedback: string; reviewStatus: 'Review' | 'Approved By Manager' } | null>(null)
  const [deadlineModal, setDeadlineModal] = useState<{ ticket: Ticket; deadline: string } | null>(null)
  const [editModal,     setEditModal]     = useState<EditModal | null>(null)
  const [editLoading,   setEditLoading]   = useState(false)
  const [currentPage,   setCurrentPage]   = useState(1)
  const PAGE_SIZE = 10

  const { tickets, loading: syncLoading, syncState, error: syncError, refresh: reload, lastSynced } = useTickets({ pollInterval: 30_000 })

  useEffect(() => { reload() }, [activeTab])

  const isAssigned = (t: Ticket) =>
    !!(t.assignedDesigner || (t.assignedDesigners && t.assignedDesigners.length > 0))
  const unassigned = tickets.filter(t => !isAssigned(t))

  const filtered = tickets.filter(t => {
    if (filterDesigner && t.assignedDesigner !== filterDesigner) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterMonth) {
      const d = new Date(t.deadline)
      const [fy, fm] = filterMonth.split('-')
      if (d.getFullYear() !== parseInt(fy) || (d.getMonth() + 1) !== parseInt(fm)) return false
    }
    return true
  })

  // Urutkan dari yang terbaru (ticketNumber descending) lalu paginate
  const sortedFiltered  = [...filtered].sort((a, b) => b.ticketNumber.localeCompare(a.ticketNumber))
  const totalPages      = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE))
  const safePage        = Math.min(currentPage, totalPages)
  const pagedTickets    = sortedFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const kanbanCounts = {
    New: tickets.filter(t => t.status === 'New').length,
    'In Progress': tickets.filter(t => t.status === 'In Progress').length,
    Pending: tickets.filter(t => t.status === 'Pending').length,
    Review: tickets.filter(t => t.status === 'Review').length,
    Done: tickets.filter(t => t.status === 'Done').length,
  }

  const handleAssign = async (ticket: Ticket, designer: string, designers: string[]) => {
    const isMulti = designers.length > 1
    const primaryDesigner = designers[0] || designer

    ticketStore.update(
      ticket.id,
      {
        assignedDesigner:  primaryDesigner,
        assignedDesigners: isMulti ? designers : undefined,
        status: 'In Progress',
      },
      {
        action: isMulti
          ? `Assigned to ${designers.join(', ')}`
          : `Assigned to ${primaryDesigner}`,
        timestamp: new Date().toISOString(),
        actor: dispatcherName,
      }
    )

    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'assigned',
        ticket: {
          ticketNumber:       ticket.ticketNumber,
          fullName:           ticket.fullName,
          email:              ticket.email,
          emailOptional1:     ticket.emailOptional1,
          emailOptional2:     ticket.emailOptional2,
          department:         ticket.department,
          title:              ticket.title,
          description:        ticket.description,
          requestType:        ticket.requestType,
          category:           ticket.category,
          linkReference:      ticket.linkReference,
          attachmentName:     ticket.attachmentName,
          attachmentName2:    ticket.attachmentName2,
          attachmentName3:    ticket.attachmentName3,
          attachmentDriveUrl:  ticket.attachmentDriveUrl,
          attachmentDriveUrl2: ticket.attachmentDriveUrl2,
          attachmentDriveUrl3: ticket.attachmentDriveUrl3,
          deadline:           ticket.deadline,
          prepDate:           ticket.prepDate,
          assignedDesigner:   primaryDesigner,
          assignedDesigners:  isMulti ? designers : undefined,
        }
      })
    }).catch(() => {})

    syncTicketToSheets(ticket.ticketNumber, {
      assignedDesigner: isMulti ? designers.join(', ') : primaryDesigner,
      status: 'In Progress',
    })
    reload()
    setAssignModal(null)
  }

  const handleDeadlineUpdate = () => {
    if (!deadlineModal) return
    ticketStore.update(
      deadlineModal.ticket.id,
      { deadline: deadlineModal.deadline },
      { action: `Deadline diubah ke ${deadlineModal.deadline}`, timestamp: new Date().toISOString(), actor: dispatcherName }
    )
    syncTicketToSheets(deadlineModal.ticket.ticketNumber, { deadline: deadlineModal.deadline })
    reload()
    setDeadlineModal(null)
  }

  const handleEditSave = async () => {
    if (!editModal) return
    setEditLoading(true)
    try {
      ticketStore.update(
        editModal.ticket.id,
        {
          title:          editModal.title,
          status:         editModal.status,
          designerStatus: editModal.designerStatus,
          designerNotes:  editModal.designerNotes,
          feedback:       editModal.feedback,
        },
        { action: `Admin edit: status=${editModal.status}, designerStatus=${editModal.designerStatus}`, timestamp: new Date().toISOString(), actor: dispatcherName }
      )
      await syncTicketToSheets(editModal.ticket.ticketNumber, {
        title:          editModal.title,
        status:         editModal.status,
        designerStatus: editModal.designerStatus,
        designerNotes:  editModal.designerNotes,
        feedback:       editModal.feedback,
      })
      reload()
      setEditModal(null)
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    const ticket = tickets.find(t => t.id === id)
    if (!ticket) return
    if (confirm(`Yakin hapus jobbag ${ticket.ticketNumber}?\n\nData akan dihapus dari aplikasi dan Google Sheets.`)) {
      // Hapus dari localStorage
      ticketStore.delete(id)
      // Hapus dari Google Sheets via API
      fetch('/api/sheets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketNumber: ticket.ticketNumber }),
      }).catch(() => {})
      reload()
    }
  }

  const handleApprove = async () => {
    if (!feedbackModal) return
    const isApproved = feedbackModal.reviewStatus === 'Approved By Manager'
    const updated = ticketStore.update(
      feedbackModal.ticket.id,
      {
        designerStatus: feedbackModal.reviewStatus,
        feedback: feedbackModal.feedback,
        status: isApproved ? 'Done' : 'Review',
      },
      {
        action: isApproved ? 'Approved By Manager' : 'Reviewed — Needs Revision',
        timestamp: new Date().toISOString(),
        actor: dispatcherName,
      }
    )
    if (updated) {
      syncTicketToSheets(feedbackModal.ticket.ticketNumber, {
        designerStatus: feedbackModal.reviewStatus,
        status: isApproved ? 'Done' : 'Review',
        feedback: feedbackModal.feedback,
      })
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isApproved ? 'approved' : 'review',
          ticket: {
            ticketNumber:        updated.ticketNumber,
            fullName:            updated.fullName,
            email:               updated.email,
            emailOptional1:      updated.emailOptional1,
            emailOptional2:      updated.emailOptional2,
            department:          updated.department,
            title:               updated.title,
            description:         updated.description,
            requestType:         updated.requestType,
            category:            updated.category,
            linkReference:       updated.linkReference,
            attachmentName:      updated.attachmentName,
            attachmentName2:     updated.attachmentName2,
            attachmentName3:     updated.attachmentName3,
            attachmentDriveUrl:  updated.attachmentDriveUrl,
            attachmentDriveUrl2: updated.attachmentDriveUrl2,
            attachmentDriveUrl3: updated.attachmentDriveUrl3,
            deadline:            updated.deadline,
            prepDate:            updated.prepDate,
            assignedDesigner:    updated.assignedDesigner,
            assignedDesigners:   updated.assignedDesigners,
            designerNotes:       updated.designerNotes,
            feedback:            feedbackModal.feedback,
          }
        })
      }).catch(() => {})
    }
    reload()
    setFeedbackModal(null)
  }

  const exportCSV = () => {
    const headers = [
      'Ticket ID', 'Tipe Request', 'Judul', 'Requester', 'Department', 'Email',
      'Kategori', 'Designer', 'Deadline', 'Status Ticket', 'Status Designer',
      'Waktu Submit', 'Waktu Assign', 'Waktu Review',
      'Waktu Design Approve By Manager', 'Waktu Hasil Design Di Share',
      'Durasi Submit→Assign', 'Durasi Assign→Review',
      'Durasi Review→Approved', 'Durasi Approved→Shared',
      'Total Durasi Pengerjaan',
    ]

    const getTimestamp = (t: Ticket, ...keywords: string[]): string => {
      for (const kw of keywords) {
        const ev = (t.timeline || []).find(e =>
          e.action.toLowerCase().includes(kw.toLowerCase())
        )
        if (ev) return ev.timestamp
      }
      return ''
    }

    // Parse timestamp dari format ISO maupun dd/MM/yyyy HH:mm:ss (Apps Script)
    const parseTs = (ts: string): Date | null => {
      if (!ts || ts.trim() === '') return null
      // Format ISO
      if (ts.includes('T') || (ts.includes('-') && !ts.match(/^\d{1,2}\/\d{1,2}\/\d{4}/))) {
        const d = new Date(ts)
        return isNaN(d.getTime()) ? null : d
      }
      // Format dd/MM/yyyy HH:mm:ss
      const m = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/)
      if (m) {
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), m[6] ? Number(m[6]) : 0)
        return isNaN(d.getTime()) ? null : d
      }
      return null
    }

    // Format timestamp → string yang terbaca
    const fmt = (ts: string): string => {
      if (!ts) return '-'
      const d = parseTs(ts)
      if (!d) return ts // kembalikan string asli jika gagal parse
      return d.toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    }

    // Format durasi antara dua timestamp → "X hari Y jam Z menit"
    const formatDuration = (a: string, b: string): string => {
      if (!a || !b) return '-'
      const da = parseTs(a)
      const db = parseTs(b)
      if (!da || !db) return '-'
      const ms = db.getTime() - da.getTime()
      if (ms < 0) return '-'
      const totalSec = Math.floor(ms / 1000)
      const days    = Math.floor(totalSec / 86400)
      const hours   = Math.floor((totalSec % 86400) / 3600)
      const minutes = Math.floor((totalSec % 3600) / 60)
      const parts: string[] = []
      if (days    > 0) parts.push(`${days} hari`)
      if (hours   > 0) parts.push(`${hours} jam`)
      if (minutes > 0) parts.push(`${minutes} menit`)
      if (parts.length === 0) parts.push('< 1 menit')
      return parts.join(' ')
    }

    const rows = filtered.map(t => {
      const tsSubmit   = getTimestamp(t, 'Submitted', 'submitted')
      const tsAssign   = getTimestamp(t, 'Assigned',  'assigned')
      const tsReview   = getTimestamp(t, 'Review',    'review')
      const tsApproved = getTimestamp(t, 'Approved',  'approved')
      const tsShared   = getTimestamp(t, 'Shared',    'shared')
      const designers  = t.assignedDesigners?.length
        ? t.assignedDesigners.join(', ')
        : (t.assignedDesigner || '-')
      const endTs = tsShared || tsApproved || tsReview || tsAssign

      return [
        t.ticketNumber,
        t.requestType || '-',
        t.title,
        t.fullName,
        t.department,
        t.email,
        t.category,
        designers,
        t.deadline,
        t.status,
        t.designerStatus,
        fmt(tsSubmit),
        fmt(tsAssign),
        fmt(tsReview),
        fmt(tsApproved),   // Waktu Design Approve By Manager
        fmt(tsShared),     // Waktu Hasil Design Di Share
        formatDuration(tsSubmit,   tsAssign),
        formatDuration(tsAssign,   tsReview),
        formatDuration(tsReview,   tsApproved),
        formatDuration(tsApproved, tsShared),
        formatDuration(tsSubmit,   endTs),  // Total Durasi
      ]
    })

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `jobbag_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'assign', label: 'Assign Request', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'monitoring', label: 'Monitoring', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'submit', label: 'Submit Jobbag', icon: <PlusCircle className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-[#0055A9] shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 h-14">
            <Layout className="w-5 h-5 text-white flex-shrink-0" />
            <span className="text-white font-bold text-sm hidden sm:block">Designer Jobbag System</span>
            <div className="flex-1 flex items-center justify-center gap-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === item.id
                      ? 'bg-white text-[#0055A9]'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="hidden md:block">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-white text-xs font-semibold leading-tight">{dispatcherName}</span>
                <span className="text-blue-200 text-xs leading-tight capitalize">{dispatcherRole}</span>
              </div>
              <button
                onClick={reload}
                disabled={syncState === 'syncing'}
                title={
                  syncState === 'error'    ? (syncError || 'Gagal sync — klik untuk coba lagi')
                  : syncState === 'syncing'  ? 'Sedang sync...'
                  : syncState === 'synced'   ? `Terakhir sync: ${lastSynced?.toLocaleTimeString('id-ID')} — klik untuk refresh`
                  : 'Klik untuk sync data'
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  syncState === 'error' || syncState === 'needs-deploy'
                    ? 'bg-red-500/30 text-red-200 hover:bg-red-500/50'
                    : syncState === 'syncing'
                      ? 'bg-white/10 text-blue-200 cursor-not-allowed'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {syncState === 'error' || syncState === 'needs-deploy'
                  ? <WifiOff className="w-3.5 h-3.5" />
                  : syncState === 'syncing'
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Wifi className="w-3.5 h-3.5" />
                }
                <span>
                  {syncState === 'syncing' ? 'Syncing...' : 'Sync Data'}
                </span>
              </button>
              <button onClick={onLogout} className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Banner: error sync */}
      {(syncState === 'error' || syncState === 'needs-deploy') && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="flex-1 text-red-700 text-xs">
              Gagal terhubung ke server. Menampilkan data lokal.
            </p>
            <button
              onClick={reload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Coba Sync
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ASSIGN TAB */}
        {activeTab === 'assign' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Assign Request</h1>
              <p className="text-gray-500 text-sm mt-1">Assign request kepada Designer</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800 text-sm">Jobbag Masuk Belum di Assign</h2>
                  <p className="text-gray-400 text-xs mt-0.5">{unassigned.length} jobbag menunggu</p>
                </div>
                <button onClick={reload} className="text-gray-400 hover:text-[#0055A9] transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left font-medium">Ticket ID</th>
                      <th className="px-4 py-3 text-left font-medium">Judul</th>
                      <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Tipe</th>
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Requester</th>
                      <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Kategori</th>
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Deadline</th>
                      <th className="px-4 py-3 text-left font-medium">Assign</th>
                      <th className="px-4 py-3 text-left font-medium">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {unassigned.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">Semua jobbag sudah di-assign</td></tr>
                    ) : (
                      unassigned.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setDetailTicket(ticket)}
                              className="text-[#0055A9] font-mono text-xs font-bold hover:underline"
                            >
                              {ticket.ticketNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-700 font-medium text-xs max-w-[150px] truncate">{ticket.title}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {ticket.requestType && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${REQUEST_TYPE_COLORS[ticket.requestType] || 'bg-gray-100 text-gray-600'}`}>
                                {ticket.requestType}
                              </span>
                            )}
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
                            <button
                              onClick={() => setAssignModal({ ticket, designer: '', designers: ticket.assignedDesigners || (ticket.assignedDesigner ? [ticket.assignedDesigner] : []) })}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#0055A9] text-white rounded-lg text-xs font-medium hover:bg-[#003070] transition-colors"
                            >
                              <UserPlus className="w-3 h-3" /> Assign
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setDetailTicket(ticket)}
                              className="text-gray-400 hover:text-[#0055A9] transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Designer Workload Board */}
            <div className="mt-8">
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-800">Workload Designer Saat Ini</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Gunakan panduan ini untuk memilih designer yang tepat saat assign jobbag baru.
                  <span className="ml-2 inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Kosong
                    <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block ml-1" /> Sedang
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-1" /> Penuh
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {DESIGNERS.map(designer => {
                  const inProgress = tickets.filter(t => t.assignedDesigner === designer && t.status === 'In Progress')
                  const pending    = tickets.filter(t => t.assignedDesigner === designer && t.status === 'Pending')
                  const review     = tickets.filter(t => t.assignedDesigner === designer && t.status === 'Review')
                  const activeLoad = inProgress.length + pending.length + review.length
                  const initials   = designer.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

                  const statusConfig =
                    activeLoad === 0
                      ? { border: 'border-green-200',  bg: 'bg-green-50',  dot: 'bg-green-500',  label: 'Kosong',  labelCls: 'text-green-700 bg-green-100' }
                      : activeLoad <= 2
                      ? { border: 'border-yellow-200', bg: 'bg-yellow-50', dot: 'bg-yellow-400', label: 'Sedang',  labelCls: 'text-yellow-700 bg-yellow-100' }
                      : { border: 'border-red-200',    bg: 'bg-red-50',    dot: 'bg-red-500',    label: 'Penuh',   labelCls: 'text-red-700 bg-red-100' }

                  return (
                    <div key={designer} className={`rounded-2xl border-2 ${statusConfig.border} ${statusConfig.bg} overflow-hidden transition-all`}>
                      {/* Header */}
                      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#0055A9] flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-gray-800 text-sm font-bold truncate">{designer.split(' ')[0]}</p>
                            <p className="text-gray-400 text-xs truncate">{designer}</p>
                          </div>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${statusConfig.labelCls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                          {statusConfig.label}
                        </span>
                      </div>
                      {/* Divider */}
                      <div className="mx-4 border-t border-black/5 mb-3" />
                      {/* Count */}
                      <div className="px-4 pb-4">
                        <div className="flex items-end gap-1 mb-3">
                          <p className="text-4xl font-extrabold text-gray-800 leading-none">{activeLoad}</p>
                          <p className="text-gray-400 text-xs mb-1">jobbag aktif</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">In Progress</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${inProgress.length > 0 ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-100 text-gray-400'}`}>
                              {inProgress.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Pending</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${pending.length > 0 ? 'bg-orange-200 text-orange-800' : 'bg-gray-100 text-gray-400'}`}>
                              {pending.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Review</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${review.length > 0 ? 'bg-purple-200 text-purple-800' : 'bg-gray-100 text-gray-400'}`}>
                              {review.length}
                            </span>
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

        {/* MONITORING TAB */}
        {activeTab === 'monitoring' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard Jobbag Monitoring</h1>
              <p className="text-gray-500 text-sm mt-1">Monitoring dan Kelola Semua Jobbag</p>
            </div>

            {/* Kanban Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {(Object.entries(kanbanCounts) as [string, number][]).map(([status, count]) => {
                const colors: Record<string, string> = {
                  'New': 'bg-[#0055A9]',
                  'In Progress': 'bg-yellow-500',
                  'Pending': 'bg-orange-500',
                  'Review': 'bg-purple-600',
                  'Done': 'bg-green-500',
                }
                return (
                  <div key={status} className={`${colors[status] || 'bg-gray-500'} rounded-xl px-4 py-3 text-white`}>
                    <p className="text-white/70 text-xs">{status}</p>
                    <p className="text-2xl font-bold mt-0.5">{count}</p>
                  </div>
                )
              })}
              <div className="bg-gray-700 rounded-xl px-4 py-3 text-white">
                <p className="text-white/70 text-xs">Total Jobbag</p>
                <p className="text-2xl font-bold mt-0.5">{tickets.length}</p>
              </div>
            </div>

            {/* Designer Completion Board */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-800">Rekapitulasi Per Designer</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Jumlah jobbag selesai dan aktif per anggota tim</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {DESIGNERS.map(designer => {
                  const dt      = tickets.filter(t => t.assignedDesigner === designer)
                  const done    = dt.filter(t => t.status === 'Done').length
                  const inProg  = dt.filter(t => t.status === 'In Progress').length
                  const pending = dt.filter(t => t.status === 'Pending').length
                  const review  = dt.filter(t => t.status === 'Review').length
                  const newT    = dt.filter(t => t.status === 'New').length
                  const total   = dt.length
                  const pct     = total > 0 ? Math.round((done / total) * 100) : 0
                  const initials = designer.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                  return (
                    <div key={designer} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-[#0055A9] to-[#0070e0] px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm leading-tight truncate">{designer}</p>
                          <p className="text-blue-200 text-xs">{total} total jobbag</p>
                        </div>
                      </div>
                      {/* Stats */}
                      <div className="px-4 py-3">
                        <div className="flex items-end justify-between mb-2">
                          <div>
                            <p className="text-3xl font-extrabold text-green-600 leading-none">{done}</p>
                            <p className="text-gray-400 text-xs mt-0.5">selesai (Done)</p>
                          </div>
                          <p className="text-2xl font-bold text-gray-300">{pct}%</p>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {/* Badge breakdown */}
                        <div className="flex flex-wrap gap-1.5">
                          {newT    > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{newT} New</span>}
                          {inProg  > 0 && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{inProg} In Progress</span>}
                          {pending > 0 && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">{pending} Pending</span>}
                          {review  > 0 && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{review} Review</span>}
                          {total === 0  && <span className="text-gray-300 text-xs italic">Belum ada jobbag</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Filter By Month</label>
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={e => { setFilterMonth(e.target.value); setCurrentPage(1) }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Filter By Designer</label>
                  <select
                    value={filterDesigner}
                    onChange={e => { setFilterDesigner(e.target.value); setCurrentPage(1) }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/20"
                  >
                    <option value="">Semua Designer</option>
                    {DESIGNERS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Filter By Status</label>
                  <select
                    value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1) }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/20"
                  >
                    <option value="">Semua Status</option>
                    {TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => { setFilterMonth(''); setFilterDesigner(''); setFilterStatus('') }}
                    className="flex-1 py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-1.5 py-2 px-3 bg-[#0055A9] text-white rounded-lg text-xs font-medium hover:bg-[#003070] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left font-medium">Ticket</th>
                      <th className="px-4 py-3 text-left font-medium">Judul</th>
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Requester</th>
                      <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Kategori</th>
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Designer</th>
                      <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Deadline</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Status Designer</th>
                      <th className="px-4 py-3 text-left font-medium hidden xl:table-cell">Feedback Manager</th>
                      <th className="px-4 py-3 text-left font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedFiltered.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">Tidak ada data</td></tr>
                    ) : (
                      pagedTickets.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => setDetailTicket(ticket)} className="text-[#0055A9] font-mono text-xs font-bold hover:underline">
                              {ticket.ticketNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-700 text-xs max-w-[120px] truncate">{ticket.title}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-gray-600 text-xs">{ticket.fullName}</p>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{ticket.category}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {ticket.assignedDesigners && ticket.assignedDesigners.length > 1 ? (
                              <div className="flex flex-col gap-0.5">
                                {ticket.assignedDesigners.map(d => (
                                  <span key={d} className="text-gray-600 text-xs">{d}</span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-600 text-xs">{ticket.assignedDesigner || <span className="text-orange-400">Unassigned</span>}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-1 group">
                              <p className="text-gray-600 text-xs">{ticket.deadline}</p>
                              <button
                                onClick={() => setDeadlineModal({ ticket, deadline: ticket.deadline })}
                                title="Edit Deadline"
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-[#0055A9] transition-all"
                              >
                                <CalendarDays className="w-3 h-3" />
                              </button>
                            </div>
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
                          <td className="px-4 py-3 hidden xl:table-cell">
                            {ticket.feedback ? (
                              <p className="text-gray-600 text-xs max-w-[160px] truncate" title={ticket.feedback}>
                                {ticket.feedback}
                              </p>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setDetailTicket(ticket)}
                                title="Detail"
                                className="p-1.5 text-gray-400 hover:text-[#0055A9] hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {ticket.designerStatus === 'Review' && (
                                <button
                                  onClick={() => setFeedbackModal({ ticket, feedback: ticket.feedback || '', reviewStatus: 'Approved By Manager' })}
                                  title="Review & Approve"
                                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setEditModal({
                                  ticket,
                                  title:          ticket.title,
                                  status:         ticket.status,
                                  designerStatus: ticket.designerStatus as DesignerStatusType,
                                  designerNotes:  ticket.designerNotes || '',
                                  feedback:       ticket.feedback || '',
                                })}
                                title="Edit Judul / Status / Status Designer"
                                className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setAssignModal({ ticket, designer: ticket.assignedDesigner || '', designers: ticket.assignedDesigners || (ticket.assignedDesigner ? [ticket.assignedDesigner] : []) })}
                                title="Re-assign"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(ticket.id)}
                                title="Hapus"
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Menampilkan {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedFiltered.length)} dari {sortedFiltered.length} tiket
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      &larr; Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                          p === safePage
                            ? 'bg-[#0055A9] text-white'
                            : 'text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* SUBMIT TAB - rendered outside padded container so it fills screen */}
      {activeTab === 'submit' && (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-[#0055A9]" style={{top: '56px'}}>
          <UserSubmitForm
            onBack={() => setActiveTab('assign')}
            isDispatcherMode={true}
            onSubmitted={() => { setActiveTab('assign'); reload() }}
          />
        </div>
      )}

      {/* Modals */}
      {detailTicket && (
        <TicketDetailModal
          ticket={detailTicket}
          onClose={() => setDetailTicket(null)}
        />
      )}

      {/* Deadline Edit Modal */}
      {deadlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#0055A9] px-5 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-sm">Edit Deadline</h3>
              <button onClick={() => setDeadlineModal(null)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-5">
              <p className="text-gray-600 text-xs mb-1">Ticket: <span className="font-bold text-[#0055A9]">{deadlineModal.ticket.ticketNumber}</span></p>
              <p className="text-gray-800 text-sm font-medium mb-4 truncate">{deadlineModal.ticket.title}</p>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Deadline Baru</label>
              <input
                type="date"
                value={deadlineModal.deadline}
                onChange={e => setDeadlineModal(prev => prev ? { ...prev, deadline: e.target.value } : null)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30 mb-4"
              />
              <button
                onClick={handleDeadlineUpdate}
                disabled={!deadlineModal.deadline}
                className="w-full py-2.5 bg-[#0055A9] text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-[#003070] transition-colors"
              >
                Simpan Deadline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal — selalu multi-designer (checkbox), Design bisa pilih 1 atau lebih */}
      {assignModal && (() => {
        const ticket        = assignModal.ticket
        const selectedDesigners = assignModal.designers
        const reqType       = ticket.requestType || 'Design'
        const reqTypeColor  = REQUEST_TYPE_COLORS[reqType as RequestType] || 'bg-gray-100 text-gray-600'
        const canSubmit     = selectedDesigners.length >= 1

        const toggleDesigner = (d: string) => {
          setAssignModal(prev => {
            if (!prev) return null
            const has = prev.designers.includes(d)
            return { ...prev, designers: has ? prev.designers.filter(x => x !== d) : [...prev.designers, d] }
          })
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Header */}
              <div className="bg-[#0055A9] px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-sm">Assign Jobbag</h3>
                  <p className="text-blue-200 text-xs mt-0.5">
                    Pilih satu atau lebih designer
                  </p>
                </div>
                <button onClick={() => setAssignModal(null)} className="text-white/70 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-5">
                {/* Ticket info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[#0055A9] font-mono text-xs font-bold">{ticket.ticketNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${reqTypeColor}`}>
                      {reqType}
                    </span>
                  </div>
                  <p className="text-gray-800 text-sm font-medium truncate">{ticket.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{ticket.fullName} — {ticket.department}</p>
                  {ticket.category && (
                    <p className="text-gray-400 text-xs mt-0.5">Kategori: {ticket.category}</p>
                  )}
                </div>

                {/* Designer multi-select checkbox */}
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Pilih Designer</label>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    selectedDesigners.length > 0 ? 'bg-blue-100 text-[#0055A9]' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {selectedDesigners.length} dipilih
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 mb-5 max-h-60 overflow-y-auto pr-0.5">
                  {DESIGNERS.map(d => {
                    const selected = selectedDesigners.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDesigner(d)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                          selected
                            ? 'border-[#0055A9] bg-blue-50 text-[#0055A9] font-semibold'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50/30'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected ? 'bg-[#0055A9] border-[#0055A9]' : 'border-gray-300'
                        }`}>
                          {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </span>
                        <span className="flex-1">{d}</span>
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => {
                    if (!canSubmit) return
                    handleAssign(ticket, selectedDesigners[0], selectedDesigners)
                  }}
                  disabled={!canSubmit}
                  className="w-full py-2.5 bg-[#0055A9] text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#003070] transition-colors"
                >
                  {canSubmit
                    ? `Assign ke ${selectedDesigners.length} Designer${selectedDesigners.length > 1 ? 's' : ''}`
                    : 'Pilih minimal 1 designer'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Edit Modal — Admin dapat edit Judul, Status, Status Designer, Designer Notes */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#0055A9] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm">Edit Jobbag</h3>
                <p className="text-blue-200 text-xs mt-0.5">{editModal.ticket.ticketNumber}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Judul */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Judul Permintaan
                </label>
                <input
                  type="text"
                  value={editModal.title}
                  onChange={e => setEditModal(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30"
                />
              </div>

              {/* Status Ticket */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Status Ticket
                </label>
                <select
                  value={editModal.status}
                  onChange={e => setEditModal(prev => prev ? { ...prev, status: e.target.value as TicketStatus } : null)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30"
                >
                  {TICKET_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Status Designer */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Status Designer
                </label>
                <select
                  value={editModal.designerStatus}
                  onChange={e => setEditModal(prev => prev ? { ...prev, designerStatus: e.target.value as DesignerStatusType } : null)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30"
                >
                  {DESIGNER_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Designer Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Designer Notes
                </label>
                <textarea
                  value={editModal.designerNotes}
                  onChange={e => setEditModal(prev => prev ? { ...prev, designerNotes: e.target.value } : null)}
                  placeholder="Link hasil pekerjaan atau catatan designer..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30"
                />
              </div>

              {/* Feedback Manager */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Feedback Manager
                </label>
                <textarea
                  value={editModal.feedback}
                  onChange={e => setEditModal(prev => prev ? { ...prev, feedback: e.target.value } : null)}
                  placeholder="Catatan / feedback dari manager untuk designer..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-green-200 rounded-xl text-sm bg-green-50 resize-none focus:outline-none focus:ring-2 focus:ring-green-400/30"
                />
              </div>

              <button
                onClick={handleEditSave}
                disabled={editLoading || !editModal.title.trim()}
                className="w-full py-3 bg-[#0055A9] text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-[#003070] transition-colors"
              >
                {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback / Review / Approve Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
            <div className="bg-[#0055A9] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm">Review Hasil Pekerjaan</h3>
                <p className="text-blue-200 text-xs mt-0.5">{feedbackModal.ticket.ticketNumber} &mdash; {feedbackModal.ticket.title}</p>
              </div>
              <button onClick={() => setFeedbackModal(null)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Designer Notes Preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Designer Notes</p>
                {feedbackModal.ticket.designerNotes ? (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                    {(() => {
                      const notes = feedbackModal.ticket.designerNotes || ''
                      // Detect URLs inside the text and make them clickable
                      const urlRegex = /(https?:\/\/[^\s]+)/g
                      const parts = notes.split(urlRegex)
                      return (
                        <p className="text-purple-700 text-sm leading-relaxed break-words">
                          {parts.map((part, i) =>
                            urlRegex.test(part) ? (
                              <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                                className="text-purple-500 underline hover:text-purple-700 inline-flex items-center gap-0.5">
                                {part}
                              </a>
                            ) : part
                          )}
                        </p>
                      )
                    })()}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs italic bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">Belum ada designer notes.</p>
                )}
              </div>

              {/* Review Status Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status Review</label>
                <select
                  value={feedbackModal.reviewStatus}
                  onChange={e => setFeedbackModal(prev => prev ? { ...prev, reviewStatus: e.target.value as 'Review' | 'Approved By Manager' } : null)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30"
                >
                  <option value="Review">Reviewed — Perlu Revisi</option>
                  <option value="Approved By Manager">Approved By Manager</option>
                </select>
              </div>

              {/* Feedback Textarea */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Feedback Manager <span className="text-gray-400 font-normal normal-case">(Opsional)</span>
                </label>
                <textarea
                  value={feedbackModal.feedback}
                  onChange={e => setFeedbackModal(prev => prev ? { ...prev, feedback: e.target.value } : null)}
                  placeholder="Masukkan catatan, revisi, atau approval untuk designer..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30"
                />
              </div>

              <button
                onClick={handleApprove}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors text-white ${
                  feedbackModal.reviewStatus === 'Approved By Manager'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {feedbackModal.reviewStatus === 'Approved By Manager' ? 'Approve & Update Ticket' : 'Kirim Review & Update Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
