/**
 * KnowledgeBaseTab â€” Milvus collections browser with document drill-down,
 * upload (new + replace), delete, and ingestion status polling.
 */
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Database, FileText, Layers, ChevronRight, ArrowLeft,
  AlertCircle, Upload, CheckCircle, Loader2, Plus, X, Trash2,
  RefreshCw,
} from 'lucide-react'

const ACCEPTED = '.pdf,.txt,.md,.csv,.json,.docx'

// status â†’ { icon, colour classes }
const STATUS_UI = {
  processing: {
    Icon: Loader2,
    spin: true,
    bar: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  completed: {
    Icon: CheckCircle,
    spin: false,
    bar: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  error: {
    Icon: AlertCircle,
    spin: false,
    bar: 'bg-destructive/10 border-destructive/20 text-destructive',
  },
}

export default function KnowledgeBaseTab({
  collections,
  isLoading,
  selectedCollection,
  documents,
  docsLoading,
  docsError,
  taskStatus,       // { taskId, status: 'processing'|'completed'|'error', message }
  onSelectCollection,
  onBack,
  onUpload,         // async (file, metadata, replace: bool) => void
  onDelete,         // async (documentNames: string[]) => void
}) {
  // ── Upload panel state ───────────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false)
  const [replaceMode, setReplaceMode] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [metadata, setMetadata] = useState({})
  const [uploadStatus, setUploadStatus] = useState('idle') // idle|uploading|queued|error
  const [uploadError, setUploadError] = useState('')

  // ── Delete state ─────────────────────────────────────────────────────────────
  const [deletingNames, setDeletingNames] = useState(new Set())
  const [deleteError, setDeleteError] = useState('')

  const fileInputRef = useRef(null)

  const metaFields = (selectedCollection?.metadata_schema || []).filter(
    (f) => f.name !== 'filename',
  )

  const resetUpload = () => {
    setPendingFile(null)
    setMetadata({})
    setUploadStatus('idle')
    setUploadError('')
    setReplaceMode(false)
  }

  const handleToggleUpload = () => {
    if (uploadOpen) resetUpload()
    setUploadOpen((v) => !v)
  }

  const pickFile = (file) => {
    setPendingFile(file)
    setUploadStatus('idle')
    setUploadError('')
  }

  const handleSubmit = async () => {
    if (!pendingFile) return
    setUploadStatus('uploading')
    setUploadError('')
    try {
      await onUpload(pendingFile, metadata, replaceMode)
      setUploadStatus('queued')
      // Close panel after a short delay so the user sees the queued state
      setTimeout(() => {
        resetUpload()
        setUploadOpen(false)
      }, 1500)
    } catch (err) {
      setUploadStatus('error')
      setUploadError(err.message)
    }
  }

  const handleDelete = async (documentName) => {
    setDeleteError('')
    setDeletingNames((prev) => new Set(prev).add(documentName))
    try {
      await onDelete([documentName])
    } catch (err) {
      setDeleteError(`Delete failed: ${err.message}`)
    } finally {
      setDeletingNames((prev) => {
        const next = new Set(prev)
        next.delete(documentName)
        return next
      })
    }
  }

  // ── Document detail view ───────────────────────────────────────────────────────
  if (selectedCollection) {
    const tsUI = taskStatus ? STATUS_UI[taskStatus.status] : null

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Back to collections"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Database className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Knowledge Base</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">
              {selectedCollection.collection_name}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {!docsLoading && (
              <span className="text-xs text-muted-foreground">
                {documents.length} doc{documents.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleToggleUpload}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                uploadOpen
                  ? 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20'
                  : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
              }`}
            >
              {uploadOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {uploadOpen ? 'Cancel' : 'Upload'}
            </button>
          </div>
        </div>

        {/* Ingestion status banner (from polling) */}
        <AnimatePresence>
          {taskStatus && tsUI && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={`flex items-center gap-2 px-4 py-2 text-xs border-b ${tsUI.bar}`}>
                <tsUI.Icon className={`w-3.5 h-3.5 flex-shrink-0 ${tsUI.spin ? 'animate-spin' : ''}`} />
                <span>{taskStatus.message}</span>
                {taskStatus.status === 'processing' && (
                  <span className="ml-auto font-mono opacity-60">{taskStatus.taskId?.slice(0, 8)}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload panel */}
        <AnimatePresence>
          {uploadOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-border/50"
            >
              <div className="p-4 space-y-3 bg-accent/30">
                {/* Replace toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReplaceMode(false)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      !replaceMode
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    New document
                  </button>
                  <button
                    onClick={() => setReplaceMode(true)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      replaceMode
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    Replace existing
                  </button>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f) }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : pendingFile
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED}
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
                  />
                  {pendingFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium truncate max-w-[260px]">{pendingFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Drop file or click to select</p>
                      <p className="text-xs text-muted-foreground mt-0.5">PDF· TXT · MD · CSV · JSON · DOCX</p>
                    </>
                  )}
                </div>

                {/* Dynamic metadata fields */}
                {metaFields.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {metaFields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-xs text-muted-foreground mb-1 capitalize">
                          {field.name.replace(/_/g, ' ')}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                        </label>
                        <input
                          type="text"
                          value={metadata[field.name] || ''}
                          onChange={(e) =>
                            setMetadata((prev) => ({ ...prev, [field.name]: e.target.value }))
                          }
                          placeholder={field.description || field.name}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload feedback */}
                <AnimatePresence>
                  {uploadStatus === 'error' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </motion.div>
                  )}
                  {uploadStatus === 'queued' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 text-blue-700 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Queued, ingestion status shown above.</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!pendingFile || uploadStatus === 'uploading' || uploadStatus === 'queued'}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {uploadStatus === 'uploading' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploadingâ€¦</>
                  ) : replaceMode ? (
                    <><RefreshCw className="w-4 h-4" /> Replace in {selectedCollection.collection_name}</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Upload to {selectedCollection.collection_name}</>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete error banner */}
        <AnimatePresence>
          {deleteError && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 text-xs bg-destructive/10 border-b border-destructive/20 text-destructive">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1">{deleteError}</span>
                <button onClick={() => setDeleteError('')} className="hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Documents list */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {docsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
              <p className="text-sm">Loading documents...</p>
            </div>
          ) : docsError ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{docsError}</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No documents in this collection</p>
              <p className="text-xs mt-1">Use the Upload button to add your first document.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {documents.map((doc, index) => {
                  const isDeleting = deletingNames.has(doc.document_name)
                  return (
                    <motion.div
                      key={doc.document_name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground break-all">
                          {doc.document_name}
                        </p>
                        {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {Object.entries(doc.metadata)
                              .filter(([k, v]) => k !== 'filename' && v)
                              .map(([k, v]) => (
                                <span key={k} className="text-xs text-muted-foreground">
                                  <span className="font-medium capitalize">{k}:</span> {v}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(doc.document_name)}
                        disabled={isDeleting}
                        title="Delete document"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all disabled:opacity-50 flex-shrink-0"
                      >
                        {isDeleting
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Collections list view ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Knowledge Base
        </h2>
        <span className="text-xs text-muted-foreground">
          {collections.length} collection{collections.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
            <p className="text-sm">Loading collections…</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No collections found</p>
            <p className="text-xs mt-1">
              Check <code className="font-mono">KB_COLLECTION_NAMES</code> in your environment
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {collections.map((col, index) => (
              <motion.button
                key={col.collection_name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => onSelectCollection(col)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-accent transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{col.collection_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {col.num_entities.toLocaleString()} document chunk{col.num_entities !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                  col.num_entities > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                }`}>
                  {col.num_entities > 0 ? 'Active' : 'Empty'}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
