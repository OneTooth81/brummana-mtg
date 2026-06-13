import { Pencil, Trash2, History, Phone, MapPin, Cake, Mail, Briefcase, MessageCircle, User } from 'lucide-react'

const GEN_COLORS = {
  Youth: 'bg-emerald-100 text-emerald-800',
  Adult: 'bg-sky-100 text-sky-800',
  Senior: 'bg-amber-100 text-amber-800',
}

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
function fmtDob(dob) {
  if (!dob) return ''
  const d = new Date(dob)
  if (isNaN(d)) return dob
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MemberCard({ member: m, session, canEdit, onEdit, onDelete, onHistory }) {
  const age = calcAge(m.dob)
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{m.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GEN_COLORS[m.generation] || ''}`}>{m.generation}</span>
          {age !== null && <span className="text-xs text-stone-400">age {age}</span>}
          {m.in_group ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1"><MessageCircle size={11} /> In group</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-500 flex items-center gap-1"><MessageCircle size={11} /> Not in group</span>
          )}
        </div>
        <div className="text-sm text-stone-500 mt-1 flex flex-col gap-0.5">
          {m.occupation && <span className="flex items-center gap-1.5"><Briefcase size={13} /> {m.occupation}</span>}
          {m.phone && <span className="flex items-center gap-1.5"><Phone size={13} /> {m.phone}</span>}
          {m.email && <span className="flex items-center gap-1.5"><Mail size={13} /> {m.email}</span>}
          {m.residence && <span className="flex items-center gap-1.5"><MapPin size={13} /> {m.residence}</span>}
          {m.dob && <span className="flex items-center gap-1.5"><Cake size={13} /> {fmtDob(m.dob)}</span>}
          {m.notes && <span className="text-stone-400 italic mt-0.5">{m.notes}</span>}
        </div>
        <div className="text-xs text-stone-400 mt-2 flex flex-col gap-0.5">
          {(m.created_by || m.created_at) && <span className="flex items-center gap-1"><User size={11} /> Added{m.created_by ? ` by ${m.created_by}` : ''}{m.created_at ? ` · ${fmtDate(m.created_at)}` : ''}</span>}
          {m.last_edited_at && <span className="flex items-center gap-1"><Pencil size={10} /> Edited{m.last_edited_by ? ` by ${m.last_edited_by}` : ''} · {fmtDate(m.last_edited_at)}</span>}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={onHistory} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500" title="Edit history"><History size={16} /></button>
        {canEdit && <button onClick={onEdit} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"><Pencil size={16} /></button>}
        {canEdit && <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>}
      </div>
    </div>
  )
}
