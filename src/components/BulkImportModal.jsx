import { useState } from 'react'
import { X, Upload, ArrowLeft, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'

const FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'residence', label: 'Residence' },
  { key: 'dob', label: 'Date of birth' },
  { key: 'generation', label: 'Generation' },
  { key: 'in_group', label: 'In WhatsApp group' },
  { key: 'notes', label: 'Notes' },
]

const AUTO_MAP = {
  name: ['name', 'full name', 'member name', 'member'],
  phone: ['phone', 'phone number', 'mobile', 'tel', 'telephone', 'cell'],
  email: ['email', 'email address', 'e-mail', 'mail'],
  occupation: ['occupation', 'job', 'work', 'profession', 'title'],
  residence: ['residence', 'city', 'location', 'town', 'area', 'village'],
  dob: ['dob', 'date of birth', 'birthday', 'birth date', 'birthdate'],
  generation: ['generation', 'gen', 'age group', 'category'],
  in_group: ['in_group', 'whatsapp', 'in group', 'group', 'whatsapp group', 'wa group'],
  notes: ['notes', 'note', 'comments', 'remarks', 'comment'],
}

function autoDetectMapping(headers) {
  const mapping = {}
  const used = new Set()
  headers.forEach(h => {
    const hl = h.toLowerCase().trim()
    for (const [field, aliases] of Object.entries(AUTO_MAP)) {
      if (!used.has(field) && aliases.includes(hl)) {
        mapping[h] = field
        used.add(field)
        break
      }
    }
    if (!mapping[h]) mapping[h] = ''
  })
  return mapping
}

function getVal(row, headers, mapping, field) {
  const header = Object.entries(mapping).find(([, f]) => f === field)?.[0]
  if (!header) return ''
  const i = headers.indexOf(header)
  if (i < 0) return ''
  const v = row[i]
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().split('T')[0]
  return String(v).trim()
}

function validateRow(row, headers, mapping) {
  const errors = [], warnings = []
  const name = getVal(row, headers, mapping, 'name')
  if (!name) errors.push('Name is required')
  const email = getVal(row, headers, mapping, 'email')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email')
  const gen = getVal(row, headers, mapping, 'generation')
  if (gen && !['youth', 'adult', 'senior'].includes(gen.toLowerCase())) warnings.push('Generation not recognised — will default to Adult')
  if (!getVal(row, headers, mapping, 'phone')) warnings.push('No phone number')
  return { errors, warnings }
}

function normaliseGeneration(v) {
  if (!v) return 'Adult'
  const m = ['Youth', 'Adult', 'Senior'].find(g => g.toLowerCase() === v.toLowerCase())
  return m || 'Adult'
}

function normaliseInGroup(v) {
  if (!v) return false
  return ['yes', 'true', '1', 'y'].includes(v.toLowerCase())
}

function rowToMember(row, headers, mapping) {
  return {
    name: getVal(row, headers, mapping, 'name'),
    phone: getVal(row, headers, mapping, 'phone') || null,
    email: getVal(row, headers, mapping, 'email') || null,
    occupation: getVal(row, headers, mapping, 'occupation') || null,
    residence: getVal(row, headers, mapping, 'residence') || 'Brummana',
    dob: getVal(row, headers, mapping, 'dob') || null,
    generation: normaliseGeneration(getVal(row, headers, mapping, 'generation')),
    in_group: normaliseInGroup(getVal(row, headers, mapping, 'in_group')),
    notes: getVal(row, headers, mapping, 'notes') || null,
  }
}

const STEP_LABELS = ['Upload file', 'Map columns', 'Preview & import']

