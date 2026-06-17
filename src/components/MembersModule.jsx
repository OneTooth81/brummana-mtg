import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import MemberForm from './MemberForm'
import MemberCard from './MemberCard'
import HistoryModal from './HistoryModal'
import BulkImportModal from './BulkImportModal'
import { Users, Search, Plus, Download, ArrowLeft, MessageCircle, Eye, Upload } from 'lucide-react'
import { GENERATIONS, RESIDENCES, ADMIN } from '../constants'

function normPhone(p) { return (p || '').replace(/\D/g, '') }
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MembersModule({ session, permissions, onBack }) {
  const canEdit = permissions['members'] === 'edit'
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [genFilter, setGenFilter] = useState('All')
  const [creatorFilter, setCreatorFilter] = useState('All')
  const [groupFilter, setGroupFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [historyMember, setHistoryMember] = useState(null)
  const [residences, setResidences] = useState([...RESIDENCES])
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    fetchMembers()
    supabase.from('app_settings').select('key, value').eq('key', 'residences')
      .then(({ data }) => { if (data && data[0]) setResidences(JSON.parse(data[0].value)) })
  }, [])

  async function fetchMembers() {
    setLoading(true)
    const { data } = await supabase.from('members').select('*').order('name')
    if (data) setMembers(data)
    setLoading(false)
  }

  const creatorOptions = useMemo(() => {
    return Array.from(new Set(members.map(m => m.created_by).filter(Boolean))).sort()
  }, [members])

  const filtered = useMemo(() => {
    return members
      .filter(m => genFilter === 'All' || m.generation === genFilter)
      .filter(m => creatorFilter === 'All' || m.created_by === creatorFilter)
      .filter(m => groupFilter === 'All' || (groupFilter === 'In' ? !!m.in_group : !m.in_group))
      .filter(m => {
        const q = search.toLowerCase().trim()
        if (!q) return true
        return ['name','phone','email','occupation','residence'].some(k => (m[k]||'').toLowerCase().includes(q))
      })
  }, [members, search, genFilter, creatorFilter, groupFilter])

  const counts = useMemo(() => {
    const c = { total: members.length, inGroup: members.filter(m => m.in_group).length }
    GENERATIONS.forEach(g => (c[g] = members.filter(m => m.generation === g).length))
    return c
  }, [members])

  async function saveMember(form, editingId) {
    if (form.phone) {
      const digits = normPhone(form.phone)
      const clash = members.find(m => m.id !== editingId && normPhone(m.phone) === digits)
      if (clash) return { error: `That phone number already belongs to ${clash.name}.` }
    }
    if (editingId) {
      const existing = members.find(m => m.id === editingId)
      if (existing) {
        const snap = { member_id: editingId, type: existing.type, name: existing.name, phone: existing.phone, email: existing.email, occupation: existing.occupation, residence: existing.residence, dob: existing.dob, generation: existing.generation, in_group: existing.in_group, notes: existing.notes, edited_by: session.username }
        const { data: hist } = await supabase.from('member_history').select('id, created_at').eq('member_id', editingId).order('created_at', { ascending: false })
        if (hist && hist.length >= 2) await supabase.from('member_history').delete().eq('id', hist[hist.length - 1].id)
        await supabase.from('member_history').insert(snap)
      }
      const { error } = await supabase.from('members').update({ ...form, last_edited_by: session.username, last_edited_at: new Date().toISOString() }).eq('id', editingId)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('members').insert({ ...form, created_by: session.username, created_at: new Date().toISOString() })
      if (error) return { error: error.message }
    }
    await fetchMembers()
    return { error: null }
  }

  async function bulkSaveMembers(rows) {
    let imported = 0, skipped = 0, duplicates = 0
    for (const form of rows) {
      if (form.phone) {
        const digits = normPhone(form.phone)
        const clash = members.find(m => normPhone(m.phone) === digits)
        if (clash) { duplicates++; continue }
      }
      const { error } = await supabase.from('members').insert({ ...form, created_by: session.username, created_at: new Date().toISOString() })
      if (error) skipped++; else imported++
    }
    await fetchMembers()
    return { imported, skipped, duplicates }
  }

  async function deleteMember(id) {
    await supabase.from('member_history').delete().eq('member_id', id)
    await supabase.from('members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  async function rollbackTo(memberId, version) {
    const existing = members.find(m => m.id === memberId)
    if (existing) {
      const snap = { member_id: memberId, name: existing.name, phone: existing.phone, email: existing.email, occupation: existing.occupation, residence: existing.residence, dob: existing.dob, generation: existing.generation, in_group: existing.in_group, notes: existing.notes, edited_by: session.username }
      const { data: hist } = await supabase.from('member_history').select('id, created_at').eq('member_id', memberId).order('created_at', { ascending: false })
      if (hist && hist.length >= 2) await supabase.from('member_history').delete().eq('id', hist[hist.length - 1].id)
      await supabase.from('member_history').insert(snap)
    }
    await supabase.from('members').update({ name: version.name, phone: version.phone, email: version.email, occupation: version.occupation, residence: version.residence, dob: version.dob, generation: version.generation, in_group: version.in_group, notes: version.notes, last_edited_by: session.username, last_edited_at: new Date().toISOString() }).eq('id', memberId)
    await supabase.from('member_history').delete().eq('id', version.id)
    await fetchMembers()
    setHistoryMember(null)
  }

  function exportCSV() {
    const headers = ['Name','Phone','Email','Occupation','Residence','Date of Birth','Generation','In WhatsApp Group','Notes','Added By','Added On','Last Edited By']
    const rows = members.map(m => [m.name, m.phone, m.email||'', m.occupation||'', m.residence, m.dob||'', m.generation, m.in_group?'Yes':'No', m.notes||'', m.created_by||'', fmtDate(m.created_at), m.last_edited_by||''].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'brummana-members.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 text-white px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-teal-600 transition"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold">Member Database</h1>
            <p className="text-teal-50 text-sm">Brummana Meet the Generations {!canEdit && <span className="ml-1 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Eye size={10}/> View only</span>}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
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

        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-stone-500">{counts.total} member{counts.total !== 1 ? 's' : ''}</h2>
          <div className="flex gap-2">
            {session.username === ADMIN && <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-700 font-medium hover:bg-stone-50 shadow-sm text-sm"><Upload size={16} /> Import</button>}
            {canEdit && <button onClick={() => { setEditingMember(null); setShowForm(true) }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 shadow-sm"><Plus size={18} /> Add member</button>}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
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

        {loading ? <div className="text-center text-stone-400 py-16">Loading…</div> : filtered.length === 0 ? (
          <div className="text-center text-stone-400 py-16 bg-white rounded-xl border border-dashed border-stone-300">{members.length === 0 ? 'No members yet.' : 'No matches found.'}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(m => <MemberCard key={m.id} member={m} session={session} canEdit={canEdit} onEdit={() => { setEditingMember(m); setShowForm(true) }} onDelete={() => deleteMember(m.id)} onHistory={() => setHistoryMember(m)} />)}
          </div>
        )}

        {members.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-100 text-sm"><Download size={16} /> Export CSV</button>
          </div>
        )}
      </div>

      {showForm && canEdit && <MemberForm member={editingMember} residences={residences} setResidences={setResidences} onSave={async form => { const res = await saveMember(form, editingMember?.id); if (!res.error) setShowForm(false); return res }} onClose={() => setShowForm(false)} />}
      {historyMember && <HistoryModal member={historyMember} session={session} onRollback={rollbackTo} onClose={() => setHistoryMember(null)} />}
      {showImport && session.username === ADMIN && <BulkImportModal onImport={bulkSaveMembers} onClose={() => setShowImport(false)} />}
    </div>
  )
}
