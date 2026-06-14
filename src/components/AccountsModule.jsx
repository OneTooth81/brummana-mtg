import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import {
  ArrowLeft, Plus, Download, Search, TrendingUp, TrendingDown,
  DollarSign, Eye, Pencil, Trash2, X, Save, AlertCircle,
  History, RotateCcw, CheckCircle, Settings, Calendar, Tag
} from 'lucide-react'
import { ADMIN, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants'

function fmt(n, d = 2) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) }
function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDay(s) {
  if (!s) return ''
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Manage Modal ──────────────────────────────────────────────────────────────
function ManageModal({ incomeCategories, setIncomeCategories, expenseCategories, setExpenseCategories, events, setEvents, onClose }) {
  const [tab, setTab] = useState('income')
  const [newIncome, setNewIncome] = useState('')
  const [newExpense, setNewExpense] = useState('')
  const [newEvent, setNewEvent] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1500) }
  function setErr(k, v) { setErrors(p => ({ ...p, [k]: v })) }

  async function addIncome() {
    const v = newIncome.trim()
    if (!v) { setErr('income', 'Enter a name.'); return }
    if (incomeCategories.map(c => c.toLowerCase()).includes(v.toLowerCase())) { setErr('income', 'Already exists.'); return }
    const next = [...incomeCategories, v]
    setIncomeCategories(next)
    await supabase.from('app_settings').upsert({ key: 'income_categories', value: JSON.stringify(next) }, { onConflict: 'key' })
    setNewIncome(''); setErr('income', ''); flash()
  }
  async function removeIncome(cat) {
    if (INCOME_CATEGORIES.includes(cat)) return
    const next = incomeCategories.filter(c => c !== cat)
    setIncomeCategories(next)
    await supabase.from('app_settings').upsert({ key: 'income_categories', value: JSON.stringify(next) }, { onConflict: 'key' })
    flash()
  }
  async function addExpense() {
    const v = newExpense.trim()
    if (!v) { setErr('expense', 'Enter a name.'); return }
    if (expenseCategories.map(c => c.toLowerCase()).includes(v.toLowerCase())) { setErr('expense', 'Already exists.'); return }
    const next = [...expenseCategories, v]
    setExpenseCategories(next)
    await supabase.from('app_settings').upsert({ key: 'expense_categories', value: JSON.stringify(next) }, { onConflict: 'key' })
    setNewExpense(''); setErr('expense', ''); flash()
  }
  async function removeExpense(cat) {
    if (EXPENSE_CATEGORIES.includes(cat)) return
    const next = expenseCategories.filter(c => c !== cat)
    setExpenseCategories(next)
    await supabase.from('app_settings').upsert({ key: 'expense_categories', value: JSON.stringify(next) }, { onConflict: 'key' })
    flash()
  }
  async function addEvent() {
    const v = newEvent.trim()
    if (!v) { setErr('event', 'Enter a name.'); return }
    if (events.some(e => e.name.toLowerCase() === v.toLowerCase())) { setErr('event', 'Already exists.'); return }
    const { data } = await supabase.from('events').insert({ name: v, date: newEventDate || null }).select().single()
    if (data) setEvents(p => [...p, data])
    setNewEvent(''); setNewEventDate(''); setErr('event', ''); flash()
  }
  async function removeEvent(id) {
    await supabase.from('events').delete().eq('id', id)
    setEvents(p => p.filter(e => e.id !== id)); flash()
  }

  const TABS = [{ key: 'income', label: 'Income cats' }, { key: 'expense', label: 'Expense cats' }, { key: 'events', label: 'Events' }]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={18} /> Manage</h2>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle size={13} /> Saved</span>}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={20} /></button>
          </div>
        </div>
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-5">
          {TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>{t.label}</button>)}
        </div>

        {tab === 'income' && (
          <div>
            <div className="space-y-2 mb-3">
              {incomeCategories.map(cat => (
                <div key={cat} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{cat}</span>
                  {INCOME_CATEGORIES.includes(cat) ? <span className="text-xs text-stone-400">default</span>
                    : <button onClick={() => removeIncome(cat)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newIncome} onChange={e => { setNewIncome(e.target.value); setErr('income', '') }} onKeyDown={e => e.key === 'Enter' && addIncome()} placeholder="New income category…" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
              <button onClick={addIncome} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"><Plus size={16} /> Add</button>
            </div>
            {errors.income && <p className="text-xs text-red-600 mt-1">{errors.income}</p>}
          </div>
        )}

        {tab === 'expense' && (
          <div>
            <div className="space-y-2 mb-3">
              {expenseCategories.map(cat => (
                <div key={cat} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{cat}</span>
                  {EXPENSE_CATEGORIES.includes(cat) ? <span className="text-xs text-stone-400">default</span>
                    : <button onClick={() => removeExpense(cat)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newExpense} onChange={e => { setNewExpense(e.target.value); setErr('expense', '') }} onKeyDown={e => e.key === 'Enter' && addExpense()} placeholder="New expense category…" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
              <button onClick={addExpense} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"><Plus size={16} /> Add</button>
            </div>
            {errors.expense && <p className="text-xs text-red-600 mt-1">{errors.expense}</p>}
          </div>
        )}

        {tab === 'events' && (
          <div>
            <p className="text-sm text-stone-500 mb-3">Events can be linked to any transaction to track income and expenses per event.</p>
            <div className="space-y-2 mb-3">
              {events.length === 0 ? <p className="text-sm text-stone-400 text-center py-4">No events yet.</p>
                : events.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{ev.name}</span>
                      {ev.date && <span className="text-xs text-stone-400 ml-2">{fmtDay(ev.date)}</span>}
                    </div>
                    <button onClick={() => removeEvent(ev.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                  </div>
                ))}
            </div>
            <div className="space-y-2">
              <input value={newEvent} onChange={e => { setNewEvent(e.target.value); setErr('event', '') }} onKeyDown={e => e.key === 'Enter' && addEvent()} placeholder="Event name…" className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              {errors.event && <p className="text-xs text-red-600">{errors.event}</p>}
              <button onClick={addEvent} className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"><Plus size={16} /> Add event</button>
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50">Done</button>
      </div>
    </div>
  )
}

// ── Transaction Form ──────────────────────────────────────────────────────────
function TxForm({ tx, incomeCategories, expenseCategories, events, lastRate, onSave, onClose }) {
  const [form, setForm] = useState(tx ? {
    type: tx.type, category: tx.category, event_id: tx.event_id || '',
    description: tx.description || '', amount_usd: tx.amount_usd,
    exchange_rate: tx.exchange_rate, transaction_date: tx.transaction_date, receipt_ref: tx.receipt_ref || ''
  } : {
    type: 'income', category: incomeCategories[0], event_id: '',
    description: '', amount_usd: '', exchange_rate: lastRate || '',
    transaction_date: new Date().toISOString().split('T')[0], receipt_ref: ''
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const cats = form.type === 'income' ? incomeCategories : expenseCategories
  const lbp = form.amount_usd && form.exchange_rate ? Math.round(parseFloat(form.amount_usd) * parseFloat(form.exchange_rate)) : null

  async function handleSave() {
    setError('')
    if (!form.amount_usd || isNaN(parseFloat(form.amount_usd))) { setError('Enter a valid amount.'); return }
    if (!form.exchange_rate || isNaN(parseFloat(form.exchange_rate))) { setError('Enter a valid exchange rate.'); return }
    if (!form.transaction_date) { setError('Select a date.'); return }
    setSaving(true)
    const res = await onSave({ ...form, amount_usd: parseFloat(form.amount_usd), exchange_rate: parseFloat(form.exchange_rate) })
    setSaving(false)
    if (res?.error) setError(res.error)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{tx ? 'Edit transaction' : 'Add transaction'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div><label className="text-sm font-medium text-stone-600">Type</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => { f('type', 'income'); f('category', incomeCategories[0]) }} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${form.type === 'income' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-300 text-stone-500 hover:bg-stone-50'}`}>Income</button>
              <button onClick={() => { f('type', 'expense'); f('category', expenseCategories[0]) }} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${form.type === 'expense' ? 'border-red-500 bg-red-50 text-red-700' : 'border-stone-300 text-stone-500 hover:bg-stone-50'}`}>Expense</button>
            </div>
          </div>
          <div><label className="text-sm font-medium text-stone-600">Category</label>
            <select value={form.category} onChange={e => f('category', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="text-sm font-medium text-stone-600 flex items-center gap-1.5"><Calendar size={13} /> Linked event <span className="text-stone-400 font-normal">(optional)</span></label>
            <select value={form.event_id} onChange={e => f('event_id', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">— No event —</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}{ev.date ? ` (${fmtDay(ev.date)})` : ''}</option>)}
            </select>
          </div>
          <div><label className="text-sm font-medium text-stone-600">Description</label>
            <input value={form.description} onChange={e => f('description', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Optional" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-stone-600">Amount (USD)</label>
              <input type="number" min="0" step="0.01" value={form.amount_usd} onChange={e => f('amount_usd', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="0.00" /></div>
            <div><label className="text-sm font-medium text-stone-600">Exchange rate</label>
              <input type="number" min="0" step="1" value={form.exchange_rate} onChange={e => f('exchange_rate', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. 89500" /></div>
          </div>
          {lbp !== null && <p className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">≈ <strong>{lbp.toLocaleString()} LBP</strong></p>}
          <div><label className="text-sm font-medium text-stone-600">Date</label>
            <input type="date" value={form.transaction_date} onChange={e => f('transaction_date', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
          <div><label className="text-sm font-medium text-stone-600">Receipt / reference #</label>
            <input value={form.receipt_ref} onChange={e => f('receipt_ref', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Optional" /></div>
          {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle size={15} /> {error}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 disabled:opacity-60">
            <Save size={17} /> {saving ? 'Saving…' : tx ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── History Panel ─────────────────────────────────────────────────────────────
function HistoryPanel({ tx, session, onRollback, onClose }) {
  const [history, setHistory] = useState([])
  useEffect(() => {
    supabase.from('transaction_history').select('*').eq('transaction_id', tx.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setHistory(data) })
  }, [tx.id])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold flex items-center gap-2"><History size={18} /> Transaction history</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={20} /></button>
        </div>
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-3">
          <div className="text-xs font-semibold text-teal-700 flex items-center gap-1.5"><CheckCircle size={13} /> CURRENT VERSION</div>
          <div className="text-xs text-stone-600 mt-1 space-y-0.5">
            <div><span className="text-stone-400">Type:</span> {tx.type}</div>
            <div><span className="text-stone-400">Category:</span> {tx.category}</div>
            <div><span className="text-stone-400">Amount:</span> ${fmt(tx.amount_usd)} / {fmt(tx.amount_lbp, 0)} LBP</div>
            <div><span className="text-stone-400">Date:</span> {fmtDay(tx.transaction_date)}</div>
            {tx.description && <div><span className="text-stone-400">Description:</span> {tx.description}</div>}
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {history.length === 0 ? <p className="text-sm text-stone-400 text-center py-4">No previous versions yet.</p>
            : history.map((v, i) => (
              <div key={v.id} className="rounded-xl border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="text-xs font-semibold text-stone-500">VERSION {i + 1} <span className="font-normal text-stone-400">· replaced by {v.edited_by} on {fmtDate(v.created_at)}</span></div>
                  {session.username === ADMIN
                    ? <button onClick={() => onRollback(tx.id, v)} className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-700 text-white hover:bg-teal-800"><RotateCcw size={12} /> Roll back</button>
                    : <span className="text-xs text-stone-400">Admin only</span>}
                </div>
                <div className="text-xs text-stone-600 space-y-0.5">
                  <div><span className="text-stone-400">Type:</span> {v.type}</div>
                  <div><span className="text-stone-400">Category:</span> {v.category}</div>
                  <div><span className="text-stone-400">Amount:</span> ${fmt(v.amount_usd)} @ {fmt(v.exchange_rate, 0)}</div>
                  <div><span className="text-stone-400">Date:</span> {fmtDay(v.transaction_date)}</div>
                  {v.description && <div><span className="text-stone-400">Description:</span> {v.description}</div>}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Module ───────────────────────────────────────────────────────────────
export default function AccountsModule({ session, permissions, onBack }) {
  const canEdit = permissions['accounts'] === 'edit'
  const [transactions, setTransactions] = useState([])
  const [events, setEvents] = useState([])
  const [incomeCategories, setIncomeCategories] = useState([...INCOME_CATEGORIES])
  const [expenseCategories, setExpenseCategories] = useState([...EXPENSE_CATEGORIES])
  const [lastRate, setLastRate] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [eventFilter, setEventFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [historyTx, setHistoryTx] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: txs }, { data: evs }, { data: settings }] = await Promise.all([
      supabase.from('transactions').select('*').order('transaction_date', { ascending: false }),
      supabase.from('events').select('*').order('date', { ascending: true }),
      supabase.from('app_settings').select('key, value'),
    ])
    if (txs) setTransactions(txs)
    if (evs) setEvents(evs)
    if (settings) {
      const inc = settings.find(s => s.key === 'income_categories')
      const exp = settings.find(s => s.key === 'expense_categories')
      const rate = settings.find(s => s.key === 'exchange_rate')
      if (inc) setIncomeCategories(JSON.parse(inc.value))
      if (exp) setExpenseCategories(JSON.parse(exp.value))
      if (rate) setLastRate(rate.value)
    }
    setLoading(false)
  }

  const filtered = useMemo(() => transactions
    .filter(t => typeFilter === 'All' || t.type === typeFilter)
    .filter(t => eventFilter === 'All' || t.event_id === eventFilter)
    .filter(t => { const q = search.toLowerCase().trim(); if (!q) return true; return (t.description || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q) || (t.receipt_ref || '').toLowerCase().includes(q) })
  , [transactions, typeFilter, eventFilter, search])

  const totals = useMemo(() => {
    const src = eventFilter === 'All' ? transactions : transactions.filter(t => t.event_id === eventFilter)
    const inc = src.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount_usd || 0), 0)
    const exp = src.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount_usd || 0), 0)
    const incLBP = src.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount_lbp || 0), 0)
    const expLBP = src.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount_lbp || 0), 0)
    return { inc, exp, cash: inc - exp, incLBP, expLBP, cashLBP: incLBP - expLBP }
  }, [transactions, eventFilter])

  async function saveTx(form, editingId) {
    if (editingId) {
      const existing = transactions.find(t => t.id === editingId)
      if (existing) {
        const snap = { transaction_id: editingId, type: existing.type, category: existing.category, description: existing.description, amount_usd: existing.amount_usd, exchange_rate: existing.exchange_rate, transaction_date: existing.transaction_date, receipt_ref: existing.receipt_ref, edited_by: session.username }
        const { data: hist } = await supabase.from('transaction_history').select('id, created_at').eq('transaction_id', editingId).order('created_at', { ascending: false })
        if (hist && hist.length >= 2) await supabase.from('transaction_history').delete().eq('id', hist[hist.length - 1].id)
        await supabase.from('transaction_history').insert(snap)
      }
      const { error } = await supabase.from('transactions').update({ ...form, last_edited_by: session.username, last_edited_at: new Date().toISOString() }).eq('id', editingId)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('transactions').insert({ ...form, created_by: session.username, created_at: new Date().toISOString() })
      if (error) return { error: error.message }
    }
    await supabase.from('app_settings').upsert({ key: 'exchange_rate', value: String(form.exchange_rate) }, { onConflict: 'key' })
    await fetchAll()
    return { error: null }
  }

  async function deleteTx(id) {
    await supabase.from('transaction_history').delete().eq('transaction_id', id)
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  async function rollbackTo(txId, version) {
    const existing = transactions.find(t => t.id === txId)
    if (existing) {
      const snap = { transaction_id: txId, type: existing.type, category: existing.category, description: existing.description, amount_usd: existing.amount_usd, exchange_rate: existing.exchange_rate, transaction_date: existing.transaction_date, receipt_ref: existing.receipt_ref, edited_by: session.username }
      const { data: hist } = await supabase.from('transaction_history').select('id, created_at').eq('transaction_id', txId).order('created_at', { ascending: false })
      if (hist && hist.length >= 2) await supabase.from('transaction_history').delete().eq('id', hist[hist.length - 1].id)
      await supabase.from('transaction_history').insert(snap)
    }
    await supabase.from('transactions').update({ type: version.type, category: version.category, description: version.description, amount_usd: version.amount_usd, exchange_rate: version.exchange_rate, transaction_date: version.transaction_date, receipt_ref: version.receipt_ref, last_edited_by: session.username, last_edited_at: new Date().toISOString() }).eq('id', txId)
    await supabase.from('transaction_history').delete().eq('id', version.id)
    await fetchAll()
    setHistoryTx(null)
  }

  function exportCSV() {
    const headers = ['Date', 'Type', 'Category', 'Event', 'Description', 'Amount USD', 'Exchange Rate', 'Amount LBP', 'Receipt Ref', 'Added By', 'Last Edited By']
    const rows = transactions.map(t => {
      const ev = events.find(e => e.id === t.event_id)
      return [fmtDay(t.transaction_date), t.type, t.category, ev?.name || '', t.description || '', t.amount_usd, t.exchange_rate, t.amount_lbp || '', t.receipt_ref || '', t.created_by || '', t.last_edited_by || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'brummana-accounts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function getEventName(id) { return events.find(e => e.id === id)?.name || null }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-sky-500 transition"><ArrowLeft size={20} /></button>
            <div>
              <h1 className="text-2xl font-bold">Account Keeping</h1>
              <p className="text-sky-100 text-sm">Brummana Meet the Generations {!canEdit && <span className="ml-1 bg-white/20 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Eye size={10} /> View only</span>}</p>
            </div>
          </div>
          {canEdit && <button onClick={() => setShowManage(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium"><Settings size={15} /> Manage</button>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium"><TrendingUp size={13} /> INCOME</div>
            <div className="text-xl font-bold mt-1">${fmt(totals.inc)}</div>
            <div className="text-xs text-stone-400 mt-0.5">{fmt(totals.incLBP, 0)} LBP</div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium"><TrendingDown size={13} /> EXPENSES</div>
            <div className="text-xl font-bold mt-1">${fmt(totals.exp)}</div>
            <div className="text-xs text-stone-400 mt-0.5">{fmt(totals.expLBP, 0)} LBP</div>
          </div>
          <div className={`rounded-xl border p-4 ${totals.cash >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`flex items-center gap-1.5 text-xs font-medium ${totals.cash >= 0 ? 'text-emerald-700' : 'text-red-600'}`}><DollarSign size={13} /> CASH ON HAND</div>
            <div className="text-xl font-bold mt-1">${fmt(totals.cash)}</div>
            <div className="text-xs text-stone-400 mt-0.5">{fmt(totals.cashLBP, 0)} LBP</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-stone-500">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</h2>
          {canEdit && <button onClick={() => { setEditingTx(null); setShowForm(true) }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 shadow-sm text-sm"><Plus size={18} /> Add transaction</button>}
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description, category, ref…" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
            <option value="All">All types</option><option value="income">Income</option><option value="expense">Expense</option>
          </select>
          <select value={eventFilter} onChange={e => setEventFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
            <option value="All">All events</option><option value="">No event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>

        {eventFilter !== 'All' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-blue-700">
            <Calendar size={15} /> Showing: <strong>{eventFilter === '' ? 'Transactions with no event' : getEventName(eventFilter)}</strong>
          </div>
        )}

        {loading ? <div className="text-center text-stone-400 py-16">Loading…</div>
          : filtered.length === 0 ? <div className="text-center text-stone-400 py-16 bg-white rounded-xl border border-dashed border-stone-300">{transactions.length === 0 ? 'No transactions yet.' : 'No matches found.'}</div>
          : <div className="space-y-2">
              {filtered.map(t => {
                const evName = getEventName(t.event_id)
                return (
                  <div key={t.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{t.type === 'income' ? 'Income' : 'Expense'}</span>
                        <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{t.category}</span>
                        {evName && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar size={10} /> {evName}</span>}
                        <span className="font-semibold">${fmt(t.amount_usd)}</span>
                        <span className="text-xs text-stone-400">{fmt(t.amount_lbp, 0)} LBP</span>
                      </div>
                      {t.description && <p className="text-sm text-stone-600 mt-1">{t.description}</p>}
                      <div className="text-xs text-stone-400 mt-1 flex flex-wrap gap-x-3">
                        <span>{fmtDay(t.transaction_date)}</span>
                        {t.receipt_ref && <span>Ref: {t.receipt_ref}</span>}
                        {t.created_by && <span>Added by {t.created_by}</span>}
                        {t.last_edited_by && <span>Edited by {t.last_edited_by}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setHistoryTx(t)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"><History size={16} /></button>
                      {canEdit && <button onClick={() => { setEditingTx(t); setShowForm(true) }} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"><Pencil size={16} /></button>}
                      {session.username === ADMIN && <button onClick={() => deleteTx(t.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                )
              })}
            </div>}

        {transactions.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-100 text-sm"><Download size={16} /> Export CSV</button>
          </div>
        )}
      </div>

      {showManage && canEdit && <ManageModal incomeCategories={incomeCategories} setIncomeCategories={setIncomeCategories} expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories} events={events} setEvents={setEvents} onClose={() => setShowManage(false)} />}
      {showForm && canEdit && <TxForm tx={editingTx} lastRate={lastRate} incomeCategories={incomeCategories} expenseCategories={expenseCategories} events={events} onSave={async form => { const res = await saveTx(form, editingTx?.id); if (!res?.error) setShowForm(false); return res }} onClose={() => { setShowForm(false); setEditingTx(null) }} />}
      {historyTx && <HistoryPanel tx={historyTx} session={session} onRollback={rollbackTo} onClose={() => setHistoryTx(null)} />}
    </div>
  )
}
