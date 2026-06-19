import { useState, useEffect, useMemo } from 'react'
import {
  Users, BookOpen, BarChart2, FileText, LogOut, UserPlus, KeyRound,
  LayoutDashboard, TrendingUp, TrendingDown, DollarSign,
  MessageCircle, X, Save, AlertCircle, CheckCircle
} from 'lucide-react'
import { ADMIN } from '../constants'
import { supabase } from '../supabase'

function fmt(n, d = 2) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) }
function fmtDay(s) {
  if (!s) return ''
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const MODULES = [
  { key: 'members',  title: 'Member Database',    icon: Users },
  { key: 'accounts', title: 'Account Keeping',    icon: BookOpen },
  { key: 'reports',  title: 'Reports',             icon: BarChart2 },
  { key: 'minutes',  title: 'Minutes of Meeting',  icon: FileText },
]

// ── Change PIN Modal ───────────────────────────────────────────────────────────
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

// ── Main Landing ───────────────────────────────────────────────────────────────
export default function Landing({ session, permissions, onNavigate, onSignOut }) {
  const [showPin, setShowPin] = useState(false)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const accessible = MODULES.filter(m => (permissions[m.key] || 'edit') !== 'none')

  useEffect(() => {
    async function fetchStats() {
      const [{ data: members }, { data: transactions }, { data: recentMembers }, { data: recentTxs }] = await Promise.all([
        supabase.from('members').select('generation, in_group'),
        supabase.from('transactions').select('type, amount_usd, amount_lbp'),
        supabase.from('members').select('name, generation, created_by, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('transactions').select('type, amount_usd, category, transaction_date').order('transaction_date', { ascending: false }).limit(5),
      ])
      setStats({
        members: members || [],
        transactions: transactions || [],
        recentMembers: recentMembers || [],
        recentTxs: recentTxs || [],
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const memberStats = useMemo(() => {
    if (!stats) return null
    const m = stats.members
    return {
      total: m.length,
      inGroup: m.filter(x => x.in_group).length,
      Youth:  m.filter(x => x.generation === 'Youth').length,
      Adult:  m.filter(x => x.generation === 'Adult').length,
      Senior: m.filter(x => x.generation === 'Senior').length,
    }
  }, [stats])

  const finStats = useMemo(() => {
    if (!stats) return null
    const t = stats.transactions
    const inc    = t.filter(x => x.type === 'income').reduce((s, x)  => s + parseFloat(x.amount_usd || 0), 0)
    const exp    = t.filter(x => x.type === 'expense').reduce((s, x) => s + parseFloat(x.amount_usd || 0), 0)
    const incLBP = t.filter(x => x.type === 'income').reduce((s, x)  => s + parseFloat(x.amount_lbp || 0), 0)
    const expLBP = t.filter(x => x.type === 'expense').reduce((s, x) => s + parseFloat(x.amount_lbp || 0), 0)
    return { inc, exp, cash: inc - exp, cashLBP: incLBP - expLBP }
  }, [stats])

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="flex h-screen bg-stone-50 text-stone-800 overflow-hidden">

      {/* ── Sidebar (desktop) ── */}
      <aside className="w-56 bg-teal-900 hidden sm:flex flex-col shrink-0">

        <div className="px-4 py-5 border-b border-white/10">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Brummana MTG</p>
          <p className="text-sm font-medium text-white mt-1 leading-snug">Meet the Generations</p>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-xs font-medium text-white/30 uppercase tracking-wider px-2 mb-2">Modules</p>

          <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium bg-white/10 text-white cursor-default">
            <LayoutDashboard size={16} /> Dashboard
          </div>

          {accessible.map(m => {
            const Icon = m.icon
            const isView = permissions[m.key] === 'view'
            return (
              <button key={m.key} onClick={() => onNavigate(m.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/65 hover:bg-white/10 hover:text-white transition-colors text-left">
                <Icon size={16} />
                <span className="flex-1 truncate">{m.title}</span>
                {isView && <span className="text-xs text-white/35 bg-white/10 px-1.5 py-0.5 rounded">View</span>}
              </button>
            )
          })}

          {session.username === ADMIN && (
            <>
              <p className="text-xs font-medium text-white/30 uppercase tracking-wider px-2 mt-4 mb-2">Admin</p>
              <button onClick={() => onNavigate('manage')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/65 hover:bg-white/10 hover:text-white transition-colors text-left">
                <UserPlus size={16} /> Manage sign-ins
              </button>
            </>
          )}
        </nav>

        <div className="border-t border-white/10 px-2 py-3">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-xs font-medium text-white shrink-0">
              {session.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{session.username}</p>
              <p className="text-xs text-white/35">{session.username === ADMIN ? 'Administrator' : 'Member'}</p>
            </div>
          </div>
          <button onClick={() => setShowPin(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/65 hover:bg-white/10 hover:text-white transition-colors text-left">
            <KeyRound size={16} /> Change PIN
          </button>
          <button onClick={onSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-300/70 hover:bg-white/10 hover:text-red-300 transition-colors text-left">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="sm:hidden fixed top-0 inset-x-0 bg-teal-900 z-10 flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium text-white">Brummana MTG</p>
        <div className="flex gap-1">
          {accessible.map(m => {
            const Icon = m.icon
            return (
              <button key={m.key} onClick={() => onNavigate(m.key)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                <Icon size={18} />
              </button>
            )
          })}
          {session.username === ADMIN && (
            <button onClick={() => onNavigate('manage')} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
              <UserPlus size={18} />
            </button>
          )}
          <button onClick={() => setShowPin(true)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <KeyRound size={18} />
          </button>
          <button onClick={onSignOut} className="p-2 rounded-lg text-red-300/70 hover:text-red-300 hover:bg-white/10">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between shrink-0 mt-12 sm:mt-0">
          <h1 className="text-base font-semibold">Dashboard</h1>
          <span className="text-xs text-stone-400 hidden sm:block">{today}</span>
        </div>

        {/* Dashboard */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {loading ? (
            <div className="text-center text-stone-400 py-20">Loading…</div>
          ) : (
            <>
              {/* Cash on hand banner */}
              <div className="bg-gradient-to-r from-teal-700 to-emerald-600 rounded-xl p-5 text-white flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-1.5"><DollarSign size={11} /> Cash on hand</p>
                  <p className="text-3xl font-bold mt-1">${fmt(finStats?.cash)}</p>
                  <p className="text-sm text-white/55 mt-0.5">{fmt(finStats?.cashLBP, 0)} LBP</p>
                </div>
                <div className="text-right shrink-0 space-y-2.5">
                  <div>
                    <p className="text-xs text-white/50 flex items-center gap-1 justify-end"><TrendingUp size={11} /> Income</p>
                    <p className="text-sm font-semibold">${fmt(finStats?.inc)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 flex items-center gap-1 justify-end"><TrendingDown size={11} /> Expenses</p>
                    <p className="text-sm font-semibold">${fmt(finStats?.exp)}</p>
                  </div>
                </div>
              </div>

              {/* Member stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-white rounded-xl border border-stone-200 p-4">
                  <p className="text-xs font-medium text-stone-400 flex items-center gap-1.5"><Users size={12} /> Members</p>
                  <p className="text-2xl font-bold mt-1">{memberStats?.total}</p>
                  <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1"><MessageCircle size={11} /> {memberStats?.inGroup} in WhatsApp</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                  <p className="text-xs font-medium text-emerald-600">Youth</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-700">{memberStats?.Youth}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">{memberStats?.total ? Math.round(memberStats.Youth / memberStats.total * 100) : 0}% of total</p>
                </div>
                <div className="bg-sky-50 rounded-xl border border-sky-100 p-4">
                  <p className="text-xs font-medium text-sky-600">Adult</p>
                  <p className="text-2xl font-bold mt-1 text-sky-700">{memberStats?.Adult}</p>
                  <p className="text-xs text-sky-500 mt-0.5">{memberStats?.total ? Math.round(memberStats.Adult / memberStats.total * 100) : 0}% of total</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                  <p className="text-xs font-medium text-amber-600">Senior</p>
                  <p className="text-2xl font-bold mt-1 text-amber-700">{memberStats?.Senior}</p>
                  <p className="text-xs text-amber-500 mt-0.5">{memberStats?.total ? Math.round(memberStats.Senior / memberStats.total * 100) : 0}% of total</p>
                </div>
              </div>

              {/* Two-col panels */}
              <div className="grid sm:grid-cols-2 gap-4 mb-4">

                {/* Generation bars */}
                <div className="bg-white rounded-xl border border-stone-200 p-4">
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Members by generation</h3>
                  {[
                    { label: 'Youth',  count: memberStats?.Youth,  bar: 'bg-emerald-500' },
                    { label: 'Adult',  count: memberStats?.Adult,  bar: 'bg-sky-500' },
                    { label: 'Senior', count: memberStats?.Senior, bar: 'bg-amber-400' },
                  ].map(({ label, count, bar }) => (
                    <div key={label} className="flex items-center gap-3 mb-3">
                      <span className="text-xs text-stone-500 w-11 shrink-0">{label}</span>
                      <div className="flex-1 bg-stone-100 rounded-full h-2">
                        <div className={`${bar} h-2 rounded-full transition-all`}
                          style={{ width: memberStats?.total ? `${(count / memberStats.total) * 100}%` : '0%' }} />
                      </div>
                      <span className="text-xs font-medium text-stone-700 w-4 text-right">{count}</span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-stone-400 flex items-center gap-1"><MessageCircle size={11} /> WhatsApp group</span>
                    <span className="font-medium text-emerald-600">{memberStats?.inGroup} / {memberStats?.total}</span>
                  </div>
                </div>

                {/* Recent transactions */}
                <div className="bg-white rounded-xl border border-stone-200 p-4">
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Recent transactions</h3>
                  {stats?.recentTxs?.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-6">No transactions yet.</p>
                  ) : stats?.recentTxs?.map((t, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{t.category}</p>
                        <p className="text-xs text-stone-400">{fmtDay(t.transaction_date)}</p>
                      </div>
                      <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '−'}${fmt(t.amount_usd)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recently added members */}
              {stats?.recentMembers?.length > 0 && (
                <div className="bg-white rounded-xl border border-stone-200 p-4">
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Recently added members</h3>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {stats.recentMembers.map((m, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-medium shrink-0">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <p className="text-xs text-stone-400 truncate">{m.generation} · {m.created_by}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showPin && <ChangePinModal session={session} onClose={() => setShowPin(false)} />}
    </div>
  )
}
