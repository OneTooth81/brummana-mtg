import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Lock, User, AlertCircle } from 'lucide-react'
import { ADMIN } from '../App'

export default function Login({ onLogin }) {
  const [users, setUsers] = useState([])
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('app_users').select('username, pin').then(({ data }) => {
      if (data) setUsers(data)
    })
  }, [])

  const selected = users.find(u => u.username === username)
  const needsSetup = selected && !selected.pin

  async function signIn() {
    setError('')
    if (!username) { setError('Select your name.'); return }
    const u = users.find(x => x.username === username)
    if (!u) { setError('User not found.'); return }
    if (!u.pin) {
      if (!/^\d{4,8}$/.test(pin)) { setError('Choose a 4–8 digit PIN.'); return }
      if (pin !== pin2) { setError("PINs don't match."); return }
      await supabase.from('app_users').update({ pin }).eq('username', username)
    } else {
      if (pin !== u.pin) { setError('Incorrect PIN.'); return }
    }
    onLogin({ username, isAdmin: username === ADMIN })
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 text-white px-6 py-6">
        <h1 className="text-2xl font-bold">Brummana Meet the Generations</h1>
        <p className="text-teal-50 text-sm mt-1">Member Database · building bonds across generations 🌿</p>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white w-full max-w-sm rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold flex items-center gap-2"><Lock size={18} /> Sign in</h2>
          <div className="mt-4 space-y-3">
            <select value={username} onChange={e => { setUsername(e.target.value); setError(''); setPin(''); setPin2('') }}
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select your name…</option>
              {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
            </select>
            {needsSetup && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">First time signing in — choose a PIN for your account.</p>}
            <input value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g,'').slice(0,8)); setError('') }}
              onKeyDown={e => e.key === 'Enter' && !needsSetup && signIn()}
              placeholder={needsSetup ? 'Choose a PIN' : 'PIN'} type="password" inputMode="numeric"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            {needsSetup && (
              <input value={pin2} onChange={e => { setPin2(e.target.value.replace(/\D/g,'').slice(0,8)); setError('') }}
                onKeyDown={e => e.key === 'Enter' && signIn()}
                placeholder="Confirm PIN" type="password" inputMode="numeric"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            )}
            {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle size={14} /> {error}</p>}
            <button onClick={signIn} className="w-full py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800">
              {needsSetup ? 'Set PIN & sign in' : 'Sign in'}
            </button>
            <p className="text-xs text-stone-400 text-center">Accounts are managed by the administrator.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
