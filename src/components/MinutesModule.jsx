import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  ArrowLeft, Upload, Download, Eye, Trash2, FileText,
  X, AlertCircle, CheckCircle, Loader
} from 'lucide-react'
import { ADMIN } from '../constants'

function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Upload Modal ───────────────────────────────────────────────────────────────
function UploadModal({ session, onUploaded, onClose }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  function pickFile(f) {
    if (!f) return
    if (f.type !== 'application/pdf') { setError('Only PDF files are supported.'); return }
    setError('')
    setFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')
    const path = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const { error: storageErr } = await supabase.storage.from('meeting-minutes').upload(path, file)
    if (storageErr) { setError(storageErr.message); setUploading(false); return }
    const { error: dbErr } = await supabase.from('meeting_minutes').insert({
      file_name: file.name,
      storage_path: path,
      file_size: file.size,
      uploaded_by: session.username,
      uploaded_at: new Date().toISOString(),
    })
    if (dbErr) { setError(dbErr.message); setUploading(false); return }
    setUploading(false)
    onUploaded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Upload size={18} /> Upload minutes</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={20} /></button>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]) }}
          onClick={() => document.getElementById('pdf-file-input').click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition mb-4 ${dragging ? 'border-violet-500 bg-violet-50' : file ? 'border-violet-400 bg-violet-50' : 'border-stone-300 hover:border-violet-400 hover:bg-stone-50'}`}
        >
          <FileText size={28} className={`mx-auto mb-2 ${file ? 'text-violet-600' : 'text-stone-400'}`} />
          {file
            ? <><p className="font-medium text-stone-800 text-sm">{file.name}</p><p className="text-xs text-stone-400 mt-1">{fmtSize(file.size)}</p></>
            : <><p className="text-sm font-medium text-stone-600">Click to select or drag & drop</p><p className="text-xs text-stone-400 mt-1">PDF files only</p></>
          }
          <input id="pdf-file-input" type="file" accept="application/pdf" className="hidden"
            onChange={e => pickFile(e.target.files[0])} />
        </div>

        {error && <p className="text-sm text-red-600 flex items-center gap-1.5 mb-3"><AlertCircle size={15} /> {error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50">Cancel</button>
          <button onClick={handleUpload} disabled={!file || uploading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-violet-700 text-white font-medium hover:bg-violet-800 disabled:opacity-50">
            {uploading ? <><Loader size={16} className="animate-spin" /> Uploading…</> : <><Upload size={16} /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Preview Modal ──────────────────────────────────────────────────────────────
function PreviewModal({ file, onClose }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.storage.from('meeting-minutes').createSignedUrl(file.storage_path, 3600)
      .then(({ data, error: err }) => {
        if (err || !data?.signedUrl) { setError('Could not load preview.'); setLoading(false); return }
        setUrl(data.signedUrl)
        setLoading(false)
      })
  }, [file.storage_path])

  async function handleDownload() {
    const { data, error: err } = await supabase.storage.from('meeting-minutes').download(file.storage_path)
    if (err || !data) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(data)
    a.download = file.file_name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-4xl rounded-2xl flex flex-col overflow-hidden" style={{ height: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 shrink-0">
          <h2 className="text-sm font-semibold flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-red-500 shrink-0" />
            <span className="truncate">{file.file_name}</span>
          </h2>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 text-sm">
              <Download size={14} /> Download
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 bg-stone-700 overflow-hidden">
          {loading && (
            <div className="h-full flex items-center justify-center text-white/60">
              <Loader size={24} className="animate-spin" />
            </div>
          )}
          {error && (
            <div className="h-full flex items-center justify-center text-white/60 text-sm">{error}</div>
          )}
          {url && !error && (
            <iframe src={url} className="w-full h-full" title={file.file_name} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({ count, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h2 className="text-base font-bold">Delete {count === 1 ? 'file' : `${count} files`}?</h2>
        </div>
        <p className="text-sm text-stone-500 mb-5">
          This will permanently remove {count === 1 ? 'this file' : 'these files'} from storage. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Module ────────────────────────────────────────────────────────────────
export default function MinutesModule({ session, permissions, onBack }) {
  const canEdit = (permissions['minutes'] || 'edit') !== 'none'
  const isAdmin = session.username === ADMIN

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchFiles() }, [])

  async function fetchFiles() {
    setLoading(true)
    const { data } = await supabase.from('meeting_minutes').select('*').order('uploaded_at', { ascending: false })
    if (data) setFiles(data)
    setLoading(false)
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === files.length) setSelected(new Set())
    else setSelected(new Set(files.map(f => f.id)))
  }

  async function handleDownload() {
    setDownloading(true)
    const toDownload = files.filter(f => selected.has(f.id))
    for (const f of toDownload) {
      const { data, error } = await supabase.storage.from('meeting-minutes').download(f.storage_path)
      if (error || !data) continue
      const a = document.createElement('a')
      a.href = URL.createObjectURL(data)
      a.download = f.file_name
      a.click()
      URL.revokeObjectURL(a.href)
      await new Promise(r => setTimeout(r, 300))
    }
    setDownloading(false)
  }

  function handlePreview() {
    if (selected.size !== 1) return
    const f = files.find(f => f.id === [...selected][0])
    if (f) setPreviewFile(f)
  }

  async function handleDeleteSelected() {
    setDeleting(true)
    const toDelete = files.filter(f => selected.has(f.id))
    const paths = toDelete.map(f => f.storage_path)
    const ids = toDelete.map(f => f.id)
    await supabase.storage.from('meeting-minutes').remove(paths)
    await supabase.from('meeting_minutes').delete().in('id', ids)
    setSelected(new Set())
    setShowDeleteConfirm(false)
    setDeleting(false)
    fetchFiles()
  }

  const selCount = selected.size
  const canPreview = selCount === 1
  const canDownload = selCount >= 1
  const canDelete = isAdmin && selCount >= 1

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-700 to-purple-700 text-white px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-violet-600 transition"><ArrowLeft size={20} /></button>
            <div>
              <h1 className="text-2xl font-bold">Minutes of Meeting</h1>
              <p className="text-violet-200 text-sm">Brummana Meet the Generations</p>
            </div>
          </div>
          {canEdit && (
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium">
              <Upload size={16} /> Upload PDF
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Action bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-stone-500 flex-1">
            {selCount === 0 ? `${files.length} file${files.length !== 1 ? 's' : ''}` : `${selCount} selected`}
          </span>
          <button onClick={handlePreview} disabled={!canPreview}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition
              ${canPreview ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50' : 'border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed'}`}>
            <Eye size={15} /> Preview
          </button>
          <button onClick={handleDownload} disabled={!canDownload || downloading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition
              ${canDownload ? 'bg-violet-700 text-white hover:bg-violet-800' : 'bg-violet-200 text-violet-300 cursor-not-allowed'}`}>
            {downloading ? <><Loader size={15} className="animate-spin" /> Downloading…</> : <><Download size={15} /> Download{selCount > 1 ? ` (${selCount})` : ''}</>}
          </button>
          {isAdmin && (
            <button onClick={() => setShowDeleteConfirm(true)} disabled={!canDelete}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition
                ${canDelete ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-300 cursor-not-allowed'}`}>
              <Trash2 size={15} /> Delete{selCount > 1 ? ` (${selCount})` : ''}
            </button>
          )}
        </div>

        {/* File list */}
        {loading ? (
          <div className="text-center text-stone-400 py-20">Loading…</div>
        ) : files.length === 0 ? (
          <div className="text-center text-stone-400 py-20 bg-white rounded-xl border border-dashed border-stone-300">
            <FileText size={32} className="mx-auto mb-2 text-stone-300" />
            No minutes uploaded yet.
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden space-y-2">
              {files.map(f => {
                const isSel = selected.has(f.id)
                return (
                  <div key={f.id}
                    onClick={() => toggleSelect(f.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition
                      ${isSel ? 'bg-violet-50 border-violet-200' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
                    <input type="checkbox" className="w-4 h-4 accent-violet-600 shrink-0"
                      checked={isSel} onChange={() => toggleSelect(f.id)}
                      onClick={e => e.stopPropagation()} />
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-stone-800">{f.file_name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {f.uploaded_by} · {fmtDate(f.uploaded_at)} · {fmtSize(f.file_size)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-xl border border-stone-200 overflow-hidden">
              {/* Table header */}
              <div className="grid gap-3 px-4 py-2.5 border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-400 uppercase tracking-wide"
                style={{ gridTemplateColumns: '36px 1fr 130px 110px 70px 40px' }}>
                <input type="checkbox" className="w-4 h-4 accent-violet-600 cursor-pointer"
                  checked={selCount === files.length && files.length > 0}
                  onChange={toggleAll} />
                <span>File name</span>
                <span>Uploaded by</span>
                <span>Date</span>
                <span>Size</span>
                <span></span>
              </div>

              {/* Rows */}
              {files.map(f => {
                const isSel = selected.has(f.id)
                return (
                  <div key={f.id}
                    onClick={() => toggleSelect(f.id)}
                    className={`grid gap-3 px-4 py-3 border-b border-stone-100 last:border-0 items-center cursor-pointer transition
                      ${isSel ? 'bg-violet-50' : 'hover:bg-stone-50'}`}
                    style={{ gridTemplateColumns: '36px 1fr 130px 110px 70px 40px' }}>
                    <input type="checkbox" className="w-4 h-4 accent-violet-600 cursor-pointer"
                      checked={isSel} onChange={() => toggleSelect(f.id)}
                      onClick={e => e.stopPropagation()} />
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-red-500" />
                      </div>
                      <span className="text-sm font-medium truncate">{f.file_name}</span>
                    </div>
                    <span className="text-sm text-stone-500 truncate">{f.uploaded_by}</span>
                    <span className="text-sm text-stone-500">{fmtDate(f.uploaded_at)}</span>
                    <span className="text-sm text-stone-400">{fmtSize(f.file_size)}</span>
                    <div />
                  </div>
                )
              })}
            </div>

            {/* Mobile select-all */}
            <div className="sm:hidden mt-2 flex items-center justify-between px-1">
              <button onClick={toggleAll} className="text-xs text-violet-600 font-medium">
                {selCount === files.length ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-xs text-stone-400">{files.length} file{files.length !== 1 ? 's' : ''}</span>
            </div>
          </>
        )}

        {selCount > 1 && (
          <p className="text-xs text-stone-400 mt-2 text-center">
            Preview is only available for a single file. Select one file to preview.
          </p>
        )}
      </div>

      {showUpload && <UploadModal session={session} onUploaded={fetchFiles} onClose={() => setShowUpload(false)} />}
      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          count={selCount}
          onConfirm={handleDeleteSelected}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
