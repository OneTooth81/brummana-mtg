import { Users, BookOpen, LogOut, UserPlus, Eye, Settings } from 'lucide-react'
import { ADMIN } from '../constants'

const MODULES = [
  {
    key: 'members',
    title: 'Member Database',
    description: 'Manage committee members — contact info, generation, WhatsApp status and more.',
    icon: Users,
    color: 'from-teal-500 to-emerald-500',
  },
  {
    key: 'accounts',
    title: 'Account Keeping',
    description: 'Track income, expenses, receipts and cash on hand in USD and LBP.',
    icon: BookOpen,
    color: 'from-sky-500 to-blue-600',
  },
]

export default function Landing({ session, permissions, onNavigate, onSignOut }) {
  const accessible = MODULES.filter(m => permissions[m.key] && permissions[m.key] !== 'none')

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">Brummana Meet the Generations</h1>
          <p className="text-teal-100 mt-1">Building bonds across generations 🌿</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-teal-50">Welcome, <strong>{session.username}</strong></span>
            <div className="flex gap-4">
              {session.isAdmin && (
                <button onClick={() => onNavigate('manage')} className="text-sm flex items-center gap-1.5 text-teal-50 hover:text-white">
                  <UserPlus size={15} /> Manage sign-ins
                </button>
              )}
              <button onClick={onSignOut} className="text-sm flex items-center gap-1.5 text-teal-50 hover:text-white">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Module cards */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-4">Select a module</h2>
        {accessible.length === 0 ? (
          <div className="text-center text-stone-400 py-20">You don't have access to any modules yet. Contact the administrator.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {accessible.map(m => {
              const Icon = m.icon
              const isView = permissions[m.key] === 'view'
              return (
                <button
                  key={m.key}
                  onClick={() => onNavigate(m.key)}
                  className="text-left bg-white rounded-2xl border border-stone-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-4`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold group-hover:text-teal-700 transition-colors">{m.title}</h3>
                    {isView && (
                      <span className="shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">
                        <Eye size={11} /> View only
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500 mt-1">{m.description}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
