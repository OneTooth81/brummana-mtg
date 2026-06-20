import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { AlertCircle, Leaf } from 'lucide-react'
import { ADMIN } from '../constants'

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
    <div className="min-h-screen flex flex-col sm:items-center sm:justify-center sm:bg-stone-100">

      {/* Mobile: gradient brand area */}
      <div className="bg-gradient-to-br from-teal-700 to-emerald-600 px-8 pt-16 pb-14 sm:hidden">
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center mb-5">
          <Leaf size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white leading-snug">
          Brummana<br />Meet the Generations
        </h1>
        <p className="text-teal-100/75 text-sm mt-2">Building bonds across generations</p>
      </div>

      {/* Form card */}
      <div className="flex-1 bg-white rounded-t-3xl sm:rounded-2xl sm:flex-none sm:w-full sm:max-w-sm sm:border sm:border-stone-200 px-6 pt-8 pb-12 sm:py-8">

        {/* Desktop-only brand */}
        <div className="hidden sm:flex flex-col items-center mb-6">
          <div className="w-11 h-11 rounded-2xl bg-teal-700 flex items-center justify-center mb-3">
            <Leaf size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-stone-800">Brummana Meet the Generations</h1>
          <p className="text-stone-400 text-sm mt-1">Building bonds across generations</p>
        </div>

        <h2 className="text-xl font-bold text-stone-800 mb-5 sm:text-lg sm:mb-4">Sign in</h2>

        <div className="space-y-3">
          <select
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); setPin(''); setPin2('') }}
            className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-base">
            <option value="">Select your name…</option>
            {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
          </select>

          {needsSetup && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              First time signing in — choose a PIN for your account.
            </p>
          )}

          <input
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError('') }}
            onKeyDown={e => e.key === 'Enter' && !needsSetup && signIn()}
            placeholder={needsSetup ? 'Choose a PIN (4–8 digits)' : 'Enter PIN'}
            type="password" inputMode="numeric"
            className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base tracking-widest text-center" />

          {needsSetup && (
            <input
              value={pin2}
              onChange={e => { setPin2(e.target.value.replace(/\D/g, '').slice(0, 8)); setError('') }}
              onKeyDown={e => e.key === 'Enter' && signIn()}
              placeholder="Confirm PIN"
              type="password" inputMode="numeric"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base tracking-widest text-center" />
          )}

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} /> {error}
            </p>
          )}

          <button
            onClick={signIn}
            className="w-full py-3.5 rounded-xl bg-teal-700 text-white font-medium hover:bg-teal-800 text-base transition">
            {needsSetup ? 'Set PIN & sign in' : 'Sign in'}
          </button>

          <p className="text-xs text-stone-400 text-center">
            Accounts are managed by the administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
