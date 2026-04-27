'use client'

import { useState } from 'react'
import { DISPATCHERS } from '@/lib/store'
import { ArrowLeft, Eye, EyeOff, Layout } from 'lucide-react'

interface Props {
  onBack: () => void
  onLogin: (name: string, role: 'dispatcher' | 'manager') => void
}

export default function DispatcherLogin({ onBack, onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = () => {
    const dispatcher = DISPATCHERS.find(
      d => d.username.toLowerCase() === username.toLowerCase() && d.password === password
    )
    if (dispatcher) {
      setError('')
      onLogin(dispatcher.name, dispatcher.role)
    } else {
      setError('Username atau password salah.')
    }
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
            <span className="text-white font-semibold text-sm">Admin Login</span>
          </div>
        </div>

        <div className="px-6 py-8">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Login Admin</h2>
          <p className="text-gray-400 text-xs mb-6">Masukkan credentials untuk melanjutkan</p>

          <div className="flex flex-col gap-4 mb-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30 focus:border-[#0055A9] bg-gray-50"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0055A9]/30 focus:border-[#0055A9] bg-gray-50 pr-10"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs mb-4 mt-2 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full mt-4 py-3 rounded-xl bg-[#0055A9] text-white font-semibold text-sm hover:bg-[#003070] transition-colors"
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
