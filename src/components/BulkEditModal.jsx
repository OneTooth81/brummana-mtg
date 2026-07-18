import { useState, useMemo } from 'react'
import { X, Save, RotateCcw, Loader } from 'lucide-react'
import { GENERATIONS } from '../constants'

export default function BulkEditModal({ members, residences, session, onSave, onClose }) {
  const [rows, setRows] = useState(() => members.map(m => ({ ...m })))
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const originalMap = useMemo(() => {
    const map = {}
    members.forEach(m => { map[m.id] = m })
    return map
  }, [members])

  const dirtyIds = useMemo(() => {
    return new Set(
      rows.filter(r => {
        const o = originalMap[r.id]
        return ['name', 'phone', 'email', 'occupation', 'residence', 'generation', 'in_group', 'dob', 'from_brummana', 'notes']
          .some(k => String(r[k] ?? '') !== String(o[k] ?? ''))
      }).map(r => r.id)
    )
  }, [rows, originalMap])

  function updateCell(id, field, value) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function discard() {
    setRows(members.map(m => ({ ...m })))
  }

  async function handleSave() {
    setSaving(true)
    const changed = rows.filter(r => dirtyIds.has(r.id))
    await onSave(changed)
    setSaving(false)
    setSavedMsg(`${changed.length} member${changed.length !== 1 ? 's' : ''} updated`)
    setTimeout(() => { setSavedMsg(''); onClose() }, 1200)
  }

  const FIELDS = [
    { key: 'name',       label: 'Name',       width: '160px' },
    { key: 'phone',      label: 'Phone',      width: '130px' },
    { key: 'email',      label: 'Email',      width: '170px' },
    { key: 'occupation', label: 'Occupation', width: '130px' },
  ]

  return (
    <div className="fixed inset-0 bg-stone-50 z-40 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-5 py-3 flex items-center gap-3 shrink-0">
        <div className="flex-1">
          <h2 className="text-base font-bold">Bulk edit members</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {dirtyIds.size === 0 ? 'No changes' : `${dirtyIds.size} row${dirtyIds.size > 1 ? 's' : ''} changed`}
          </p>
        </div>

        {savedMsg && (
          <span className="text-sm text-emerald-600 font-medium">{savedMsg}</span>
        )}

        <button onClick={discard} disabled={dirtyIds.size === 0 || saving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm hover:bg-stone-50 disabled:opacity-40 transition">
          <RotateCcw size={14} /> Discard
        </button>

        <button onClick={handleSave} disabled={dirtyIds.size === 0 || saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 disabled:opacity-40 transition">
          {saving
            ? <><Loader size={14} className="animate-spin" /> Saving…</>
            : <><Save size={14} /> Save {dirtyIds.size > 0 ? `(${dirtyIds.size})` : ''}</>}
        </button>

        <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 ml-1">
          <X size={18} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-sm" style={{ tableLayout: 'fixed', minWidth: '1280px', width: '100%' }}>
          <colgroup>
            <col style={{ width: '40px' }} />
            {FIELDS.map(f => <col key={f.key} style={{ width: f.width }} />)}
            <col style={{ width: '120px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '160px' }} />
          </colgroup>

          <thead className="sticky top-0 z-20">
            <tr className="bg-stone-100 border-b border-stone-200">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-stone-400 sticky left-0 z-30 bg-stone-100">#</th>
              {FIELDS.map((f, fi) => (
                <th key={f.key} className={`px-2 py-2.5 text-left text-xs font-semibold text-stone-400 ${fi === 0 ? 'sticky left-10 z-30 bg-stone-100' : ''}`}>{f.label}</th>
              ))}
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-stone-400">Residence</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-stone-400">Generation</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-stone-400">In group</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-teal-600">Date of birth</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-teal-600">From Brummana</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-teal-600">Notes</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => {
              const dirty = dirtyIds.has(r.id)
              const rowBg = dirty ? '#fffbeb' : ''
              return (
                <tr key={r.id} className={dirty ? 'bg-amber-50' : 'hover:bg-stone-50'}>
                  <td className={`text-center text-xs text-stone-400 border-b border-stone-100 px-1 py-0.5 sticky left-0 z-10 ${dirty ? 'border-l-2 border-l-amber-400' : ''}`}
                    style={{ background: rowBg || 'white' }}>
                    {i + 1}
                  </td>

                  {FIELDS.map((f, fi) => (
                    <td key={f.key} className={`border-b border-stone-100 px-1 py-0.5 ${fi === 0 ? 'sticky z-10' : ''}`}
                      style={fi === 0 ? { left: '40px', background: rowBg || 'white' } : {}}>
                      <input
                        value={r[f.key] || ''}
                        onChange={e => updateCell(r.id, f.key, e.target.value)}
                        className="w-full px-2 py-1.5 text-sm bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                      />
                    </td>
                  ))}

                  <td className="border-b border-stone-100 px-1 py-0.5">
                    <select
                      value={r.residence}
                      onChange={e => updateCell(r.id, 'residence', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white">
                      {[...residences].sort((a, b) => a.localeCompare(b)).map(res => (
                        <option key={res}>{res}</option>
                      ))}
                    </select>
                  </td>

                  <td className="border-b border-stone-100 px-1 py-0.5">
                    <select
                      value={r.generation}
                      onChange={e => updateCell(r.id, 'generation', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white">
                      {GENERATIONS.map(g => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </td>

                  <td className="border-b border-stone-100 px-1 py-0.5">
                    <select
                      value={r.in_group ? 'Yes' : 'No'}
                      onChange={e => updateCell(r.id, 'in_group', e.target.value === 'Yes')}
                      className="w-full px-2 py-1.5 text-sm bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white">
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </td>

                  <td className="border-b border-stone-100 px-1 py-0.5">
                    <input
                      type="date"
                      value={r.dob || ''}
                      onChange={e => updateCell(r.id, 'dob', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                    />
                  </td>

                  <td className="border-b border-stone-100 px-1 py-0.5">
                    <select
                      value={r.from_brummana ? 'Yes' : 'No'}
                      onChange={e => updateCell(r.id, 'from_brummana', e.target.value === 'Yes')}
                      className="w-full px-2 py-1.5 text-sm bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white">
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </td>

                  <td className="border-b border-stone-100 px-1 py-0.5">
                    <input
                      value={r.notes || ''}
                      onChange={e => updateCell(r.id, 'notes', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-stone-200 px-5 py-2 shrink-0">
        <p className="text-xs text-stone-400">
          Click any cell to edit · Changed rows highlight in yellow · Save applies all changes at once
        </p>
      </div>
    </div>
  )
}
