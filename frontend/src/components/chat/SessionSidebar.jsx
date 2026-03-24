/**
 * SessionSidebar — Collapsible sidebar for chat session history
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  PanelLeft,
  PanelLeftClose,
  Plus,
  Trash2,
  MessageSquare,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export default function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
  onToggle,
}) {
  const [deletingId, setDeletingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation()
    setDeletingId(sessionId)
    try {
      await onDeleteSession(sessionId)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isYesterday =
      new Date(now.setDate(now.getDate() - 1)).toDateString() ===
      date.toDateString()

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (isYesterday) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const truncateTitle = (title, maxLength = 35) => {
    if (!title) return 'New Chat'
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  const trimSummary = (summary, maxLength = 80) => {
    if (!summary) return null
    if (summary.length <= maxLength) return summary
    return summary.substring(0, maxLength) + '...'
  }

  const toggleExpand = (e, sessionId) => {
    e.stopPropagation()
    setExpandedId((prev) => (prev === sessionId ? null : sessionId))
  }

  return (
    <>
      {/* Toggle button - visible when sidebar is closed */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onToggle}
          className="fixed left-4 top-4 z-50 p-2 rounded-lg bg-card border border-border shadow-sm hover:bg-accent transition-colors"
          title="Open sidebar"
        >
          <PanelLeft className="w-5 h-5 text-muted-foreground" />
        </motion.button>
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
            className="border-r border-border bg-sidebar flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-sidebar-foreground">
                Chat History
              </h2>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-md hover:bg-sidebar-active transition-colors"
                title="Close sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-sidebar-foreground" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={onNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Sessions List */}
            <div className="overflow-y-auto max-h-[calc(100vh-10rem)] px-3 pb-4">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No chat sessions yet
                </div>
              ) : (
                <div className="space-y-1">
                  {sessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => onSelectSession(session.id)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectSession(session.id)}
                      role="button"
                      tabIndex={0}
                      className={`w-full text-left p-3 rounded-lg group transition-all cursor-pointer ${
                        currentSessionId === session.id
                          ? 'bg-sidebar-active'
                          : 'hover:bg-sidebar-active/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-sidebar-foreground truncate">
                            {truncateTitle(session.title)}
                          </p>

                          {/* Summary area */}
                          {session.summary ? (
                            <div className="mt-1">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {expandedId === session.id
                                  ? session.summary
                                  : trimSummary(session.summary)}
                              </p>
                              {session.summary.length > 80 && (
                                <button
                                  onClick={(e) => toggleExpand(e, session.id)}
                                  className="flex items-center gap-0.5 mt-0.5 text-[10px] text-primary/70 hover:text-primary transition-colors"
                                >
                                  {expandedId === session.id ? (
                                    <>
                                      <ChevronUp className="w-3 h-3" />
                                      Less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3" />
                                      More
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 italic mt-1">
                              No summary available
                            </p>
                          )}

                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDate(session.updated_at || session.created_at)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, session.id)}
                          disabled={deletingId === session.id}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          title="Delete session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
