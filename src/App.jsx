import { useState } from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import Landing from './components/Landing'
import MembersModule from './components/MembersModule'
import AccountsModule from './components/AccountsModule'
import ReportsModule from './components/ReportsModule'
import ManageUsers from './components/ManageUsers'
import MinutesModule from './components/MinutesModule'
import JoinPage from './components/JoinPage'
import PendingModule from './components/PendingModule'
import { ADMIN } from './constants'

export default function App() {
  const [session, setSession] = useState(null)
  const [screen, setScreen] = useState('login')
  const [permissions, setPermissions] = useState({})

  async function loadPermissions(username) {
    const { data } = await supabase
      .from('user_permissions')
      .select('module, access_level')
      .eq('username', username)
    const perms = {}
    if (data) data.forEach(r => (perms[r.module] = r.access_level))
    setPermissions(perms)
  }

  function handleLogin(s) {
    setSession(s)
    loadPermissions(s.username).then(() => setScreen('landing'))
  }

  function handleSignOut() {
    setSession(null)
    setPermissions({})
    setScreen('login')
  }

  // Public join page — no auth needed
  if (window.location.pathname === '/join') return <JoinPage />

  if (screen === 'login')    return <Login onLogin={handleLogin} />
  if (screen === 'landing')  return <Landing session={session} permissions={permissions} onNavigate={setScreen} onSignOut={handleSignOut} />
  if (screen === 'members')  return <MembersModule session={session} permissions={permissions} onBack={() => setScreen('landing')} />
  if (screen === 'accounts') return <AccountsModule session={session} permissions={permissions} onBack={() => setScreen('landing')} />
  if (screen === 'reports')  return <ReportsModule session={session} permissions={permissions} onBack={() => setScreen('landing')} />
  if (screen === 'minutes')  return <MinutesModule session={session} permissions={permissions} onBack={() => setScreen('landing')} />
  if (screen === 'manage')   return <ManageUsers session={session} onBack={() => setScreen('landing')} />
  if (screen === 'pending')  return <PendingModule session={session} permissions={permissions} onBack={() => setScreen('landing')} />

  return null
}
