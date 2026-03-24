/**
 * KnowledgeBase.jsx — Knowledge Base Management Page
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Database, MessageSquare } from 'lucide-react'

import KnowledgeBaseTab from '../components/chat/KnowledgeBaseTab'
import { getKnowledgeBaseDocuments, uploadDocument, deleteDocument } from '../api'

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const docs = await getKnowledgeBaseDocuments()
      setDocuments(docs || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (file) => {
    await uploadDocument(file)
    await loadDocuments()
  }

  const handleDelete = async (documentId) => {
    await deleteDocument(documentId)
    await loadDocuments()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <img src="/logo.png" alt="Aras Integrasi" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-base">Knowledge Base</h1>
              <p className="text-sm text-muted-foreground">
                Manage your documents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/chat"
              className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Back to Chat
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-[calc(100vh-140px)] bg-card border border-border rounded-xl shadow-sm overflow-hidden"
        >
          <KnowledgeBaseTab
            documents={documents}
            onUpload={handleUpload}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </motion.div>
      </main>
    </div>
  )
}
