import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { UserPlus, User, Trash2, Plus, AlertCircle, Shield } from 'lucide-react'
import { ADMIN } from '../constants'

const MODULES = [
  { key: 'members',  label: 'Member Database' },
  { key: 'accounts', label: 'Account Keeping' },
  { key: 'minutes',  label: 'Minutes of Meeting' },
  { key: 'pending',  label: 'Pending Members' },
  { key: 'reports',  label: 'Reports' },
]
const LEVELS = ['none', 'view', 'edit']
const LEVEL_COLORS = {
  none: 'bg-stone-100 text-stone-500',
  view: 'bg-sky-100 text-sky-700',
  edit: 'bg-emerald-100 text-emerald-700',
}

export default function ManageUsers({ session, onBack }) {
  const [users, setUsers] = useState([])
  const [permissions, setPermissions] = useState({})
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: u }, { data: p }] = await Promise.all([
      supabase.from('app_users').select('username, pin').order('username'),
      supabase.from('user_permissions').select('username, module, access_level'),
    ])
    if (u) setUsers(u)
    if (p) {
      const map = {}
      p.forEach(r => {
        if (!map[r.username]) map[r.username] = {}
        map[r.username][r.module] = r.access_level
      })
      setPermissions(map)
    }
  }

  async function setPermission(username, module, level) {
    setPermissions(prev => ({
      ...prev,
      [username]: { ...(prev[username] || {}), [module]: level }
    }))
    await supabase.from('user_permissions').upsert(
      { username, module, access_level: level },
      { onConflict: 'username,module' }
    )
  }

  async function addUser() {
    setError('')
    const name = newName.trim()
    if (!name) { setError('Enter a name.'); return }
    if (users.some(u => u.username.toLowerCase() === name.toLowerCase())) { setError('That name is already added.'); return }
    if (newPin && !/^\d{4,8}$/.test(newPin)) { setError('PIN must be 4–8 digits (or leave blank).'); return }
    setSaving(true)
    await supabase.from('app_users').insert({ username: name, pin: newPin || '' })
    await supabase.from('user_permissions').insert([
      { username: name, module: 'members',  access_level: 'edit' },
      { username: name, module: 'accounts', access_level: 'none' },
      { username: name, module: 'minutes',  access_level: 'edit' },
      { username: name, module: 'pending',  access_level: 'edit' },
      { username: name, module: 'reports',  access_level: 'view' },
    ])
    setNewName(''); setNewPin('')
    setSaving(false)
    fetchAll()
  }

  async function removeUser(username) {
    await supabase.from('user_permissions').delete().eq('username', username)
    await supabase.from('app_users').delete().eq('username', username)
    fetchAll()
  }

  async function resetPin(username) {
    await supabase.from('app_users').update({ pin: '' }).eq('username', username)
    fetchAll()
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 text-white px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold">Brummana Meet the Generations</h1>
          <p className="text-teal-50 text-sm mt-1">Manage sign-ins & permissions</p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-1"><Shield size={18} /> Users & module access</h2>
          <p className="text-sm text-stone-500 mb-4">
            <strong>None</strong> hides the module · <strong>View</strong> is read-only · <strong>Edit</strong> is full access
          </p>
          <div className="space-y-4">
            {users.map(u => (
              <div key={u.username} className="rounded-xl border border-stone-200 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2 font-medium flex-wrap">
                    <User size={15} /> {u.username}
                    {u.username === ADMIN && <span className="text-xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">admin</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${u.pin ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {u.pin ? 'PIN set' : 'no PIN yet'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {u.pin && (
                      <button onClick={() => resetPin(u.username)} className="text-xs text-amber-600 hover:bg-amber-50 px-2 py-1 rounded">Reset PIN</button>
                    )}
                    {u.username !== ADMIN && (
                      <button onClick={() => removeUser(u.username)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded">Remove</button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {MODULES.map(mod => (
                    <div key={mod.key}>
                      <div className="text-xs text-stone-400 font-medium mb-1">{mod.label}</div>
                      <div className="flex gap-1">
                        {LEVELS.map(lvl => (
                          <button key={lvl} onClick={() => setPermission(u.username, mod.key, lvl)}
                            className={`flex-1 py-1 rounded-lg border text-xs font-medium capitalize transition ${
                              (permissions[u.username]?.[mod.key] || 'none') === lvl
                                ? `${LEVEL_COLORS[lvl]} border-transparent`
                                : 'border-stone-200 text-stone-400 hover:bg-stone-50'
                            }`}>
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><UserPlus size={18} /> Add new user</h2>
          <div className="space-y-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name (e.g. Maya.K)"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="PIN (optional, 4–8 digits)" type="password" inputMode="numeric"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle size={14} /> {error}</p>}
            <button onClick={addUser} disabled={saving}
              className="w-full py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 flex items-center justify-center gap-1.5 disabled:opacity-60">
              <Plus size={17} /> Add user
            </button>
          </div>
        </div>

        <button onClick={onBack} className="w-full py-2.5 rounded-lg border border-teal-700 text-teal-700 font-medium hover:bg-teal-50">
          ← Back to home
        </button>
      </div>
    </div>
  )
}
