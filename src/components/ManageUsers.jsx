import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { UserPlus, User, Trash2, Plus, AlertCircle } from 'lucide-react'
import { ADMIN } from '../App'

export default function ManageUsers({ session, onBack }) {
  const [users, setUsers] = useState([])
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const { data } = await supabase.from('app_users').select('username, pin').order('username')
    if (data) setUsers(data)
  }

  async function addUser() {
    setError('')
    const name = newName.trim()
    if (!name) { setError('Enter a name.'); return }
    if (users.some(u => u.username.toLowerCase() === name.toLowerCase())) { setError('That name is already added.'); return }
    if (newPin && !/^\d{4,8}$/.test(newPin)) { setError('PIN must be 4–8 digits (or leave blank).'); return }
    await supabase.from('app_users').insert({ username: name, pin: newPin || '' })
    setNewName(''); setNewPin('')
    fetchUsers()
  }

  async function removeUser(username) {
    await supabase.from('app_users').delete().eq('username', username)
    fetchUsers()
  }

  async function resetPin(username) {
    await supabase.from('app_users').update({ pin: '' }).eq('username', username)
    fetchUsers()
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 text-white px-6 py-6">
        <h1 className="text-2xl font-bold">Brummana Meet the Generations</h1>
        <p className="text-teal-50 text-sm mt-1">Manage sign-ins</p>
      </div>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="text-lg font-bold flex items-center gap-2"><UserPlus size={20} /> Manage sign-ins</h2>
          <p className="text-sm text-stone-500 mt-1">Add or remove who can sign in. Use "Reset PIN" if someone forgets theirs.</p>
          <div className="mt-4 space-y-2">
            {users.map(u => (
              <div key={u.username} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                <span className="flex items-center gap-2 font-medium flex-wrap">
                  <User size={15} /> {u.username}
                  {u.username === ADMIN && <span className="text-xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">admin</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${u.pin ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{u.pin ? 'PIN set' : 'no PIN yet'}</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {u.pin && <button onClick={() => resetPin(u.username)} className="text-xs text-amber-600 hover:bg-amber-50 px-2 py-1 rounded">Reset PIN</button>}
                  {u.username !== ADMIN && <button onClick={() => removeUser(u.username)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={15} /></button>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New member name"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="PIN (optional)" type="password" inputMode="numeric"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle size={14} /> {error}</p>}
            <button onClick={addUser} className="w-full py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 flex items-center justify-center gap-1.5"><Plus size={17} /> Add member</button>
          </div>
          <button onClick={onBack} className="w-full mt-4 py-2.5 rounded-lg border border-teal-700 text-teal-700 font-medium hover:bg-teal-50">← Back to database</button>
        </div>
      </div>
    </div>
  )
}
