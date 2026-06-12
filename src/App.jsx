import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import ManageUsers from './components/ManageUsers'
import MemberForm from './components/MemberForm'
import MemberCard from './components/MemberCard'
import HistoryModal from './components/HistoryModal'
import {
  Users, Search, Plus, Download, LogOut, UserPlus,
  User, KeyRound, MessageCircle, CheckCircle, AlertCircle, X, Save
} from 'lucide-react'

export const ADMIN = 'Najib.A'
export const GENERATIONS = ['Youth', 'Adult', 'Senior']
export const RESIDENCES = ['Brummana', 'Roumieh', 'Baabdat', 'Beit Meri']

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function normPhone(p) { return (p || '').replace(/\D/g, '') }

export default function App() {
  const [session, setSession] = useState(null) // { username, isAdmin }
  const [screen, setScreen] = useState('login') // login | app | manage
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [genFilter, setGenFilter] = useState('All')
  const [creatorFilter, setCreatorFilter] = useState('All')
  const [groupFilter, setGroupFilter] = useState('All')

  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [historyMember, setHistoryMember] = useState(null)
  const [showPinModal, setShowPinModal] = useState(false)

  const [oldPin, setOldPin] = useState('')
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [pinMsg, setPinMsg] = useState({ type: '', text: '' })

  // Load members
  useEffect(() => {
    if (screen !== 'app') return
    fetchMembers()
  }, [screen])

  async function fetchMembers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name')
    if (!error) setMembers(data || [])
    setLoading(false)
  }

  const creatorOptions = useMemo(() => {
    const set = new Set(members.map(m => m.created_by).filter(Boolean))
    return Array.from(set).sort()
  }, [members])

  const filtered = useMemo(() => {
    return members
      .filter(m => genFilter === 'All' || m.generation === genFilter)
      .filter(m => creatorFilter === 'All' || m.created_by === creatorFilter)
      .filter(m => groupFilter === 'All' || (groupFilter === 'In' ? !!m.in_group : !m.in_group))
      .filter(m => {
        const q = search.toLowerCase().trim()
        if (!q) return true
        return (
          (m.name || '').toLowerCase().includes(q) ||
          (m.phone || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.occupation || '').toLowerCase().includes(q) ||
          (m.residence || '').toLowerCase().includes(q)
        )
      })
  }, [members, search, genFilter, creatorFilter, groupFilter])

  const counts = useMemo(() => {
    const c = { total: members.length, inGroup: members.filter(m => m.in_group).length }
    GENERATIONS.forEach(g => (c[g] = members.filter(m => m.generation === g).length))
    return c
  }, [members])

  async function changePin() {
    setPinMsg({ type: '', text: '' })
    const { data: u } = await supabase.from('app_users').select('pin').eq('username', session.username).single()
    if (!u || oldPin !== u.pin) { setPinMsg({ type: 'error', text: 'Current PIN is incorrect.' }); return }
    if (!/^\d{4,8}$/.test(pin1)) { setPinMsg({ type: 'error', text: 'New PIN must be 4–8 digits.' }); return }
    if (pin1 !== pin2) { setPinMsg({ type: 'error', text: 'New PINs don\'t match.' }); return }
    await supabase.from('app_users').update({ pin: pin1 }).eq('username', session.username)
    setPinMsg({ type: 'success', text: 'PIN updated.' })
    setOldPin(''); setPin1(''); setPin2('')
  }

  async function saveMember(form, editingId) {
    if (form.phone) {
      const digits = normPhone(form.phone)
      const clash = members.find(m => m.id !== editingId && normPhone(m.phone) === digits)
      if (clash) return { error: `That phone number already belongs to ${clash.name}.` }
    }
    if (editingId) {
      // save history snapshot first
      const existing = members.find(m => m.id === editingId)
      if (existing) {
        const snap = {
          member_id: editingId,
          name: existing.name, phone: existing.phone, email: existing.email,
          occupation: existing.occupation, residence: existing.residence,
          dob: existing.dob, generation: existing.generation,
          in_group: existing.in_group, notes: existing.notes,
          edited_by: session.username
        }
        // keep only 2 versions — delete oldest if needed
        const { data: hist } = await supabase.from('member_history').select('id, created_at').eq('member_id', editingId).order('created_at', { ascending: false })
        if (hist && hist.length >= 2) {
          await supabase.from('member_history').delete().eq('id', hist[hist.length - 1].id)
        }
        await supabase.from('member_history').insert(snap)
      }
      const { error } = await supabase.from('members').update({
        ...form, last_edited_by: session.username, last_edited_at: new Date().toISOString()
      }).eq('id', editingId)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('members').insert({
        ...form, created_by: session.username, created_at: new Date().toISOString()
      })
      if (error) return { error: error.message }
    }
    await fetchMembers()
    return { error: null }
  }

  async function deleteMember(id) {
    await supabase.from('member_history').delete().eq('member_id', id)
    await supabase.from('members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  async function rollbackTo(memberId, version) {
    if (session.username !== ADMIN) return
    const existing = members.find(m => m.id === memberId)
    if (existing) {
      const snap = {
        member_id: memberId,
        name: existing.name, phone: existing.phone, email: existing.email,
        occupation: existing.occupation, residence: existing.residence,
        dob: existing.dob, generation: existing.generation,
        in_group: existing.in_group, notes: existing.notes,
        edited_by: session.username
      }
      const { data: hist } = await supabase.from('member_history').select('id, created_at').eq('member_id', memberId).order('created_at', { ascending: false })
      if (hist && hist.length >= 2) {
        await supabase.from('member_history').delete().eq('id', hist[hist.length - 1].id)
      }
      await supabase.from('member_history').insert(snap)
    }
    await supabase.from('members').update({
      name: version.name, phone: version.phone, email: version.email,
      occupation: version.occupation, residence: version.residence,
      dob: version.dob, generation: version.generation,
      in_group: version.in_group, notes: version.notes,
      last_edited_by: session.username, last_edited_at: new Date().toISOString()
    }).eq('id', memberId)
    await supabase.from('member_history').delete().eq('id', version.id)
    await fetchMembers()
    setHistoryMember(null)
  }

  function exportCSV() {
    const headers = ['Name','Phone','Email','Occupation','Residence','Date of Birth','Generation','In WhatsApp Group','Notes','Added By','Added On','Last Edited By']
    const rows = members.map(m =>
      [m.name, m.phone, m.email||'', m.occupation||'', m.residence, m.dob||'', m.generation, m.in_group?'Yes':'No', m.notes||'', m.created_by||'', fmtDate(m.created_at), m.last_edited_by||'']
        .map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'brummana-members.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (screen === 'login') return <Login onLogin={(s) => { setSession(s); setScreen('app') }} />
  if (screen === 'manage') return <ManageUsers session={session} onBack={() => setScreen('app')} />

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 text-white px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Brummana Meet the Generations</h1>
            <p className="text-teal-50 text-sm mt-1">Member Database · building bonds across generations 🌿</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-teal-100">Signed in as</div>
            <div className="font-semibold flex items-center gap-1.5 justify-end"><User size={15} /> {session.username}</div>
            <div className="flex gap-3 justify-end mt-1">
              {session.isAdmin && (
                <button onClick={() => setScreen('manage')} className="text-xs flex items-center gap-1 text-teal-50 hover:text-white"><UserPlus size={12} /> Manage sign-ins</button>
              )}
              <button onClick={() => { setPinMsg({type:'',text:''}); setOldPin(''); setPin1(''); setPin2(''); setShowPinModal(true) }} className="text-xs flex items-center gap-1 text-teal-50 hover:text-white"><KeyRound size={12} /> Change PIN</button>
              <button onClick={() => { setSession(null); setScreen('login') }} className="text-xs flex items-center gap-1 text-teal-50 hover:text-white"><LogOut size={12} /> Sign out</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-stone-500 text-xs font-medium"><Users size={14} /> TOTAL</div>
            <div className="text-2xl font-bold mt-1">{counts.total}</div>
          </div>
          {GENERATIONS.map(g => (
            <div key={g} className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="text-stone-500 text-xs font-medium">{g.toUpperCase()}</div>
              <div className="text-2xl font-bold mt-1">{counts[g]}</div>
            </div>
          ))}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-1.5 text-stone-500 text-xs font-medium"><MessageCircle size={13} /> IN GROUP</div>
            <div className="text-2xl font-bold mt-1">{counts.inGroup}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-stone-500">{counts.total} member{counts.total !== 1 ? 's' : ''}</h2>
          <button onClick={() => { setEditingMember(null); setShowForm(true) }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 shadow-sm shrink-0"><Plus size={18} /> Add member</button>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email, occupation, residence…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <select value={genFilter} onChange={e => setGenFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="All">All generations</option>
            {GENERATIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="All">WhatsApp: all</option>
            <option value="In">In group</option>
            <option value="Out">Not in group</option>
          </select>
          <select value={creatorFilter} onChange={e => setCreatorFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="All">Added by: anyone</option>
            {creatorOptions.map(c => <option key={c} value={c}>Added by {c}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-stone-400 py-16">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-stone-400 py-16 bg-white rounded-xl border border-dashed border-stone-300">
            {members.length === 0 ? 'No members yet — add your first one.' : 'No matches found.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(m => (
              <MemberCard key={m.id} member={m} session={session}
                onEdit={() => { setEditingMember(m); setShowForm(true) }}
                onDelete={() => deleteMember(m.id)}
                onHistory={() => setHistoryMember(m)} />
            ))}
          </div>
        )}

        {members.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-100 text-sm"><Download size={16} /> Export CSV</button>
          </div>
        )}
      </div>

      {/* Member form */}
      {showForm && (
        <MemberForm
          member={editingMember}
          session={session}
          onSave={async (form) => {
            const res = await saveMember(form, editingMember?.id)
            if (!res.error) setShowForm(false)
            return res
          }}
          onClose={() => setShowForm(false)} />
      )}

      {/* History modal */}
      {historyMember && (
        <HistoryModal
          member={historyMember}
          session={session}
          onRollback={rollbackTo}
          onClose={() => setHistoryMember(null)} />
      )}

      {/* Change PIN modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><KeyRound size={18} /> Change PIN</h2>
              <button onClick={() => setShowPinModal(false)} className="p-1 rounded-lg hover:bg-stone-100"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="Current PIN" type="password" inputMode="numeric" className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <input value={pin1} onChange={e => setPin1(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="New PIN (4–8 digits)" type="password" inputMode="numeric" className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <input value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="Confirm new PIN" type="password" inputMode="numeric" className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              {pinMsg.text && <p className={`text-sm flex items-center gap-1.5 ${pinMsg.type==='success'?'text-emerald-600':'text-red-600'}`}>{pinMsg.type==='success'?<CheckCircle size={15}/>:<AlertCircle size={15}/>} {pinMsg.text}</p>}
            </div>
            <button onClick={changePin} className="w-full mt-4 py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800"><Save size={16} className="inline mr-1" />Update PIN</button>
          </div>
        </div>
      )}
    </div>
  )
}
