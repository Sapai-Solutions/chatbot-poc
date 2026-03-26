/**
 * KnowledgeBaseWidget — inline widget spawned when the query_knowledge_base
 * tool is invoked. Shows the query, result count, and a collapsible sources list.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Database, ChevronDown, ChevronUp } from 'lucide-react'

function ScoreBadge({ score }) {
  const pct = Math.round(score * 100)
  const colorClass =
    pct >= 85
      ? 'bg-primary/15 text-primary'
      : pct >= 70
      ? 'bg-secondary text-secondary-foreground'
      : 'bg-muted text-muted-foreground'
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${colorClass}`}>
      {pct}%
    </span>
  )
}

function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false)
  const hasExtra = source.author || source.date || source.category
  const preview = source.content?.length > 120
    ? source.content.slice(0, 120) + '…'
    : source.content

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Source header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors"
      >
        <span className="text-xs font-semibold text-muted-foreground w-5 flex-shrink-0 pt-px">
          {index}.
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
              {source.source}
            </span>
            <ScoreBadge score={source.score} />
          </div>
          {hasExtra && (
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              {[source.author, source.date, source.category].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-muted-foreground pt-0.5">
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-border">
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {source.content}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed preview — only when not expanded */}
      {!expanded && (
        <div className="px-3 pb-2.5 pl-[2.375rem]">
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {preview}
          </p>
        </div>
      )}
    </div>
  )
}

export default function KnowledgeBaseWidget({ data }) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const { query, total, sources = [] } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
      className="mt-3 pt-3 border-t border-border"
    >
      {/* Widget header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Database className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs font-semibold text-foreground">Knowledge Base</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={query}>
          "{query}"
        </span>
        <span className="ml-auto text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full flex-shrink-0">
          {total} result{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Collapsible sources */}
      <button
        onClick={() => setSourcesOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left mb-1.5"
      >
        {sourcesOpen
          ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />}
        <span className="font-medium">
          {sourcesOpen ? 'Hide sources' : `Show ${sources.length} source${sources.length !== 1 ? 's' : ''}`}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {sourcesOpen && (
          <motion.div
            key="sources"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-1">
              {sources.map((source, i) => (
                <SourceCard key={i} source={source} index={source.rank ?? i + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