export default function BulkImportModal({ onImport, onClose }) {
  const [step, setStep] = useState(1)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [rawData, setRawData] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)

  function parseFile(file) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (!json.length) return
      const hdrs = json[0].map(h => String(h).trim())
      const rows = json.slice(1).filter(r => r.some(c => c !== ''))
      setHeaders(hdrs)
      setRawData(rows)
      setMapping(autoDetectMapping(hdrs))
      setStep(2)
    }
    reader.readAsBinaryString(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const validCount = rawData.filter(r => validateRow(r, headers, mapping).errors.length === 0).length
  const warnCount = rawData.filter(r => { const v = validateRow(r, headers, mapping); return v.errors.length === 0 && v.warnings.length > 0 }).length
  const errCount = rawData.filter(r => validateRow(r, headers, mapping).errors.length > 0).length

  async function handleImport() {
    setImporting(true)
    const rows = rawData
      .filter(r => validateRow(r, headers, mapping).errors.length === 0)
      .map(r => rowToMember(r, headers, mapping))
    const res = await onImport(rows)
    setResult(res)
    setImporting(false)
    setStep(4)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-bold">Import members from Excel</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={20} /></button>
        </div>

        {/* Progress bar */}
        {step < 4 && (
          <div className="flex border-b border-stone-200">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className={`flex-1 text-center py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${step === i + 1 ? 'border-teal-600 text-teal-700' : step > i + 1 ? 'border-teal-300 text-teal-400' : 'border-transparent text-stone-400'}`}>
                {i + 1}. {label}
              </div>
            ))}
          </div>
        )}

        <div className="p-6">

          {/* Step 1: Upload */}
          {step === 1 && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('bulk-file-input').click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${dragging ? 'border-teal-500 bg-teal-50' : 'border-stone-300 hover:border-teal-400 hover:bg-stone-50'}`}
            >
              <Upload size={32} className="mx-auto text-teal-600 mb-3" />
              <p className="font-medium text-stone-700">Click to upload or drag & drop</p>
              <p className="text-sm text-stone-400 mt-1">Supports .xlsx, .xls, .csv</p>
              <p className="text-xs text-stone-400 mt-1">First row must be column headers</p>
              <input id="bulk-file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files[0] && parseFile(e.target.files[0])} />
            </div>
          )}

          {/* Step 2: Map columns */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                  <Upload size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs text-stone-400">{rawData.length} rows · {headers.length} columns detected</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Map your columns to member fields</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                {headers.map(h => (
                  <div key={h} className="flex items-center gap-2">
                    <span className="bg-stone-100 text-stone-600 px-2 py-1.5 rounded text-xs font-mono truncate flex-1 min-w-0">{h}</span>
                    <span className="text-stone-400 text-xs shrink-0">→</span>
                    <select
                      value={mapping[h] || ''}
                      onChange={e => setMapping(p => ({ ...p, [h]: e.target.value }))}
                      className="flex-1 px-2 py-1.5 rounded-lg border border-stone-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">— skip —</option>
                      {FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 text-sm"><ArrowLeft size={15} /> Back</button>
                <button onClick={() => setStep(3)} className="px-4 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 text-sm font-medium">Preview →</button>
              </div>
            </>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{validCount}</div>
                  <div className="text-xs text-emerald-600 mt-0.5">Ready to import</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{warnCount}</div>
                  <div className="text-xs text-amber-600 mt-0.5">Warnings (will import)</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{errCount}</div>
                  <div className="text-xs text-red-600 mt-0.5">Errors (will skip)</div>
                </div>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto border border-stone-200 rounded-xl mb-4">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">#</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Name</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Phone</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Generation</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.map((row, i) => {
                      const { errors, warnings } = validateRow(row, headers, mapping)
                      const isErr = errors.length > 0
                      const isWarn = !isErr && warnings.length > 0
                      return (
                        <tr key={i} className={`border-t border-stone-100 ${isErr ? 'bg-red-50' : isWarn ? 'bg-amber-50' : ''}`}>
                          <td className="px-3 py-2 text-stone-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{getVal(row, headers, mapping, 'name') || <span className="text-stone-300">—</span>}</td>
                          <td className="px-3 py-2 text-stone-500">{getVal(row, headers, mapping, 'phone') || <span className="text-stone-300">—</span>}</td>
                          <td className="px-3 py-2">{normaliseGeneration(getVal(row, headers, mapping, 'generation'))}</td>
                          <td className="px-3 py-2">
                            {isErr
                              ? <span className="flex items-center gap-1 text-red-600"><AlertCircle size={12} /> {errors[0]}</span>
                              : isWarn
                              ? <span className="flex items-center gap-1 text-amber-600"><AlertTriangle size={12} /> {warnings[0]}</span>
                              : <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={12} /> Ready</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 text-sm"><ArrowLeft size={15} /> Back</button>
                <button
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                  className="px-4 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 text-sm font-medium disabled:opacity-60"
                >
                  {importing ? 'Importing…' : `Import ${validCount} member${validCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto text-emerald-600 mb-3" />
              <p className="text-lg font-bold">{result?.imported} member{result?.imported !== 1 ? 's' : ''} imported successfully</p>
              {result?.skipped > 0 && <p className="text-sm text-stone-400 mt-1">{result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped due to errors</p>}
              {result?.duplicates > 0 && <p className="text-sm text-amber-600 mt-1">{result.duplicates} skipped — phone number already exists</p>}
              <button onClick={onClose} className="mt-6 px-6 py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800">Done</button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
