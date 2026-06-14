import { Users, BookOpen, BarChart2, LogOut, UserPlus, User, Eye, KeyRound } from 'lucide-react'
import { ADMIN } from '../constants'
import { useState } from 'react'
import { supabase } from '../supabase'
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react'

const MODULES = [
  {
    key: 'members',
    title: 'Member Database',
    description: 'Manage committee members — contact info, generation, WhatsApp status and more.',
    icon: Users,
    color: 'from-teal-500 to-emerald-500',
  },
  {
    key: 'accounts',
    title: 'Account Keeping',
    description: 'Track income, expenses, receipts and cash on hand in USD and LBP.',
    icon: BookOpen,
    color: 'from-sky-500 to-blue-600',
  },
  {
    key: 'reports',
    title: 'Reports',
    description: 'Members report, profit & loss, and activity report by event or committee member.',
    icon: BarChart2,
    color: 'from-purple-500 to-violet-600',
  },
]

function ChangePinModal({ session, onClose }) {
  const [oldPin, setOldPin] = useState('')
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })

  async function changePin() {
    setMsg({ type: '', text: '' })
    const { data: u } = await supabase.from('app_users').select('pin').eq('username', session.username).single()
    if (!u || oldPin !== u.pin) { setMsg({ type: 'error', text: 'Current PIN is incorrect.' }); return }
    if (!/^\d{4,8}$/.test(pin1)) { setMsg({ type: 'error', text: 'New PIN must be 4–8 digits.' }); return }
    if (pin1 !== pin2) { setMsg({ type: 'error', text: "New PINs don't match." }); return }
    await supabase.from('app_users').update({ pin: pin1 }).eq('username', session.username)
    setMsg({ type: 'success', text: 'PIN updated successfully.' })
    setOldPin(''); setPin1(''); setPin2('')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><KeyRound size={18} /> Change PIN</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <input value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Current PIN" type="password" inputMode="numeric" className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <input value={pin1} onChange={e => setPin1(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="New PIN (4–8 digits)" type="password" inputMode="numeric" className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <input value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Confirm new PIN" type="password" inputMode="numeric" className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          {msg.text && <p className={`text-sm flex items-center gap-1.5 ${msg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {msg.text}</p>}
        </div>
        <button onClick={changePin} className="w-full mt-4 py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 flex items-center justify-center gap-1.5"><Save size={16} /> Update PIN</button>
      </div>
    </div>
  )
}

export default function Landing({ session, permissions, onNavigate, onSignOut }) {
  const [showPin, setShowPin] = useState(false)
  const accessible = MODULES.filter(m => permissions[m.key] && permissions[m.key] !== 'none')

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">Brummana Meet the Generations</h1>
          <p className="text-teal-100 mt-1">Building bonds across generations 🌿</p>
          <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
            <span className="text-sm text-teal-50">Welcome, <strong>{session.username}</strong></span>
            <div className="flex gap-4 flex-wrap">
              {session.isAdmin && (
                <button onClick={() => onNavigate('manage')} className="text-sm flex items-center gap-1.5 text-teal-50 hover:text-white">
                  <UserPlus size={15} /> Manage sign-ins
                </button>
              )}
              <button onClick={() => setShowPin(true)} className="text-sm flex items-center gap-1.5 text-teal-50 hover:text-white">
                <KeyRound size={15} /> Change PIN
              </button>
              <button onClick={onSignOut} className="text-sm flex items-center gap-1.5 text-teal-50 hover:text-white">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-4">Select a module</h2>
        {accessible.length === 0 ? (
          <div className="text-center text-stone-400 py-20">You don't have access to any modules yet. Contact the administrator.</div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            {accessible.map(m => {
              const Icon = m.icon
              const isView = permissions[m.key] === 'view'
              return (
                <button key={m.key} onClick={() => onNavigate(m.key)}
                  className="text-left bg-white rounded-2xl border border-stone-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-4`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold group-hover:text-teal-700 transition-colors">{m.title}</h3>
                    {isView && (
                      <span className="shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">
                        <Eye size={11} /> View only
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500 mt-1">{m.description}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showPin && <ChangePinModal session={session} onClose={() => setShowPin(false)} />}
    </div>
  )
}
