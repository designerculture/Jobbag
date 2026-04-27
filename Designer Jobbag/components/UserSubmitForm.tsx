'use client'

import { useState } from 'react'
import {
  ticketStore, generateTicketNumber,
  DESIGN_CATEGORIES, MULTIMEDIA_CATEGORIES, BUNDLE_CATEGORIES,
  RequestType,
} from '@/lib/store'
import { ArrowLeft, CheckCircle, Layout, Upload, X, Paperclip, Image, Video, Package } from 'lucide-react'
import { submitToSheets } from '@/lib/sheetsSync'

interface Props {
  onBack: () => void
  prefillData?: { ticketNumber?: string }
  onSubmitted?: (ticket: ReturnType<typeof ticketStore.create>) => void
  isDispatcherMode?: boolean
}

type FormData = {
  fullName: string
  email: string
  emailOptional1: string
  emailOptional2: string
  initials: string
  department: string
  title: string
  description: string
  requestType: RequestType | ''
  category: string
  categories: string[]   // for Bundle Request
  linkReference: string
  deadline: string
  prepDate: string
  // File 1
  attachmentName: string
  attachmentData: string
  // File 2
  attachmentName2: string
  attachmentData2: string
  // File 3
  attachmentName3: string
  attachmentData3: string
}

const empty: FormData = {
  fullName: '', email: '', emailOptional1: '', emailOptional2: '',
  initials: '', department: '', title: '', description: '',
  requestType: '', category: '', categories: [],
  linkReference: '', deadline: '', prepDate: '',
  attachmentName: '', attachmentData: '',
  attachmentName2: '', attachmentData2: '',
  attachmentName3: '', attachmentData3: '',
}

const REQUEST_TYPES: { value: RequestType; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'Design',         label: 'Design',         desc: 'Poster, banner, logo, dll',          icon: <Image className="w-5 h-5" /> },
  { value: 'Multimedia',     label: 'Multimedia',     desc: 'Foto, video, dokumentasi, dll',       icon: <Video className="w-5 h-5" /> },
  { value: 'Bundle Request', label: 'Bundle Request', desc: 'Kombinasi design & multimedia (2-4)', icon: <Package className="w-5 h-5" /> },
]

