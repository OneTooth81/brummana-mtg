import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { RESIDENCES } from '../constants'
import { Leaf, AlertCircle, CheckCircle, MessageCircle, ExternalLink } from 'lucide-react'

const WA_LINK = 'https://chat.whatsapp.com/HD7e6RrmKRtIB5izFaE9Vk'

export default function JoinPage() {
  const [residences, setResidences] = useState([...RESIDENCES])
  const [form, setForm] = useState({
    name: '', dob: '', phone: '', residence: '', email: '', occupation: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.from('app_settings').select('key, value').eq('key', 'residences')
      .then(({ data }) => { if (data?.[0]) setResidences(JSON.parse(data[0].value)) })
  }, [])

  function f(field, value) {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim())  e.name  = 'Full name is required.'
    if (!form.phone.trim()) e.phone = 'Phone number is required.'
    if (!form.dob)          e.dob   = 'Date of birth is required.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    const { error } = await supabase.from('pending_members').insert({
      name:        form.name.trim(),
      dob:         form.dob,
      phone:       form.phone.trim(),
      residence:   form.residence || null,
      email:       form.email.trim() || null,
      occupation:  form.occupation.trim() || null,
      submitted_at: new Date().toISOString(),
    })
    setSubmitting(false)
    if (error) { setErrors({ submit: error.message }); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col sm:items-center sm:justify-center sm:bg-stone-100">
        <div className="bg-gradient-to-br from-teal-700 to-emerald-600 px-8 pt-14 pb-12 sm:hidden">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
            <Leaf size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white leading-snug">Brummana<br />Meet the Generations</h1>
        </div>

        <div className="flex-1 bg-white rounded-t-3xl sm:rounded-2xl sm:flex-none sm:w-full sm:max-w-sm sm:border sm:border-stone-200 px-6 pt-10 pb-12 sm:py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">You're on the list!</h2>
          <p className="text-stone-500 text-sm mb-8">
            Thank you, <span className="font-semibold text-stone-700">{form.name}</span>. Your request has been received and is pending approval by the committee. You'll be added to the member database once approved.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={20} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-stone-800 mb-1">Join our WhatsApp group</p>
            <p className="text-xs text-stone-500 mb-4">Connect with fellow Brummana Meet the Generations members</p>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition text-sm">
              <MessageCircle size={16} /> Join WhatsApp Group
              <ExternalLink size={13} className="opacity-70" />
            </a>
          </div>

          <p className="text-xs text-stone-400">
            Already in the group? No need to click — you're all set.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col sm:items-center sm:justify-center sm:bg-stone-100">

      {/* Mobile hero */}
      <div className="bg-gradient-to-br from-teal-700 to-emerald-600 px-8 pt-14 pb-10 sm:hidden">
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
          <Leaf size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white leading-snug">Brummana<br />Meet the Generations</h1>
        <p className="text-teal-100/75 text-sm mt-2">Building bonds across generations</p>
      </div>

      {/* Form card */}
      <div className="flex-1 bg-white rounded-t-3xl sm:rounded-2xl sm:flex-none sm:w-full sm:max-w-lg sm:border sm:border-stone-200 px-6 pt-8 pb-12 sm:py-8">

        {/* Desktop brand */}
        <div className="hidden sm:flex flex-col items-center mb-6">
          <div className="w-11 h-11 rounded-2xl bg-teal-700 flex items-center justify-center mb-3">
            <Leaf size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-stone-800">Brummana Meet the Generations</h1>
          <p className="text-stone-400 text-sm mt-1">Building bonds across generations</p>
        </div>

        <h2 className="text-xl font-bold text-stone-800 mb-1">Join the community</h2>
        <p className="text-stone-400 text-sm mb-6">Fill in your details below. Fields marked * are required.</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Full name *</label>
            <input
              value={form.name}
              onChange={e => f('name', e.target.value)}
              placeholder="Your full name"
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 text-base ${errors.name ? 'border-red-400 bg-red-50' : 'border-stone-300'}`} />
            {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Phone number *</label>
            <input
              value={form.phone}
              onChange={e => f('phone', e.target.value)}
              placeholder="+961 xx xxx xxx"
              type="tel"
              inputMode="tel"
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 text-base ${errors.phone ? 'border-red-400 bg-red-50' : 'border-stone-300'}`} />
            {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.phone}</p>}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date of birth *</label>
            <input
              value={form.dob}
              onChange={e => f('dob', e.target.value)}
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 text-base ${errors.dob ? 'border-red-400 bg-red-50' : 'border-stone-300'}`} />
            {errors.dob && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.dob}</p>}
          </div>

          {/* Residence */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Residence area</label>
            <select
              value={form.residence}
              onChange={e => f('residence', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-base">
              <option value="">Select your area…</option>
              {[...residences].sort((a, b) => a.localeCompare(b)).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email address</label>
            <input
              value={form.email}
              onChange={e => f('email', e.target.value)}
              placeholder="you@example.com"
              type="email"
              inputMode="email"
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 text-base ${errors.email ? 'border-red-400 bg-red-50' : 'border-stone-300'}`} />
            {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.email}</p>}
          </div>

          {/* Occupation */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Occupation</label>
            <input
              value={form.occupation}
              onChange={e => f('occupation', e.target.value)}
              placeholder="Your job or profession"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base" />
          </div>

          {errors.submit && (
            <p className="text-sm text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={15} /> {errors.submit}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-teal-700 text-white font-medium hover:bg-teal-800 disabled:opacity-60 transition text-base mt-2">
            {submitting ? 'Submitting…' : 'Submit my details'}
          </button>

          <p className="text-xs text-stone-400 text-center">
            Your information will be reviewed by the committee before being added to the member database.
          </p>
        </form>
      </div>
    </div>
  )
}
