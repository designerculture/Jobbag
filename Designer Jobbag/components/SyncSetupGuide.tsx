'use client'

import { useState } from 'react'
import { X, Copy, Check, ExternalLink, RefreshCw, Wifi, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  onClose: () => void
  onRetry: () => void
}

// Kode doGet terbaru yang harus ada di Apps Script
const DO_GET_CODE = `function doGet(e) {
  var action = e && e.parameter && e.parameter.action ? e.parameter.action : '';
  if (action === 'getTickets') {
    return getTicketsJson();
  }
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Designer Jobbag System API aktif' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTicketsJson() {
  try {
    var sheet  = getOrCreateSheet();
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, tickets: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var tickets = [];
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (!row[0]) continue;
      tickets.push({
        ticketNumber: String(row[0] || ''),
        submittedAt: String(row[1] || ''),
        fullName: String(row[2] || ''),
        email: String(row[3] || ''),
        emailOptional1: String(row[4] || ''),
        emailOptional2: String(row[5] || ''),
        initials: String(row[6] || ''),
        department: String(row[7] || ''),
        title: String(row[8] || ''),
        description: String(row[9] || ''),
        requestType: String(row[10] || ''),
        category: String(row[11] || ''),
        linkReference: String(row[12] || ''),
        attachmentDriveUrl: String(row[13] || ''),
        attachmentDriveUrl2: String(row[14] || ''),
        attachmentDriveUrl3: String(row[15] || ''),
        deadline: String(row[16] || ''),
        prepDate: String(row[17] || ''),
        assignedDesigner: String(row[18] || ''),
        assignedDesigners: String(row[19] || ''),
        status: String(row[20] || 'New'),
        designerStatus: String(row[21] || 'Not Review'),
        feedback: String(row[22] || ''),
        designerNotes: String(row[23] || ''),
        timestampSubmit: String(row[24] || ''),
        timestampAssign: String(row[25] || ''),
        timestampReview: String(row[26] || ''),
        timestampApproved: String(row[27] || ''),
        timestampShared: String(row[28] || ''),
        lastUpdated: String(row[29] || ''),
      });
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, tickets: tickets }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`

export default function SyncSetupGuide({ onClose, onRetry }: Props) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(DO_GET_CODE).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2500)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="bg-[#0055A9] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Aktifkan Sync Antar Device</h3>
              <p className="text-blue-200 text-xs mt-0.5">Ikuti 3 langkah di bawah ini</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

          {/* Root cause explanation */}
          <div className="flex gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 text-xs font-semibold">Penyebab masalah</p>
              <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
                Kode baru <strong>doGet + getTicketsJson</strong> sudah ditambahkan ke file Apps Script,
                tapi Google masih menjalankan versi lama. Perlu <strong>copy-paste kode terbaru</strong> ke editor Google,
                lalu <strong>deploy ulang sebagai versi baru</strong>.
              </p>
            </div>
          </div>

          {/* Step 1 */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
              <span className="w-6 h-6 rounded-full bg-[#0055A9] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <p className="text-gray-800 text-sm font-semibold">Buka Google Apps Script</p>
              <a
                href="https://script.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 bg-[#0055A9] text-white rounded-lg text-xs font-medium hover:bg-[#003070] transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-3 h-3" /> Buka
              </a>
            </div>
            <div className="px-4 py-3 text-xs text-gray-500 leading-relaxed">
              Buka <strong>script.google.com</strong>, pilih project <strong>Designer Jobbag System</strong>, lalu pilih file utama (Code.gs).
            </div>
          </div>

          {/* Step 2 */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
              <span className="w-6 h-6 rounded-full bg-[#0055A9] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <p className="text-gray-800 text-sm font-semibold">Ganti fungsi doGet dengan kode terbaru</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Cari fungsi <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">doGet</code> yang sudah ada di editor Apps Script, lalu <strong>ganti seluruhnya</strong> dengan kode di bawah ini:
              </p>
              {/* Toggle code */}
              <button
                onClick={() => setShowCode(v => !v)}
                className="flex items-center gap-2 text-xs text-[#0055A9] font-medium"
              >
                {showCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showCode ? 'Sembunyikan kode' : 'Tampilkan kode doGet + getTicketsJson'}
              </button>
              {showCode && (
                <div className="relative">
                  <pre className="bg-gray-900 text-green-300 text-[10px] leading-relaxed rounded-xl p-4 overflow-auto max-h-52 font-mono whitespace-pre-wrap">
                    {DO_GET_CODE}
                  </pre>
                  <button
                    onClick={handleCopyCode}
                    className={`absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      copiedCode
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedCode ? 'Disalin!' : 'Copy kode'}
                  </button>
                </div>
              )}
              {!showCode && (
                <button
                  onClick={handleCopyCode}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors w-full justify-center ${
                    copiedCode
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Kode berhasil disalin ke clipboard!' : 'Copy kode doGet + getTicketsJson'}
                </button>
              )}
            </div>
          </div>

          {/* Step 3 */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
              <span className="w-6 h-6 rounded-full bg-[#0055A9] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <p className="text-gray-800 text-sm font-semibold">Deploy ulang sebagai versi baru</p>
            </div>
            <div className="px-4 py-3 text-xs text-gray-500 leading-relaxed space-y-1.5">
              <p>Setelah paste kode, klik <strong>Ctrl+S</strong> (Save), lalu:</p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Klik tombol <strong>Deploy</strong> (kanan atas)</li>
                <li>Pilih <strong>Manage Deployments</strong></li>
                <li>Klik ikon pensil (Edit) di deployment yang aktif</li>
                <li>Pada dropdown Version, pilih <strong>New version</strong></li>
                <li>Klik tombol <strong>Deploy</strong></li>
                <li>Pastikan &ldquo;Who has access&rdquo; = <strong>Anyone</strong></li>
              </ol>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={() => { onRetry(); onClose() }}
            className="flex-1 py-2.5 bg-[#0055A9] text-white rounded-xl text-sm font-semibold hover:bg-[#003070] transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Sudah deploy, coba sync
          </button>
        </div>
      </div>
    </div>
  )
}
