import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { ArrowLeft, Users, TrendingUp, TrendingDown, BarChart2, ChevronRight, MapPin, User, Briefcase, MessageCircle, Calendar, DollarSign } from 'lucide-react'

const GENERATIONS = ['Youth', 'Adult', 'Senior']
const GEN_COLORS = {
  Youth: 'bg-emerald-100 text-emerald-800',
  Adult: 'bg-sky-100 text-sky-800',
  Senior: 'bg-amber-100 text-amber-800',
}

function fmt(n, d = 2) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) }
function fmtDay(s) { if (!s) return ''; return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }

function Stat({ label, value, sub, color = 'stone' }) {
  const colors = {
    stone: 'bg-white border-stone-200 text-stone-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-600',
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-stone-500 mb-1"><span>{label}</span><span className="font-medium text-stone-700">{value}</span></div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, color = 'teal' }) {
  const colors = {
    teal: 'text-teal-700 border-teal-200 bg-teal-50',
    sky: 'text-sky-700 border-sky-200 bg-sky-50',
    purple: 'text-purple-700 border-purple-200 bg-purple-50',
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold ${colors[color]} mb-3`}>
      <Icon size={16} /> {title}
    </div>
  )
}

// ── Members Report ────────────────────────────────────────────────────────────
function MembersReport({ members }) {
  const byGen = useMemo(() => { const m = {}; GENERATIONS.forEach(g => { m[g] = members.filter(x => x.generation === g).length }); return m }, [members])
  const byRes = useMemo(() => { const m = {}; members.forEach(x => { m[x.residence] = (m[x.residence] || 0) + 1 }); return Object.entries(m).sort((a, b) => b[1] - a[1]) }, [members])
  const byUser = useMemo(() => { const m = {}; members.forEach(x => { m[x.created_by] = (m[x.created_by] || 0) + 1 }); return Object.entries(m).sort((a, b) => b[1] - a[1]) }, [members])
  const inGroup = members.filter(m => m.in_group).length
  const maxRes = byRes.length > 0 ? byRes[0][1] : 1
  const maxUser = byUser.length > 0 ? byUser[0][1] : 1

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total Members" value={members.length} />
        <Stat label="In WhatsApp" value={inGroup} sub={`${members.length > 0 ? Math.round((inGroup / members.length) * 100) : 0}% of total`} color="emerald" />
        <Stat label="Not in Group" value={members.length - inGroup} color="amber" />
        <Stat label="Residences" value={byRes.length} sub="distinct areas" />
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <SectionHeader icon={Users} title="By Generation" color="teal" />
          <div className="space-y-3">{GENERATIONS.map(g => <Bar key={g} label={g} value={byGen[g] || 0} max={members.length} color={g === 'Youth' ? 'bg-emerald-400' : g === 'Adult' ? 'bg-sky-400' : 'bg-amber-400'} />)}</div>
        </div>
        <div>
          <SectionHeader icon={MapPin} title="By Residence" color="teal" />
          <div className="space-y-3">{byRes.map(([r, v]) => <Bar key={r} label={r} value={v} max={maxRes} color="bg-teal-400" />)}</div>
        </div>
      </div>
      <div>
        <SectionHeader icon={User} title="Added by committee member" color="teal" />
        <div className="grid sm:grid-cols-2 gap-3">{byUser.map(([u, v]) => <Bar key={u} label={u} value={v} max={maxUser} color="bg-stone-400" />)}</div>
      </div>
      <div>
        <SectionHeader icon={Briefcase} title="Member list" color="teal" />
        <div className="space-y-2">{members.map(m => (
          <div key={m.id} className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <span className="font-medium">{m.name}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${GEN_COLORS[m.generation]}`}>{m.generation}</span>
              {m.in_group && <span className="ml-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 inline-flex"><MessageCircle size={10} /> WA</span>}
            </div>
            <div className="text-xs text-stone-400 text-right"><div>{m.residence}</div><div>{m.occupation}</div></div>
          </div>
        ))}</div>
      </div>
    </div>
  )
}

