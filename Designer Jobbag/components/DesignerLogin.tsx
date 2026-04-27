'use client'

import { useState } from 'react'
import { DESIGNERS } from '@/lib/store'
import { ArrowLeft, Layout, Eye, EyeOff, AlertCircle } from 'lucide-react'

const DESIGNER_PASSWORD = 'Designer7'

interface Props {
  onBack: () => void
  onLogin: (name: string) => void
}

export default function DesignerLogin({ onBack, onLogin }: Props) {
  const [selected, setSelected] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = () => {
    setError('')
    if (!selected) { setError('Pilih nama designer terlebih dahulu.'); return }
    if (!password) { setError('Masukkan password.'); return }
    if (password !== DESIGNER_PASSWORD) { setError('Password salah. Coba lagi.'); return }
    onLogin(selected)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0055A9 0%, #003070 100%)' }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#0055A9] px-6 py-5 flex items-center gap-3">
          <button onClick={onBack} className="text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-sm">Designer Login</span>
          </div>
        </div>

        <div className="px-6 py-8">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Login Designer</h2>
          <p className="text-gray-400 text-xs mb-6">Pilih nama dan masukkan password untuk melanjutkan</p>

          {/* Name Dropdown */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Designer</label>
            <select
              value={selected}
              onChange={e => { setSelected(e.target.value); setError('') }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30 text-gray-700"
            >
              <option value="">-- Pilih Nama --</option>
              {DESIGNERS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Masukkan password"
                className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl bg-[#0055A9] text-white font-semibold text-sm hover:bg-[#003070] transition-colors"
          >
            Masuk ke Dashboard
          </button>
        </div>
      </div>

      <button onClick={onBack} className="mt-6 text-blue-200 text-xs hover:text-white transition-colors">
        Kembali ke halaman utama
      </button>
    </div>
  )
}
