/**
 * KnowledgeBase.jsx — Knowledge Base Management Page
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Database, MessageSquare } from 'lucide-react'

import KnowledgeBaseTab from '../components/chat/KnowledgeBaseTab'
import {
  getKnowledgeBaseCollections,
  getCollectionDocuments,
  uploadDocumentToCollection,
  replaceDocumentInCollection,
  deleteDocumentsFromCollection,
  getIngestionTaskStatus,
} from '../api'

export default function KnowledgeBase() {
  const [collections, setCollections] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const [selectedCollection, setSelectedCollection] = useState(null)
  const [documents, setDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState(null)
  const [taskStatus, setTaskStatus] = useState(null) // { taskId, status, message }

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    setIsLoading(true)
    try {
      const data = await getKnowledgeBaseCollections()
      setCollections(data?.collections || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectCollection = async (collection) => {
    setSelectedCollection(collection)
    setDocuments([])
    setDocsError(null)
    setDocsLoading(true)
    try {
      const data = await getCollectionDocuments(collection.collection_name)
      setDocuments(data?.documents || [])
    } catch (err) {
      setDocsError(err.message)
    } finally {
      setDocsLoading(false)
    }
  }

  const refreshDocuments = async (collectionName) => {
    const data = await getCollectionDocuments(collectionName)
    setDocuments(data?.documents || [])
  }

  const pollTaskStatus = (collectionName, taskId) => {
    setTaskStatus({ taskId, status: 'processing', message: 'Ingesting document…' })
    const interval = setInterval(async () => {
      try {
        const data = await getIngestionTaskStatus(collectionName, taskId)
        const state = (data?.status || data?.state || '').toLowerCase()
        if (state === 'completed' || state === 'finished') {
          clearInterval(interval)
          setTaskStatus({ taskId, status: 'completed', message: 'Ingestion complete.' })
          await refreshDocuments(collectionName)
          setTimeout(() => setTaskStatus(null), 3000)
        } else if (state === 'failed' || state === 'error') {
          clearInterval(interval)
          setTaskStatus({ taskId, status: 'error', message: data?.message || 'Ingestion failed.' })
        }
      } catch {
        // transient poll error — keep retrying
      }
    }, 3000)
  }

  const handleBack = () => {
    setSelectedCollection(null)
    setDocuments([])
    setDocsError(null)
    setTaskStatus(null)
  }

  const handleUpload = async (file, metadata, replace = false) => {
    const fn = replace ? replaceDocumentInCollection : uploadDocumentToCollection
    const result = await fn(selectedCollection.collection_name, file, metadata)
    if (result?.task_id) {
      pollTaskStatus(selectedCollection.collection_name, result.task_id)
    }
  }

  const handleDelete = async (documentNames) => {
    await deleteDocumentsFromCollection(selectedCollection.collection_name, documentNames)
    await refreshDocuments(selectedCollection.collection_name)
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
                Browse Milvus collections
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
            collections={collections}
            isLoading={isLoading}
            selectedCollection={selectedCollection}
            documents={documents}
            docsLoading={docsLoading}
            docsError={docsError}
            taskStatus={taskStatus}
            onSelectCollection={handleSelectCollection}
            onBack={handleBack}
            onUpload={handleUpload}
            onDelete={handleDelete}
          />
        </motion.div>
      </main>
    </div>
  )
}
