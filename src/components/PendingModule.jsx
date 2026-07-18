import { createGoogleContact } from '../googleContacts'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { RESIDENCES } from '../constants'
import {
  ArrowLeft, Clock, CheckCircle, X, Trash2,
  User, Phone, Mail, Briefcase, MapPin, Calendar,
  AlertCircle, Loader, AlertTriangle
} from 'lucide-react'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function calcAge(dob) {
  if (!dob) return null
  return Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000))
}

function inferGeneration(dob) {
  const age = calcAge(dob)
  if (age === null) return 'Unknown'
  if (age < 30) return 'Youth'
  if (age < 60) return 'Adult'
  return 'Senior'
}

function normalizePhone(p) {
  return (p || '').replace(/\D/g, '')
}

// ── Comparison row helper ──────────────────────────────────────────────────────
function DiffRow({ label, existing, incoming }) {
  const diff = String(existing || '') !== String(incoming || '')
  return (
    <div className="grid gap-2 py-2 border-b border-stone-100 last:border-0 items-start"
      style={{ gridTemplateColumns: '80px 1fr 1fr' }}>
      <span className="text-xs text-stone-400 pt-0.5">{label}</span>
      <span className="text-sm text-stone-700">{existing || <span className="text-stone-300 italic">—</span>}</span>
      <span className={`text-sm rounded px-1.5 py-0.5 -mx-1.5 ${diff ? 'bg-amber-100 text-amber-800 font-medium' : 'text-stone-700'}`}>
        {incoming || <span className="text-stone-300 italic">—</span>}
      </span>
    </div>
  )
}

