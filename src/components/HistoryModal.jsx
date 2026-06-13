import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { X, History, CheckCircle, RotateCcw, AlertCircle } from 'lucide-react'
import { ADMIN } from '../constants'

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDob(dob) {
  if (!dob) return ''
  const d = new Date(dob)
  if (isNaN(d)) return dob
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function FieldRow({ label, value }) {
  return value !== undefined && value !== null && value !== ''
    ? <div className="text-xs text-stone-600"><span className="text-stone-400">{label}:</span> {String(value)}</div>
    : null
}
function VersionFields({ d }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
      <FieldRow label="Name" value={d.name} />
      <FieldRow label="Phone" value={d.phone} />
      <FieldRow label="Email" value={d.email} />
      <FieldRow label="Occupation" value={d.occupation} />
      <FieldRow label="Residence" value={d.residence} />
      <FieldRow label="DOB" value={fmtDob(d.dob)} />
      <FieldRow label="Generation" value={d.generation} />
      <FieldRow label="WhatsApp" value={d.in_group ? 'In group' : 'Not in group'} />
      <div className="col-span-2"><FieldRow label="Notes" value={d.notes} /></div>
    </div>
  )
}

export default function HistoryModal({ member, session, onRollback, onClose }) {
  const [history, setHistory] = useState([])

  useEffect(() => {
    supabase.from('member_history').select('*').eq('member_id', member.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setHistory(data) })
  }, [member.id])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold flex items-center gap-2"><History size={18} /> Edit history</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={20} /></button>
        </div>
        <p className="text-sm text-stone-500">{member.name} — up to 2 previous versions are kept.</p>

        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-3">
          <div className="text-xs font-semibold text-teal-700 flex items-center gap-1.5 flex-wrap">
            <CheckCircle size={13} /> CURRENT VERSION
            {member.last_edited_at && <span className="font-normal text-teal-600">· last edited by {member.last_edited_by} on {fmtDate(member.last_edited_at)}</span>}
          </div>
          <VersionFields d={member} />
        </div>

        <div className="mt-3 space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">No previous versions yet.</p>
          ) : (
            history.map((v, i) => (
              <div key={v.id} className="rounded-xl border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-semibold text-stone-500">
                    PREVIOUS VERSION {i + 1}
                    {v.edited_by && <span className="font-normal text-stone-400"> · replaced by {v.edited_by} on {fmtDate(v.created_at)}</span>}
                  </div>
                  {session.username === ADMIN ? (
                    <button onClick={() => onRollback(member.id, v)} className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-700 text-white hover:bg-teal-800">
                      <RotateCcw size={12} /> Roll back to this
                    </button>
                  ) : (
                    <span className="text-xs text-stone-400">Admin only</span>
                  )}
                </div>
                <VersionFields d={v} />
              </div>
            ))
          )}
          {session.username !== ADMIN && history.length > 0 && (
            <p className="text-xs text-stone-400 flex items-center gap-1.5"><AlertCircle size={13} /> Only the administrator can roll back.</p>
          )}
        </div>
      </div>
    </div>
  )
}
