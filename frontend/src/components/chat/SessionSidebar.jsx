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
  Clock,
  Hash,
} from 'lucide-react'

export default function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
  onToggle,
  summarizingIds = new Set(),
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

  const trimSummary = (summary, maxLength = 100) => {
    if (!summary) return null
    if (summary.length <= maxLength) return summary
    return summary.substring(0, maxLength) + '...'
  }

  const toggleExpand = (e, sessionId) => {
    e.stopPropagation()
    setExpandedId((prev) => (prev === sessionId ? null : sessionId))
  }

  // Group sessions by date bucket
  const groupSessions = (sessions) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)

    const groups = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] }

    sessions.forEach((s) => {
      const d = new Date(s.updated_at || s.created_at)
      if (d >= today) groups.Today.push(s)
      else if (d >= yesterday) groups.Yesterday.push(s)
      else if (d >= weekAgo) groups['This Week'].push(s)
      else groups.Earlier.push(s)
    })

    return Object.entries(groups).filter(([, items]) => items.length > 0)
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
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
            className="border-r border-border bg-sidebar flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                </div>
                <h2 className="font-semibold text-sm text-sidebar-foreground">
                  Chat History
                </h2>
              </div>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-md hover:bg-sidebar-active transition-colors"
                title="Close sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-sidebar-foreground" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="px-3 pt-3 pb-1">
              <button
                onClick={onNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                New Chat
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 mt-1">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-xs mt-1 opacity-70">Start a new chat to begin</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupSessions(sessions).map(([label, items]) => (
                    <div key={label}>
                      {/* Date group label */}
                      <div className="flex items-center gap-2 px-1 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          {label}
                        </span>
                        <div className="flex-1 h-px bg-border/40" />
                      </div>

                      <div className="space-y-1">
                        {items.map((session, index) => {
                          const isSummarizing = summarizingIds.has(session.id)
                          const isActive = currentSessionId === session.id
                          return (
                            <motion.div
                              key={session.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.02 }}
                              onClick={() => onSelectSession(session.id)}
                              onKeyDown={(e) =>
                                (e.key === 'Enter' || e.key === ' ') &&
                                onSelectSession(session.id)
                              }
                              role="button"
                              tabIndex={0}
                              className={`w-full text-left px-3 py-2.5 rounded-xl group transition-all cursor-pointer relative ${
                                isActive
                                  ? 'bg-amber-900/10 ring-1 ring-amber-700/70'
                                  : 'hover:bg-sidebar-active/50'
                              }`}
                            >
                              {/* Active indicator bar */}
                              {isActive && (
                                <motion.div
                                  layoutId="activeSession"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-700"
                                  transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
                                />
                              )}

                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  {/* Title — shimmer skeleton while summarizing, wrapping text */}
                                  {isSummarizing ? (
                                    <div className="space-y-1">
                                      <div className="h-3.5 w-4/5 rounded-md bg-muted-foreground/12 animate-pulse" />
                                      <div className="h-3.5 w-1/2 rounded-md bg-muted-foreground/12 animate-pulse" />
                                    </div>
                                  ) : (
                                    <p
                                      className={`text-[13px] font-medium leading-snug line-clamp-2 ${
                                        isActive
                                          ? 'text-amber-700'
                                          : 'text-sidebar-foreground'
                                      }`}
                                    >
                                      {session.title || 'New Chat'}
                                    </p>
                                  )}

                                  {/* Summary area — shimmer skeleton while summarizing */}
                                  {isSummarizing ? (
                                    <div className="mt-2 space-y-1">
                                      <div className="h-2.5 w-full rounded bg-muted-foreground/8 animate-pulse" />
                                      <div className="h-2.5 w-3/4 rounded bg-muted-foreground/8 animate-pulse" />
                                    </div>
                                  ) : session.summary ? (
                                    <div className="mt-1">
                                      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                                        {expandedId === session.id
                                          ? session.summary
                                          : trimSummary(session.summary)}
                                      </p>
                                      {session.summary.length > 100 && (
                                        <button
                                          onClick={(e) => toggleExpand(e, session.id)}
                                          className="flex items-center gap-0.5 mt-0.5 text-[10px] text-primary/60 hover:text-primary transition-colors"
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
                                  ) : null}

                                  {/* Meta row: date + message count chip */}
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(session.updated_at || session.created_at)}
                                    </span>
                                    {session.message_count > 0 && (
                                      <div className="relative group/chip">
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground border border-primary/20 cursor-default select-none">
                                          <Hash className="w-2.5 h-2.5" />
                                          MSG: {session.message_count}
                                        </span>
                                        {/* Tooltip */}
                                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/chip:opacity-100 transition-opacity duration-150 z-50">
                                          <div className="bg-popover text-popover-foreground text-[11px] font-medium px-2 py-1 rounded-md shadow-md border border-border whitespace-nowrap z-100">
                                            {session.message_count} message{session.message_count !== 1 ? 's' : ''} in this chat
                                          </div>
                                          {/* Arrow */}
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-[-1px] border-4 border-transparent border-t-popover" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Delete button */}
                                <button
                                  onClick={(e) => handleDelete(e, session.id)}
                                  disabled={deletingId === session.id}
                                  className="opacity-0 group-hover:opacity-100 mt-0.5 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-all"
                                  title="Delete session"
                                >
                                  {deletingId === session.id ? (
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </motion.div>
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
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