// ── P&L Report ────────────────────────────────────────────────────────────────
function PLReport({ transactions, events }) {
  const [scope, setScope] = useState('all')
  const src = useMemo(() => scope === 'all' ? transactions : transactions.filter(t => t.event_id === scope), [transactions, scope])
  const incByCat = useMemo(() => { const m = {}; src.filter(t => t.type === 'income').forEach(t => { if (!m[t.category]) m[t.category] = { usd: 0, lbp: 0 }; m[t.category].usd += parseFloat(t.amount_usd || 0); m[t.category].lbp += parseFloat(t.amount_lbp || 0) }); return Object.entries(m).sort((a, b) => b[1].usd - a[1].usd) }, [src])
  const expByCat = useMemo(() => { const m = {}; src.filter(t => t.type === 'expense').forEach(t => { if (!m[t.category]) m[t.category] = { usd: 0, lbp: 0 }; m[t.category].usd += parseFloat(t.amount_usd || 0); m[t.category].lbp += parseFloat(t.amount_lbp || 0) }); return Object.entries(m).sort((a, b) => b[1].usd - a[1].usd) }, [src])
  const totInc = useMemo(() => src.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount_usd || 0), 0), [src])
  const totExp = useMemo(() => src.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount_usd || 0), 0), [src])
  const totIncLBP = useMemo(() => src.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount_lbp || 0), 0), [src])
  const totExpLBP = useMemo(() => src.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount_lbp || 0), 0), [src])
  const net = totInc - totExp
  const netLBP = totIncLBP - totExpLBP

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-stone-600 block mb-1">Report scope</label>
        <select value={scope} onChange={e => setScope(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
          <option value="all">All Operations</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total Income" value={`$${fmt(totInc)}`} sub={`${fmt(totIncLBP, 0)} LBP`} color="emerald" />
        <Stat label="Total Expenses" value={`$${fmt(totExp)}`} sub={`${fmt(totExpLBP, 0)} LBP`} color="red" />
        <Stat label={net >= 0 ? 'Net Surplus' : 'Net Deficit'} value={`$${fmt(Math.abs(net))}`} sub={`${fmt(Math.abs(netLBP), 0)} LBP`} color={net >= 0 ? 'emerald' : 'red'} />
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <SectionHeader icon={TrendingUp} title="Income by category" color="sky" />
          {incByCat.length === 0 ? <p className="text-sm text-stone-400 py-3">No income.</p>
            : <table className="w-full text-sm">
                <thead><tr className="text-xs text-stone-400"><th className="text-left py-1">Category</th><th className="text-right py-1">USD</th><th className="text-right py-1">LBP</th></tr></thead>
                <tbody>
                  {incByCat.map(([cat, v]) => <tr key={cat} className="border-t border-stone-50"><td className="py-1.5 text-stone-600">{cat}</td><td className="py-1.5 text-right font-medium">${fmt(v.usd)}</td><td className="py-1.5 text-right text-xs text-stone-400">{fmt(v.lbp, 0)}</td></tr>)}
                  <tr className="border-t-2 border-emerald-200 font-bold text-emerald-700"><td className="py-2">Total</td><td className="py-2 text-right">${fmt(totInc)}</td><td className="py-2 text-right text-xs">{fmt(totIncLBP, 0)}</td></tr>
                </tbody>
              </table>}
        </div>
        <div>
          <SectionHeader icon={TrendingDown} title="Expenses by category" color="sky" />
          {expByCat.length === 0 ? <p className="text-sm text-stone-400 py-3">No expenses.</p>
            : <table className="w-full text-sm">
                <thead><tr className="text-xs text-stone-400"><th className="text-left py-1">Category</th><th className="text-right py-1">USD</th><th className="text-right py-1">LBP</th></tr></thead>
                <tbody>
                  {expByCat.map(([cat, v]) => <tr key={cat} className="border-t border-stone-50"><td className="py-1.5 text-stone-600">{cat}</td><td className="py-1.5 text-right font-medium">${fmt(v.usd)}</td><td className="py-1.5 text-right text-xs text-stone-400">{fmt(v.lbp, 0)}</td></tr>)}
                  <tr className="border-t-2 border-red-200 font-bold text-red-600"><td className="py-2">Total</td><td className="py-2 text-right">${fmt(totExp)}</td><td className="py-2 text-right text-xs">{fmt(totExpLBP, 0)}</td></tr>
                </tbody>
              </table>}
        </div>
      </div>
      <div className={`rounded-2xl p-4 ${net >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-base font-bold ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{net >= 0 ? 'Net Surplus' : 'Net Deficit'}</span>
          <div className="text-right">
            <div className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>${fmt(Math.abs(net))}</div>
            <div className="text-xs text-stone-400">{fmt(Math.abs(netLBP), 0)} LBP</div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-stone-200 grid grid-cols-2 gap-2 text-xs text-stone-500">
          <div>Transactions: <strong>{src.length}</strong></div>
          <div>Income entries: <strong>{src.filter(t => t.type === 'income').length}</strong></div>
          <div>Expense entries: <strong>{src.filter(t => t.type === 'expense').length}</strong></div>
          <div>Margin: <strong>{totInc > 0 ? fmt((net / totInc) * 100, 1) : 0}%</strong></div>
        </div>
      </div>
    </div>
  )
}

// ── Activity Report ───────────────────────────────────────────────────────────
function ActivityReport({ transactions, events }) {
  const byUser = useMemo(() => {
    const m = {}
    transactions.forEach(t => { if (!m[t.created_by]) m[t.created_by] = { count: 0, usd: 0 }; m[t.created_by].count++; m[t.created_by].usd += parseFloat(t.amount_usd || 0) })
    return Object.entries(m).sort((a, b) => b[1].count - a[1].count)
  }, [transactions])

  const byEvent = useMemo(() => events.map(ev => {
    const txs = transactions.filter(t => t.event_id === ev.id)
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount_usd || 0), 0)
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount_usd || 0), 0)
    return { ...ev, count: txs.length, inc, exp, net: inc - exp }
  }), [transactions, events])

  const noEvent = transactions.filter(t => !t.event_id)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total Transactions" value={transactions.length} />
        <Stat label="Linked to Events" value={transactions.filter(t => t.event_id).length} color="sky" />
        <Stat label="No Event" value={noEvent.length} color="amber" />
        <Stat label="Events" value={events.length} />
      </div>
      <div>
        <SectionHeader icon={Calendar} title="By event" color="purple" />
        {byEvent.length === 0 ? <p className="text-sm text-stone-400 py-3">No events yet.</p>
          : <div className="space-y-3">{byEvent.map(ev => (
              <div key={ev.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div><p className="font-semibold">{ev.name}</p>{ev.date && <p className="text-xs text-stone-400 mt-0.5">{fmtDay(ev.date)}</p>}</div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center"><div className="font-bold text-emerald-600">${fmt(ev.inc)}</div><div className="text-xs text-stone-400">income</div></div>
                    <div className="text-center"><div className="font-bold text-red-500">${fmt(ev.exp)}</div><div className="text-xs text-stone-400">expenses</div></div>
                    <div className="text-center"><div className={`font-bold ${ev.net >= 0 ? 'text-teal-600' : 'text-red-600'}`}>${fmt(Math.abs(ev.net))}</div><div className="text-xs text-stone-400">{ev.net >= 0 ? 'surplus' : 'deficit'}</div></div>
                  </div>
                </div>
              </div>
            ))}</div>}
      </div>
      <div>
        <SectionHeader icon={User} title="Transactions by committee member" color="purple" />
        <div className="space-y-2">{byUser.map(([u, v]) => (
          <div key={u} className="flex items-center justify-between bg-white rounded-xl border border-stone-200 px-4 py-3">
            <span className="font-medium">{u}</span>
            <div className="flex gap-4 text-sm text-stone-500">
              <span><strong className="text-stone-700">{v.count}</strong> transactions</span>
              <span><strong className="text-stone-700">${fmt(v.usd)}</strong> total</span>
            </div>
          </div>
        ))}</div>
      </div>
    </div>
  )
}

// ── Module shell ──────────────────────────────────────────────────────────────
const REPORTS = [
  { key: 'members',  label: 'Members Report',  desc: 'Breakdown by generation, residence, WhatsApp status and who added them.', icon: Users,     color: 'from-teal-500 to-emerald-500' },
  { key: 'pl',       label: 'Profit & Loss',   desc: 'Income vs expenses by category, per event or all operations.',            icon: TrendingUp, color: 'from-sky-500 to-blue-600' },
  { key: 'activity', label: 'Activity Report', desc: 'Transaction activity by event and by committee member.',                   icon: BarChart2,  color: 'from-purple-500 to-violet-600' },
]

export default function ReportsModule({ session, permissions, onBack }) {
  const [active, setActive] = useState(null)
  const [members, setMembers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [{ data: m }, { data: t }, { data: e }] = await Promise.all([
        supabase.from('members').select('*').order('name'),
        supabase.from('transactions').select('*').order('transaction_date', { ascending: false }),
        supabase.from('events').select('*').order('date', { ascending: true }),
      ])
      if (m) setMembers(m)
      if (t) setTransactions(t)
      if (e) setEvents(e)
      setLoading(false)
    }
    fetchAll()
  }, [])

  const report = REPORTS.find(r => r.key === active)

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={active ? () => setActive(null) : onBack} className="p-2 rounded-lg hover:bg-purple-500 transition"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-purple-100 text-sm">{active ? report?.label : 'Brummana Meet the Generations'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {loading ? <div className="text-center text-stone-400 py-16">Loading…</div>
          : !active ? (
            <>
              <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-4">Choose a report</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {REPORTS.map(r => {
                  const Icon = r.icon
                  return (
                    <button key={r.key} onClick={() => setActive(r.key)}
                      className="text-left bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-3`}><Icon size={22} className="text-white" /></div>
                      <h3 className="font-bold group-hover:text-purple-700 transition-colors">{r.label}</h3>
                      <p className="text-xs text-stone-500 mt-1">{r.desc}</p>
                      <div className="flex items-center gap-1 text-xs text-purple-500 mt-3 font-medium">View report <ChevronRight size={13} /></div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div>
              <button onClick={() => setActive(null)} className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1 mb-4"><ArrowLeft size={14} /> All reports</button>
              {active === 'members'  && <MembersReport members={members} />}
              {active === 'pl'       && <PLReport transactions={transactions} events={events} />}
              {active === 'activity' && <ActivityReport transactions={transactions} events={events} />}
            </div>
          )}
      </div>
    </div>
  )
}
