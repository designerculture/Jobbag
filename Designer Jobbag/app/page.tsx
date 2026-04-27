'use client'

import { useState } from 'react'
import HomePage from '@/components/HomePage'
import UserSubmitForm from '@/components/UserSubmitForm'
import DesignerLogin from '@/components/DesignerLogin'
import DispatcherLogin from '@/components/DispatcherLogin'
import DesignerDashboard from '@/components/DesignerDashboard'
import DispatcherDashboard from '@/components/DispatcherDashboard'

export type AppView =
  | 'home'
  | 'user-submit'
  | 'designer-login'
  | 'dispatcher-login'
  | 'designer-dashboard'
  | 'dispatcher-dashboard'

export default function Page() {
  const [view, setView] = useState<AppView>('home')
  const [designerName, setDesignerName] = useState<string>('')
  const [dispatcherName, setDispatcherName] = useState<string>('')
  const [dispatcherRole, setDispatcherRole] = useState<'dispatcher' | 'manager'>('dispatcher')

  return (
    <main className="min-h-screen bg-background">
      {view === 'home' && <HomePage onNavigate={setView} />}
      {view === 'user-submit' && <UserSubmitForm onBack={() => setView('home')} />}
      {view === 'designer-login' && (
        <DesignerLogin
          onBack={() => setView('home')}
          onLogin={(name) => { setDesignerName(name); setView('designer-dashboard') }}
        />
      )}
      {view === 'dispatcher-login' && (
        <DispatcherLogin
          onBack={() => setView('home')}
          onLogin={(name, role) => {
            setDispatcherName(name)
            setDispatcherRole(role)
            setView('dispatcher-dashboard')
          }}
        />
      )}
      {view === 'designer-dashboard' && (
        <DesignerDashboard
          designerName={designerName}
          onLogout={() => setView('home')}
        />
      )}
      {view === 'dispatcher-dashboard' && (
        <DispatcherDashboard
          dispatcherName={dispatcherName}
          dispatcherRole={dispatcherRole}
          onLogout={() => setView('home')}
        />
      )}
    </main>
  )
}
