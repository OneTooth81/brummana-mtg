import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import Landing from './components/Landing'
import MembersModule from './components/MembersModule'
import AccountsModule from './components/AccountsModule'
import ManageUsers from './components/ManageUsers'

export const ADMIN = 'Najib.A'
export const GENERATIONS = ['Youth', 'Adult', 'Senior']
export const RESIDENCES = ['Brummana', 'Roumieh', 'Baabdat', 'Beit Meri']
export const INCOME_CATEGORIES = ['Donations', 'Membership Fees', 'Events', 'Other']
export const EXPENSE_CATEGORIES = ['Printing', 'Events', 'Transport', 'Office', 'Other']

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

  const nav = (s) => setScreen(s)

  if (screen === 'login') return <Login onLogin={handleLogin} />
  if (screen === 'landing') return <Landing session={session} permissions={permissions} onNavigate={nav} onSignOut={handleSignOut} />
  if (screen === 'members') return <MembersModule session={session} permissions={permissions} onBack={() => nav('landing')} />
  if (screen === 'accounts') return <AccountsModule session={session} permissions={permissions} onBack={() => nav('landing')} />
  if (screen === 'manage') return <ManageUsers session={session} onBack={() => nav('landing')} />

  return null
}