export default function UserSubmitForm({ onBack, onSubmitted, isDispatcherMode }: Props) {
  const [ticketNum] = useState(() => generateTicketNumber())
  const [form, setForm] = useState<FormData>(empty)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  // Progress upload background (ditampilkan di halaman sukses)
  const [uploadProgress, setUploadProgress] = useState<{
    status: 'uploading' | 'done' | 'error' | null
    step: string
    filesDone: number
    filesTotal: number
  }>({ status: null, step: '', filesDone: 0, filesTotal: 0 })
  const [createdTicket, setCreatedTicket] = useState<ReturnType<typeof ticketStore.create> | null>(null)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleRequestType = (rt: RequestType) => {
    setForm(prev => ({ ...prev, requestType: rt, category: '', categories: [], deadline: '', prepDate: '' }))
    setErrors({})
  }

  const toggleBundleCategory = (cat: string) => {
    setForm(prev => {
      const already = prev.categories.includes(cat)
      if (already) return { ...prev, categories: prev.categories.filter(c => c !== cat) }
      if (prev.categories.length >= 4) return prev // max 4
      return { ...prev, categories: [...prev.categories, cat] }
    })
    setErrors(prev => ({ ...prev, categories: '' }))
  }

  const handleFile = (slot: 1 | 2 | 3) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('File maksimal 10MB'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (slot === 1) setForm(prev => ({ ...prev, attachmentName: file.name, attachmentData: result }))
      else if (slot === 2) setForm(prev => ({ ...prev, attachmentName2: file.name, attachmentData2: result }))
      else setForm(prev => ({ ...prev, attachmentName3: file.name, attachmentData3: result }))
    }
    reader.readAsDataURL(file)
  }

  const removeFile = (slot: 1 | 2 | 3) => {
    if (slot === 1) setForm(p => ({ ...p, attachmentName: '', attachmentData: '' }))
    else if (slot === 2) setForm(p => ({ ...p, attachmentName2: '', attachmentData2: '' }))
    else setForm(p => ({ ...p, attachmentName3: '', attachmentData3: '' }))
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.fullName.trim())    errs.fullName    = 'Nama lengkap wajib diisi'
    if (!form.email.trim())       errs.email       = 'Email wajib diisi'
    if (!form.initials.trim())    errs.initials    = 'Inisial wajib diisi'
    if (!form.department.trim())  errs.department  = 'Department wajib diisi'
    if (!form.title.trim())       errs.title       = 'Judul wajib diisi'
    if (!form.description.trim()) errs.description = 'Deskripsi wajib diisi'
    if (!form.requestType)        errs.requestType = 'Tipe permintaan wajib dipilih'
    if (form.requestType === 'Bundle Request') {
      if (form.categories.length < 2) errs.categories = 'Pilih minimal 2 kategori (maks 4)'
    } else {
      if (!form.category) errs.category = 'Kategori wajib dipilih'
    }
    if (!form.deadline) errs.deadline = form.requestType === 'Multimedia' ? 'Event Date wajib diisi' : 'Deadline wajib diisi'
    if (form.requestType === 'Bundle Request' && !form.prepDate) errs.prepDate = 'Prep Date wajib diisi'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const uploadFile = async (fileName: string, fileData: string, ticketNumber: string, requesterName: string, jobTitle: string): Promise<string> => {
    try {
      const res = await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileData, ticketNumber, requesterName, jobTitle }),
      })
      const data = await res.json()
      // Selalu pakai folderUrl agar semua file mengarah ke 1 folder yang sama
      return data.folderUrl || data.driveUrl || ''
    } catch { return '' }
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setLoadingStep('Menyimpan jobbag...')
    try {
      const categoryValue = form.requestType === 'Bundle Request'
        ? form.categories.join(', ')
        : form.category

      // Step 1: Simpan tiket ke localStorage DULU — ini harus selalu berhasil
      const ticket = ticketStore.create({
        fullName:       form.fullName,
        email:          form.email,
        emailOptional1: form.emailOptional1 || undefined,
        emailOptional2: form.emailOptional2 || undefined,
        initials:       form.initials,
        department:     form.department,
        title:          form.title,
        description:    form.description,
        requestType:    form.requestType as RequestType,
        category:       categoryValue,
        categories:     form.requestType === 'Bundle Request' ? form.categories : undefined,
        linkReference:  form.linkReference || undefined,
        attachmentName:  form.attachmentName  || undefined,
        attachmentName2: form.attachmentName2 || undefined,
        attachmentName3: form.attachmentName3 || undefined,
        deadline: form.deadline,
        prepDate: form.prepDate || undefined,
      })

      // Step 2: Tampilkan sukses SEGERA — tiket sudah tersimpan
      setCreatedTicket(ticket)
      if (onSubmitted) onSubmitted(ticket)
      else setSubmitted(true)
      setLoading(false)
      setLoadingStep('')

      // Step 3: Drive upload + Sheets + Email berjalan di background
      // Tidak memblokir UI — user sudah melihat halaman sukses
      const hasFile1 = !!(form.attachmentData && form.attachmentName)
      const hasFile2 = !!(form.attachmentData2 && form.attachmentName2)
      const hasFile3 = !!(form.attachmentData3 && form.attachmentName3)

      ;(async () => {
        const filesTotal = [hasFile1, hasFile2, hasFile3].filter(Boolean).length
        if (filesTotal > 0) {
          setUploadProgress({ status: 'uploading', step: `Mengupload file ke Google Drive...`, filesDone: 0, filesTotal })
        }

        // Upload sequential agar 1 folder Drive per tiket
        let driveUrl1 = '', driveUrl2 = '', driveUrl3 = '', filesDone = 0
        if (hasFile1) {
          driveUrl1 = await uploadFile(form.attachmentName, form.attachmentData, ticket.ticketNumber, form.fullName, form.title)
          filesDone++
          setUploadProgress(p => ({ ...p, filesDone, step: filesDone < filesTotal ? `File ${filesDone}/${filesTotal} selesai, melanjutkan...` : 'Semua file terupload!' }))
        }
        if (hasFile2) {
          driveUrl2 = await uploadFile(form.attachmentName2, form.attachmentData2, ticket.ticketNumber, form.fullName, form.title)
          filesDone++
          setUploadProgress(p => ({ ...p, filesDone, step: filesDone < filesTotal ? `File ${filesDone}/${filesTotal} selesai, melanjutkan...` : 'Semua file terupload!' }))
        }
        if (hasFile3) {
          driveUrl3 = await uploadFile(form.attachmentName3, form.attachmentData3, ticket.ticketNumber, form.fullName, form.title)
          filesDone++
          setUploadProgress(p => ({ ...p, filesDone, step: 'Semua file terupload!' }))
        }

        // Update localStorage dengan driveUrl setelah upload selesai
        const driveUpdates: Partial<Ticket> = {}
        if (driveUrl1) driveUpdates.attachmentDriveUrl  = driveUrl1
        if (driveUrl2) driveUpdates.attachmentDriveUrl2 = driveUrl2
        if (driveUrl3) driveUpdates.attachmentDriveUrl3 = driveUrl3
        if (Object.keys(driveUpdates).length > 0) {
          ticketStore.update(ticket.id, driveUpdates, {
            action: 'File diupload ke Google Drive',
            timestamp: new Date().toISOString(),
            actor: 'System',
          })
        }

        // Update driveUrl setelah semua selesai
        if (filesTotal > 0) {
          setUploadProgress(p => ({ ...p, status: 'done', step: 'File berhasil disimpan di Google Drive' }))
          // Auto-dismiss setelah 6 detik
          setTimeout(() => setUploadProgress({ status: null, step: '', filesDone: 0, filesTotal: 0 }), 6_000)
        }

        // Sync ke Google Sheets — pakai submitToSheets agar tidak ada base64 di payload
        await submitToSheets({
          ...ticket,
          attachmentDriveUrl:  driveUrl1 || ticket.attachmentDriveUrl,
          attachmentDriveUrl2: driveUrl2 || ticket.attachmentDriveUrl2,
          attachmentDriveUrl3: driveUrl3 || ticket.attachmentDriveUrl3,
          // Hapus base64 sebelum kirim ke Sheets
          attachmentData:  undefined,
          attachmentData2: undefined,
          attachmentData3: undefined,
        })

        // Email notifikasi
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'submitted',
              ticket: {
                ticketNumber:        ticket.ticketNumber,
                fullName:            ticket.fullName,
                email:               ticket.email,
                emailOptional1:      ticket.emailOptional1,
                emailOptional2:      ticket.emailOptional2,
                department:          ticket.department,
                title:               ticket.title,
                description:         ticket.description,
                requestType:         ticket.requestType,
                category:            ticket.category,
                linkReference:       ticket.linkReference,
                attachmentName:      ticket.attachmentName,
                attachmentName2:     ticket.attachmentName2,
                attachmentName3:     ticket.attachmentName3,
                attachmentDriveUrl:  driveUrl1 || undefined,
                attachmentDriveUrl2: driveUrl2 || undefined,
                attachmentDriveUrl3: driveUrl3 || undefined,
                deadline:            ticket.deadline,
                prepDate:            ticket.prepDate,
              },
            }),
          })
        } catch { /* lanjutkan */ }
      })()

    } catch (err) {
      // Kalau ticketStore.create gagal (sangat jarang)
      setLoading(false)
      setLoadingStep('')
      alert('Gagal menyimpan jobbag. Silakan coba lagi.')
    }
  }

  const inputCls = (field: string) =>
    `w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30 focus:border-[#0055A9] transition-colors ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-100 text-gray-800'
    }`

  const FileSlot = ({ slot }: { slot: 1 | 2 | 3 }) => {
    const name = slot === 1 ? form.attachmentName : slot === 2 ? form.attachmentName2 : form.attachmentName3
    return name ? (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm">
        <Paperclip className="w-4 h-4 text-green-600 flex-shrink-0" />
        <span className="text-green-700 text-xs flex-1 truncate">{name}</span>
        <button onClick={() => removeFile(slot)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    ) : (
      <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-100 border border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors">
        <Upload className="w-4 h-4 text-gray-400" />
        <span className="text-gray-400 text-xs">Pilih file... (maks 10MB)</span>
        <input type="file" onChange={handleFile(slot)} className="hidden" />
      </label>
    )
  }

  if (submitted && createdTicket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative" style={{ background: '#0055A9' }}>
        {/* Floating upload progress toast */}
        {uploadProgress.status && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium transition-all ${
            uploadProgress.status === 'done'
              ? 'bg-green-600 text-white'
              : uploadProgress.status === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-800 border border-gray-200'
          }`}>
            {uploadProgress.status === 'uploading' && (
              <svg className="animate-spin w-4 h-4 text-[#0055A9] flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
              </svg>
            )}
            {uploadProgress.status === 'done' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
            <div>
              <p>{uploadProgress.step}</p>
              {uploadProgress.status === 'uploading' && uploadProgress.filesTotal > 1 && (
                <div className="mt-1.5 w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0055A9] rounded-full transition-all duration-500"
                    style={{ width: `${(uploadProgress.filesDone / uploadProgress.filesTotal) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Jobbag Berhasil Disubmit!</h2>
          <p className="text-gray-500 text-sm mb-4">Ticket Anda telah diterima dan akan segera diproses.</p>
          <div className="bg-blue-50 rounded-xl px-4 py-3 mb-6">
            <p className="text-xs text-gray-500 mb-1">Ticket ID Anda</p>
            <p className="text-lg font-bold text-[#0055A9]">{createdTicket.ticketNumber}</p>
          </div>
          <div className="text-left text-xs text-gray-500 space-y-1 mb-6 bg-gray-50 rounded-xl px-4 py-3">
            <p><span className="font-medium text-gray-700">Tipe:</span> {createdTicket.requestType}</p>
            <p><span className="font-medium text-gray-700">Judul:</span> {createdTicket.title}</p>
            <p><span className="font-medium text-gray-700">Kategori:</span> {createdTicket.category}</p>
            <p><span className="font-medium text-gray-700">
              {createdTicket.requestType === 'Multimedia' || createdTicket.requestType === 'Bundle Request' ? 'Event Date' : 'Design Deadline'}:
            </span> {createdTicket.deadline}</p>
          </div>
          <button onClick={onBack} className="w-full py-3 rounded-xl bg-[#0055A9] text-white font-semibold text-sm hover:bg-[#003070] transition-colors">
            Kembali ke Halaman Utama
          </button>
        </div>
      </div>
    )
  }

  const deadlineLabel = form.requestType === 'Multimedia' ? 'Event Date' : 'Design Deadline'

  return (
    <div className="min-h-screen" style={{ background: '#0055A9' }}>
      {!isDispatcherMode && (
        <header className="sticky top-0 z-40 bg-[#003070] shadow-md">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={onBack} className="text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Layout className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-sm">Designer Jobbag System</span>
          </div>
        </header>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-[#0055A9] px-6 py-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-white font-bold text-lg">Submit Jobbag</h1>
              <p className="text-blue-200 text-xs mt-1">
                {isDispatcherMode ? 'Form submit jobbag oleh Dispatcher' : 'Isi form berikut untuk mengajukan permintaan kepada Tim Designer'}
              </p>
            </div>
            {isDispatcherMode && (
              <button onClick={onBack} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition-colors mt-0.5 flex-shrink-0">
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali
              </button>
            )}
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Ticket Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Ticket Number</label>
              <div className="px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100 text-[#0055A9] font-bold text-sm tracking-widest">
                {ticketNum}
              </div>
            </div>

            {/* Nama & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="Masukkan nama lengkap" className={inputCls('fullName')} />
                {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Alamat Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="email@asuransiastra.com" className={inputCls('email')} />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>

            {/* Optional Emails */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Alamat Email Optional 1</label>
                <input type="email" value={form.emailOptional1} onChange={set('emailOptional1')} placeholder="email tambahan (opsional)" className={inputCls('emailOptional1')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Alamat Email Optional 2</label>
                <input type="email" value={form.emailOptional2} onChange={set('emailOptional2')} placeholder="email tambahan (opsional)" className={inputCls('emailOptional2')} />
              </div>
            </div>

            {/* Inisial & Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">3 Huruf Inisial <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.initials}
                  onChange={e => setForm(p => ({ ...p, initials: e.target.value.toUpperCase().slice(0, 3) }))}
                  placeholder="e.g. FPR"
                  maxLength={3}
                  className={inputCls('initials')}
                />
                {errors.initials && <p className="text-red-400 text-xs mt-1">{errors.initials}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Department <span className="text-red-500">*</span></label>
                <input type="text" value={form.department} onChange={set('department')} placeholder="e.g. Brand Communication" className={inputCls('department')} />
                {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department}</p>}
              </div>
            </div>

            {/* Judul */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Judul Permintaan <span className="text-red-500">*</span></label>
              <input type="text" value={form.title} onChange={set('title')} placeholder="Masukkan judul permintaan" className={inputCls('title')} />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Deskripsi Permintaan <span className="text-red-500">*</span></label>
              <textarea
                value={form.description}
                onChange={set('description')}
                placeholder="Jelaskan detail permintaan Anda..."
                rows={4}
                className={`${inputCls('description')} resize-none`}
              />
              {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* === REQUEST TYPE === */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Tipe Permintaan <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {REQUEST_TYPES.map(rt => (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => handleRequestType(rt.value)}
                    className={`flex flex-col items-start gap-1.5 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                      form.requestType === rt.value
                        ? 'border-[#0055A9] bg-blue-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <span className={form.requestType === rt.value ? 'text-[#0055A9]' : 'text-gray-400'}>
                      {rt.icon}
                    </span>
                    <span className={`font-semibold text-sm ${form.requestType === rt.value ? 'text-[#0055A9]' : 'text-gray-700'}`}>
                      {rt.label}
                    </span>
                    <span className="text-gray-400 text-xs leading-tight">{rt.desc}</span>
                  </button>
                ))}
              </div>
              {errors.requestType && <p className="text-red-400 text-xs mt-1">{errors.requestType}</p>}
            </div>

            {/* === KATEGORI (muncul setelah requestType dipilih) === */}
            {form.requestType && form.requestType !== 'Bundle Request' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Kategori Permintaan <span className="text-red-500">*</span>
                </label>
                <select value={form.category} onChange={set('category')} className={inputCls('category')}>
                  <option value="">-- Pilih Kategori --</option>
                  {(form.requestType === 'Design' ? DESIGN_CATEGORIES : MULTIMEDIA_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
              </div>
            )}

            {/* Bundle Request — multi select checkbox */}
            {form.requestType === 'Bundle Request' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Kategori Permintaan <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">(min 2, maks 4)</span>
                  </label>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    form.categories.length >= 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {form.categories.length}/4 dipilih
                  </span>
                </div>

                {/* Design section */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 px-1">Design</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {DESIGN_CATEGORIES.map(cat => {
                      const selected = form.categories.includes(cat)
                      const disabled = !selected && form.categories.length >= 4
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => !disabled && toggleBundleCategory(cat)}
                          disabled={disabled}
                          className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                            selected
                              ? 'border-[#0055A9] bg-blue-50 text-[#0055A9] font-semibold'
                              : disabled
                              ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {selected && <span className="mr-1">✓</span>}{cat}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Multimedia section */}
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2 px-1">Multimedia</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {MULTIMEDIA_CATEGORIES.map(cat => {
                      const selected = form.categories.includes(cat)
                      const disabled = !selected && form.categories.length >= 4
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => !disabled && toggleBundleCategory(cat)}
                          disabled={disabled}
                          className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                            selected
                              ? 'border-[#0055A9] bg-blue-50 text-[#0055A9] font-semibold'
                              : disabled
                              ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {selected && <span className="mr-1">✓</span>}{cat}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {errors.categories && <p className="text-red-400 text-xs mt-2">{errors.categories}</p>}
              </div>
            )}

            {/* Link Referensi */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Link Referensi (Opsional)</label>
              <input type="url" value={form.linkReference} onChange={set('linkReference')} placeholder="https://..." className={inputCls('linkReference')} />
            </div>

            {/* File Upload 1, 2, 3 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Upload Attachment (Opsional, maks 10MB per file)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {([1, 2, 3] as const).map(slot => (
                  <div key={slot}>
                    <p className="text-xs text-gray-400 mb-1.5">File {slot}</p>
                    <FileSlot slot={slot} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Semua file akan tersimpan dalam 1 folder Google Drive sesuai Ticket ID</p>
            </div>

            {/* Deadline fields — conditional by requestType */}
            {form.requestType && (
              <div className={`grid gap-4 ${form.requestType === 'Bundle Request' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {deadlineLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={set('deadline')}
                    min={new Date().toISOString().split('T')[0]}
                    className={inputCls('deadline')}
                  />
                  {errors.deadline && <p className="text-red-400 text-xs mt-1">{errors.deadline}</p>}
                </div>
                {form.requestType === 'Bundle Request' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Event Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.prepDate}
                      onChange={set('prepDate')}
                      min={new Date().toISOString().split('T')[0]}
                      className={inputCls('prepDate')}
                    />
                    {errors.prepDate && <p className="text-red-400 text-xs mt-1">{errors.prepDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-white border-2 border-[#0055A9] text-[#0055A9] font-bold text-sm hover:bg-[#0055A9] hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                    </svg>
                    <span>{loadingStep || 'Memproses...'}</span>
                  </>
                ) : 'Submit Jobbag'}
              </button>
              {loading && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#0055A9] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#0055A9] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#0055A9] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-[#0055A9] text-xs">{loadingStep}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