// ── Approve Modal ──────────────────────────────────────────────────────────────
function ApproveModal({ member, session, onApproved, onRejected, onClose }) {
  const generation = inferGeneration(member.dob)
  const age = calcAge(member.dob)
  const [inGroup, setInGroup] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dupLoading, setDupLoading] = useState(true)
  const [dupMember, setDupMember] = useState(null)

  useEffect(() => {
    const normalized = normalizePhone(member.phone)
    supabase.from('members').select('*').then(({ data }) => {
      if (data) {
        const dup = data.find(m => normalizePhone(m.phone) === normalized)
        setDupMember(dup || null)
      }
      setDupLoading(false)
    })
  }, [])

  async function handleApprove() {
    setSaving(true)
    setError('')
    const { error: insertErr } = await supabase.from('members').insert({
      name:          member.name,
      phone:         member.phone,
      email:         member.email || null,
      occupation:    member.occupation || null,
      residence:     member.residence || RESIDENCES[0],
      dob:           member.dob,
      generation,
      in_group:      inGroup,
      from_brummana: member.from_brummana || false,
      created_by:    session.username,
      created_at:    new Date().toISOString(),
    })
    if (insertErr) { setError(insertErr.message); setSaving(false); return }
    await supabase.from('pending_members').delete().eq('id', member.id)
    setSaving(false)
	// Try to create Google Contact (non-blocking — failure shouldn't stop 	approval)
	try {
  		await createGoogleContact({
    		name:       member.name,
   		 phone:      member.phone,
    		email:      member.email,
    		dob:        member.dob,
    		occupation: member.occupation,
  		})
		} catch (e) {
  		console.warn('Google Contact creation failed:', e.message)
  		// Approval still succeeds even if contact fails
	}
    onApproved()
  }

  async function handleRejectDuplicate() {
    await supabase.from('pending_members').delete().eq('id', member.id)
    onRejected()
  }

  const isDup = !dupLoading && dupMember

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className={`bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto ${isDup ? 'border-2 border-amber-400' : ''}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            {isDup
              ? <><AlertTriangle size={18} className="text-amber-500" /> Duplicate phone detected</>
              : <><CheckCircle size={18} className="text-emerald-600" /> Approve member</>}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={20} /></button>
        </div>

        {/* Loading state */}
        {dupLoading && (
          <div className="flex items-center gap-2 text-sm text-stone-400 py-4">
            <Loader size={15} className="animate-spin" /> Checking for duplicates…
          </div>
        )}

        {!dupLoading && (
          <>
            {/* Duplicate warning */}
            {isDup && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-amber-800">
                  The number <span className="font-semibold">{member.phone}</span> already exists in the member database. Review the differences below.
                </p>
              </div>
            )}

            {/* Summary card */}
            <div className="bg-stone-50 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm font-semibold text-stone-800">{member.name}</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {member.phone}{member.dob ? ` · DOB ${fmtDate(member.dob)}` : ''}
                {age !== null ? ` · ${age} yrs` : ''}
              </p>
            </div>

            {/* Comparison table (duplicate only) */}
            {isDup && (
              <div className="border border-stone-200 rounded-xl overflow-hidden mb-4">
                <div className="grid gap-2 px-4 py-2 bg-stone-50 border-b border-stone-200"
                  style={{ gridTemplateColumns: '80px 1fr 1fr' }}>
                  <span className="text-xs font-semibold text-stone-400"></span>
                  <span className="text-xs font-semibold text-stone-500">Existing member</span>
                  <span className="text-xs font-semibold text-amber-600">New submission</span>
                </div>
                <div className="px-4">
                  <DiffRow label="Name"       existing={dupMember.name}       incoming={member.name} />
                  <DiffRow label="Phone"      existing={dupMember.phone}      incoming={member.phone} />
                  <DiffRow label="DOB"        existing={fmtDate(dupMember.dob)} incoming={fmtDate(member.dob)} />
                  <DiffRow label="Residence"  existing={dupMember.residence}  incoming={member.residence} />
                  <DiffRow label="Email"      existing={dupMember.email}      incoming={member.email} />
                  <DiffRow label="Occupation" existing={dupMember.occupation} incoming={member.occupation} />
                </div>
              </div>
            )}

            {/* Auto-assigned generation (non-dup only) */}
            {!isDup && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4">
                <User size={16} className="text-emerald-700 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-emerald-700">Generation — auto-assigned</p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {generation}
                    {age !== null && <span className="text-xs font-normal text-emerald-600 ml-1">(age {age})</span>}
                  </p>
                </div>
              </div>
            )}

            {/* WhatsApp group (non-dup only) */}
            {!isDup && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">Add to WhatsApp group?</label>
                <div className="flex gap-2">
                  <button onClick={() => setInGroup(true)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition
                      ${inGroup ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-stone-300 text-stone-500 hover:bg-stone-50'}`}>
                    Yes
                  </button>
                  <button onClick={() => setInGroup(false)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition
                      ${!inGroup ? 'border-stone-500 bg-stone-100 text-stone-700' : 'border-stone-300 text-stone-500 hover:bg-stone-50'}`}>
                    No
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1.5 mb-3">
                <AlertCircle size={14} /> {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50 text-sm">
                Cancel
              </button>
              {isDup && (
                <button onClick={handleRejectDuplicate}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 text-sm">
                  Reject (duplicate)
                </button>
              )}
              <button onClick={handleApprove} disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-1.5 text-sm">
                {saving
                  ? <><Loader size={14} className="animate-spin" /> Approving…</>
                  : <><CheckCircle size={14} /> {isDup ? 'Approve anyway' : 'Approve'}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Reject Confirm Modal ───────────────────────────────────────────────────────
function RejectModal({ member, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false)
  async function handleReject() {
    setDeleting(true)
    await supabase.from('pending_members').delete().eq('id', member.id)
    setDeleting(false)
    onConfirm()
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h2 className="text-base font-bold">Reject submission?</h2>
        </div>
        <p className="text-sm text-stone-500 mb-5">
          This will permanently remove <span className="font-semibold text-stone-700">{member.name}</span>'s submission. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50">Cancel</button>
          <button onClick={handleReject} disabled={deleting}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60">
            {deleting ? 'Removing…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Module ────────────────────────────────────────────────────────────────
export default function PendingModule({ session, permissions, onBack }) {
  const canEdit = (permissions?.['pending'] || 'edit') === 'edit'

  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchPending() }, [])

  async function fetchPending() {
    setLoading(true)
    const { data } = await supabase
      .from('pending_members')
      .select('*')
      .order('submitted_at', { ascending: false })
    if (data) setPending(data)
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function onApproved() {
    setApproving(null)
    fetchPending()
    showToast('Member approved and added to the database.')
  }

  function onRejected() {
    setApproving(null)
    setRejecting(null)
    fetchPending()
    showToast('Submission removed.')
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white px-6 py-6">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-amber-500 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Pending Members</h1>
            <p className="text-amber-100 text-sm">
              {pending.length} submission{pending.length !== 1 ? 's' : ''} awaiting approval
              {!canEdit && <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">View only</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

        {/* Join link banner (edit users only) */}
        {canEdit && (
          <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
              <User size={15} className="text-teal-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-stone-500">Shareable joining link</p>
              <p className="text-sm font-mono text-stone-700 truncate">{window.location.origin}/join</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join`); showToast('Link copied!') }}
              className="text-xs px-3 py-1.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 transition shrink-0">
              Copy link
            </button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center text-stone-400 py-20">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="text-center text-stone-400 py-20 bg-white rounded-xl border border-dashed border-stone-300">
            <Clock size={32} className="mx-auto mb-2 text-stone-300" />
            <p className="font-medium">No pending submissions</p>
            <p className="text-sm mt-1">New submissions from the joining page will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-semibold text-amber-700 shrink-0">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-800 truncate">{m.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">Submitted {fmtDateTime(m.submitted_at)}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium shrink-0">Pending</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Phone size={13} className="text-stone-400 shrink-0" />
                    <span>{m.phone}</span>
                  </div>
                  {m.dob && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Calendar size={13} className="text-stone-400 shrink-0" />
                      <span>DOB {fmtDate(m.dob)}</span>
                      {calcAge(m.dob) !== null && (
                        <span className="text-xs text-stone-400">({calcAge(m.dob)} yrs · {inferGeneration(m.dob)})</span>
                      )}
                    </div>
                  )}
                  {m.email && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Mail size={13} className="text-stone-400 shrink-0" />
                      <span className="truncate">{m.email}</span>
                    </div>
                  )}
                  {m.residence && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <MapPin size={13} className="text-stone-400 shrink-0" />
                      <span>{m.residence}</span>
                    </div>
                  )}
                  {m.occupation && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Briefcase size={13} className="text-stone-400 shrink-0" />
                      <span>{m.occupation}</span>
                    </div>
                  )}
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <button onClick={() => setRejecting(m)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition">
                      <Trash2 size={14} /> Reject
                    </button>
                    <button onClick={() => setApproving(m)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition ml-auto">
                      <CheckCircle size={14} /> Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <CheckCircle size={15} className="text-emerald-400" /> {toast}
        </div>
      )}

      {approving && (
        <ApproveModal
          member={approving}
          session={session}
          onApproved={onApproved}
          onRejected={onRejected}
          onClose={() => setApproving(null)} />
      )}
      {rejecting && (
        <RejectModal
          member={rejecting}
          onConfirm={onRejected}
          onClose={() => setRejecting(null)} />
      )}
    </div>
  )
}
