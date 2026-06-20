import { useState } from 'react'
import { X, Save, MessageCircle, AlertCircle } from 'lucide-react'
import { GENERATIONS } from '../constants'
import { supabase } from '../supabase'

function calcAge(dob) {
  if (!dob) return null
  const b = new Date(dob)
  if (isNaN(b)) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age >= 0 ? age : null
}

export default function MemberForm({ member, residences, setResidences, onSave, onClose }) {
  const [form, setForm] = useState({
    name: member?.name || '',
    phone: member?.phone || '',
    email: member?.email || '',
    occupation: member?.occupation || '',
    residence: member?.residence || 'Brummana',
    dob: member?.dob || '',
    generation: member?.generation || 'Adult',
    in_group: member?.in_group || false,
    notes: member?.notes || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAddRes, setShowAddRes] = useState(false)
  const [newRes, setNewRes] = useState('')
  const [resErr, setResErr] = useState('')

  async function handleSave() {
    setError('')
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.'); return
    }
    setSaving(true)
    const res = await onSave(form)
    setSaving(false)
    if (res.error) setError(res.error)
  }

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  function genFromAge(dob) {
    if (!dob) return null
    const age = calcAge(dob)
    if (age === null) return null
    if (age <= 21) return 'Youth'
    if (age <= 60) return 'Adult'
    return 'Senior'
  }

  function handleDobChange(val) {
    const gen = genFromAge(val)
    setForm(p => ({ ...p, dob: val, ...(gen ? { generation: gen } : {}) }))
  }

  async function addResidence() {
    const val = newRes.trim()
    if (!val) { setResErr('Enter a name.'); return }
    if (residences.map(r => r.toLowerCase()).includes(val.toLowerCase())) { setResErr('Already exists.'); return }
    const sorted = [...residences, val].sort((a, b) => a.localeCompare(b))
    setResidences(sorted)
    f('residence', val)
    await supabase.from('app_settings').upsert({ key: 'residences', value: JSON.stringify(sorted) }, { onConflict: 'key' })
    setNewRes(''); setResErr(''); setShowAddRes(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{member ? 'Edit member' : 'Add member'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div><label className="text-sm font-medium text-stone-600">Name *</label>
            <input value={form.name} onChange={e => f('name', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Full name" /></div>
          <div><label className="text-sm font-medium text-stone-600">Phone number</label>
            <input value={form.phone} onChange={e => f('phone', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="+961 …" /></div>
          <div><label className="text-sm font-medium text-stone-600">Email</label>
            <input type="email" value={form.email} onChange={e => f('email', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="name@example.com" /></div>
          <div><label className="text-sm font-medium text-stone-600">Occupation</label>
            <input value={form.occupation} onChange={e => f('occupation', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. Teacher, Student, Retired" /></div>
          <div><label className="text-sm font-medium text-stone-600">Residence</label>
            <select value={form.residence} onChange={e => e.target.value === '__add__' ? setShowAddRes(true) : f('residence', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              {[...residences].sort((a, b) => a.localeCompare(b)).map(r => <option key={r} value={r}>{r}</option>)}
              <option value="__add__">＋ Add new residence…</option>
            </select>
            {showAddRes && (
              <div className="flex gap-2 mt-2">
                <input value={newRes} onChange={e => { setNewRes(e.target.value); setResErr('') }} onKeyDown={e => e.key === 'Enter' && addResidence()} placeholder="New residence name…" className="flex-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" autoFocus />
                <button onClick={addResidence} className="px-3 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800">Add</button>
                <button onClick={() => { setShowAddRes(false); setNewRes(''); setResErr('') }} className="px-3 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50">✕</button>
              </div>
            )}
            {resErr && <p className="text-xs text-red-600 mt-1">{resErr}</p>}
          </div>
          <div><label className="text-sm font-medium text-stone-600">Date of birth</label>
            <input type="date" value={form.dob} onChange={e => handleDobChange(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            {calcAge(form.dob) !== null && <p className="text-xs text-stone-400 mt-1">Age: {calcAge(form.dob)}</p>}</div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-stone-600">Generation</label>
              {form.dob && genFromAge(form.dob) === form.generation && (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Auto-set · override below</span>
              )}
            </div>
            <div className="flex gap-2 mt-1">
              {GENERATIONS.map(g => (
                <button key={g} onClick={() => f('generation', g)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition leading-tight px-1
                    ${form.generation === g
                      ? g === 'Unknown' ? 'border-stone-500 bg-stone-100 text-stone-700' : 'border-teal-600 bg-teal-50 text-teal-800'
                      : 'border-stone-300 text-stone-500 hover:bg-stone-50'}`}>
                  {g === 'Unknown' ? 'Unknown / date missing' : g}
                </button>
              ))}
            </div>
          </div>
          <div><label className="text-sm font-medium text-stone-600 flex items-center gap-1.5"><MessageCircle size={14} /> Added to WhatsApp group?</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => f('in_group', true)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${form.in_group ? 'border-green-600 bg-green-50 text-green-700' : 'border-stone-300 text-stone-500 hover:bg-stone-50'}`}>Yes, in group</button>
              <button onClick={() => f('in_group', false)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${!form.in_group ? 'border-stone-500 bg-stone-100 text-stone-700' : 'border-stone-300 text-stone-500 hover:bg-stone-50'}`}>Not yet</button>
            </div></div>
          <div><label className="text-sm font-medium text-stone-600">Notes / interests</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" placeholder="Helpful for pairing across generations" /></div>
          {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle size={15} /> {error}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 disabled:opacity-60">
            <Save size={17} /> {saving ? 'Saving…' : member ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
