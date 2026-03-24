/**
 * KnowledgeBaseTab — Document management interface for the knowledge base
 */
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Database,
  Upload,
  Trash2,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'

export default function KnowledgeBaseTab({
  documents,
  onUpload,
  onDelete,
  isLoading,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    setError(null)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await uploadFile(files[0])
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setError(null)
      await uploadFile(file)
    }
  }

  const uploadFile = async (file) => {
    setUploadProgress({ status: 'uploading', fileName: file.name })
    try {
      await onUpload(file)
      setUploadProgress({ status: 'success', fileName: file.name })
      setTimeout(() => setUploadProgress(null), 2000)
    } catch (err) {
      setUploadProgress({ status: 'error', fileName: file.name, message: err.message })
      setError(err.message)
    }
  }

  const handleDelete = async (documentId) => {
    setDeletingId(documentId)
    try {
      await onDelete(documentId)
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Knowledge Base
        </h2>
        <span className="text-xs text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Upload Area */}
      <div className="p-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-accent'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".txt,.pdf,.docx,.md,.json,.csv"
            className="hidden"
          />
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Drop a file here or click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports: PDF, DOCX, TXT, MD, JSON, CSV
          </p>
        </div>

        {/* Upload progress indicator */}
        <AnimatePresence>
          {uploadProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div
                className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${
                  uploadProgress.status === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : uploadProgress.status === 'error'
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'bg-secondary border border-border'
                }`}
              >
                {uploadProgress.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
                {uploadProgress.status === 'success' && (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
                {uploadProgress.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                <span className="flex-1 truncate">{uploadProgress.fileName}</span>
                {uploadProgress.status === 'uploading' && (
                  <span className="text-xs text-muted-foreground">Uploading...</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {documents.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No documents yet</p>
            <p className="text-xs mt-1">Upload documents to build your knowledge base</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border group hover:border-primary/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {doc.filename || doc.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.size || doc.file_size || 0)}</span>
                      <span>·</span>
                      <span>{formatDate(doc.created_at || doc.uploaded_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all disabled:opacity-50"
                    title="Delete document"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
