/**
 * Chat.jsx — AI Chatbot Interface with LangGraph Integration & Streaming
 *
 * Features:
 * - Real-time streaming chat with AI assistant
 * - Markdown rendering with GitHub-flavored markdown
 * - Tool call visualization
 * - Conversation history
 * - Session management
 * - Clean, modern design following Aras Integrasi design system
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Bot, User, RefreshCw, Trash2, Clock, Database, Sparkles, BookOpen, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'

import { streamChatMessage, clearChatHistory, getSessions, deleteSession } from '../api'
import SessionSidebar from '../components/chat/SessionSidebar'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hello! I'm your AI assistant powered by LangGraph. I can help you with:\n\n• Questions about Aras Integrasi and MTAI Labs\n• Current date and time\n• General knowledge and assistance\n\nWhat would you like to know?",
}

export default function Chat() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [toolCalls, setToolCalls] = useState([])
  const [streamingContent, setStreamingContent] = useState('')
  const [activeTools, setActiveTools] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sessions, setSessions] = useState([])
  const [toolSidebarOpen, setToolSidebarOpen] = useState(true)
  const [expandedToolCalls, setExpandedToolCalls] = useState({})

  const toggleToolCall = (idx) =>
    setExpandedToolCalls((prev) => ({ ...prev, [idx]: !prev[idx] }))
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await getSessions()
      setSessions(data || [])
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }

  const handleNewChat = () => {
    setMessages([WELCOME_MESSAGE])
    setSessionId(null)
    setToolCalls([])
    setStreamingContent('')
    setIsStreaming(false)
    setIsLoading(false)
    setActiveTools([])
  }

  const handleSelectSession = async (id) => {
    // For now, just switch to that session ID
    // In a full implementation, you'd fetch the session messages
    setSessionId(id)
    setMessages([WELCOME_MESSAGE])
  }

  const handleDeleteSession = async (id) => {
    try {
      await deleteSession(id)
      await loadSessions()
      if (id === sessionId) {
        handleNewChat()
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsStreaming(true)
    setIsLoading(true)
    setStreamingContent('')
    setActiveTools([])

    let currentSessionId = sessionId
    const receivedToolCalls = []

    try {
      await streamChatMessage(userMessage, sessionId, {
        onMessageStart: (newSessionId) => {
          if (!currentSessionId && newSessionId) {
            currentSessionId = newSessionId
            setSessionId(newSessionId)
          }
          setIsLoading(false)
        },

        onToolStart: (tools) => {
          setActiveTools(tools.map(t => t.name || t.function?.name || 'unknown'))
        },

        onToolResult: (tool, result) => {
          receivedToolCalls.push({
            tool_name: tool,
            result: typeof result === 'string' ? result : JSON.stringify(result),
          })
        },

        onToken: (token) => {
          setActiveTools([])
          setStreamingContent((prev) => prev + token)
        },

        onMessageEnd: (fullMessage, finalSessionId, finalToolCalls) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: fullMessage },
          ])
          setStreamingContent('')
          setIsStreaming(false)
          setActiveTools([])

          if (finalSessionId && !sessionId) {
            setSessionId(finalSessionId)
          }
          // Refresh sessions list to pick up new title/summary
          loadSessions()

          // Merge tool calls from final response with real-time results
          const tools = finalToolCalls || []
          if (tools.length > 0) {
            setToolCalls(tools.map((t, i) => ({
              tool_name: t.name || t.function?.name || 'unknown',
              arguments: t.args || t.function?.arguments || {},
              result: receivedToolCalls[i]?.result || t.result,
            })))
          }
        },

        onError: (error) => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'Sorry, I encountered an error. Please try again.',
              isError: true,
            },
          ])
          setStreamingContent('')
          setIsStreaming(false)
          setIsLoading(false)
          setActiveTools([])
        },
      })
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          isError: true,
        },
      ])
      setStreamingContent('')
      setIsStreaming(false)
      setIsLoading(false)
      setActiveTools([])
    }
  }, [input, sessionId, isStreaming])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = async () => {
    if (sessionId) {
      try {
        await clearChatHistory(sessionId)
      } catch (_) {
        // Ignore errors on clear
      }
    }
    setMessages([WELCOME_MESSAGE])
    setSessionId(null)
    setToolCalls([])
    setStreamingContent('')
    setIsStreaming(false)
    setIsLoading(false)
    setActiveTools([])
  }

  // Markdown components for styling
  const markdownComponents = {
    // Use div instead of p to avoid block-level descendants (pre, ul, etc.) inside <p>
    p: ({ children }) => <div className="mb-3 last:mb-0 leading-relaxed">{children}</div>,
    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    // pre handles the block-code wrapper; code only styles the inner element
    pre: ({ children }) => (
      <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-3 border border-border">
        {children}
      </pre>
    ),
    // In react-markdown v9 there is no `inline` prop — detect inline by absence of a language className
    code: ({ className, children }) =>
      className?.startsWith('language-') ? (
        <code className={`text-sm font-mono text-foreground ${className}`}>{children}</code>
      ) : (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
          {children}
        </code>
      ),
    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-foreground">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-foreground">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-foreground">{children}</h3>,
    a: ({ href, children }) => (
      <a href={href} className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-primary pl-3 italic my-3 text-muted-foreground">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-border">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-muted/50 transition-colors">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-left font-semibold text-foreground border border-border first:rounded-tl last:rounded-tr">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 text-foreground border border-border">{children}</td>
    ),
  }

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <img src="/logo.png" alt="Aras Integrasi" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-base">AI Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Powered by MTAI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Knowledge Base Link */}
            <Link
              to="/knowledge-base"
              className="btn-secondary text-sm px-3 py-2 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Knowledge Base
            </Link>

            {/* Tool Call Indicator */}
            <AnimatePresence>
              {(toolCalls.length > 0 || activeTools.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>
                    {activeTools.length > 0
                      ? `Using ${activeTools.join(', ')}...`
                      : `${toolCalls.length} tool call(s)`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Clear Button */}
            <button
              onClick={handleClear}
              className="btn-ghost p-2"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex w-full min-h-0 overflow-hidden">
        {/* Session Sidebar */}
        <SessionSidebar
          sessions={sessions}
          currentSessionId={sessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
                  className={`flex gap-4 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-primary'
                        : 'bg-secondary border border-border'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <img src="/logo.png" alt="AI" className="w-4 h-4" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : message.isError
                        ? 'bg-destructive/5 text-destructive border border-destructive/20 rounded-bl-md'
                        : 'bg-card border border-border rounded-bl-md'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming Message */}
            {isStreaming && streamingContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center">
                  <img src="/logo.png" alt="AI" className="w-4 h-4" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-bl-md px-5 py-4 bg-card border border-border shadow-sm">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                  {/* Cursor indicator for streaming — hide while a tool is running */}
                  {activeTools.length === 0 && (
                    <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle rounded-sm" />
                  )}
                  {/* Tool-in-progress pill shown mid-stream */}
                  <AnimatePresence>
                    {activeTools.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="mt-3 pt-3 border-t border-border flex items-center gap-2"
                      >
                        <div className="flex items-center gap-1.5">
                          {[0, 0.2, 0.4].map((delay, i) => (
                            <motion.span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-primary block"
                              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                              transition={{ repeat: Infinity, duration: 0.9, delay, ease: 'easeInOut' }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Using <span className="font-medium text-primary">{activeTools.join(', ')}</span>…
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Loading Indicator (before first token arrives) */}
            {(isLoading || isStreaming) && !streamingContent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-4"
              >
                <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                  <img src="/logo.png" alt="AI" className="w-4 h-4" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4 flex items-center gap-3 shadow-sm min-w-[160px]">
                  <AnimatePresence mode="wait">
                    {activeTools.length > 0 ? (
                      <motion.div
                        key="tool"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        className="flex items-center gap-2 flex-wrap"
                      >
                        <Database className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">
                          Using <span className="text-primary">{activeTools.join(', ')}</span>
                        </span>
                      </motion.div>
                    ) : (
                      <motion.span
                        key="thinking"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        className="text-sm text-muted-foreground font-medium"
                      >
                        Thinking
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center gap-1.5 ml-auto">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full bg-primary block"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1, delay, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-card p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="input resize-none min-h-[56px] max-h-32 pr-12 py-3.5"
                    rows={1}
                    disabled={isStreaming}
                    style={{
                      height: 'auto',
                      minHeight: '56px',
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className="btn-primary h-14 w-14 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStreaming ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar — Tool Calls Info */}
        <AnimatePresence>
          {toolCalls.length > 0 && (
            <motion.aside
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="border-l border-border bg-card hidden lg:flex flex-col flex-shrink-0 transition-all duration-200"
              style={{ width: toolSidebarOpen ? '17rem' : '2.75rem' }}
            >
              {toolSidebarOpen ? (
                /* ── Expanded panel ── */
                <div className="flex flex-col h-full overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                    <h2 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Tool Calls
                      <span className="ml-1 text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {toolCalls.length}
                      </span>
                    </h2>
                    <button
                      onClick={() => setToolSidebarOpen(false)}
                      className="btn-ghost p-1 rounded-lg"
                      title="Collapse tool calls"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tool cards — scrollable */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {toolCalls.map((tool, idx) => {
                      const isExpanded = !!expandedToolCalls[idx]
                      const hasDetails =
                        (tool.arguments && Object.keys(tool.arguments).length > 0) || !!tool.result
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className="rounded-xl bg-secondary border border-border text-sm overflow-hidden"
                        >
                          {/* Card header — always visible, clickable if has details */}
                          <button
                            onClick={() => hasDetails && toggleToolCall(idx)}
                            className={`w-full flex items-center gap-2 p-3 text-left transition-colors ${
                              hasDetails
                                ? 'hover:bg-accent cursor-pointer'
                                : 'cursor-default'
                            }`}
                          >
                            <div className="flex-shrink-0">
                              {tool.tool_name === 'get_current_time' ? (
                                <Clock className="w-4 h-4 text-primary" />
                              ) : tool.tool_name === 'query_knowledge_base' ? (
                                <Database className="w-4 h-4 text-primary" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <span className="flex-1 font-medium text-secondary-foreground truncate">
                              {tool.tool_name}
                            </span>
                            {hasDetails && (
                              isExpanded
                                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            )}
                          </button>

                          {/* Expandable details */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                key="details"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                                  {tool.arguments && Object.keys(tool.arguments).length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Arguments</p>
                                      <pre className="text-xs text-foreground overflow-x-auto bg-background p-2 rounded-lg border border-border whitespace-pre-wrap break-all">
                                        {JSON.stringify(tool.arguments, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {tool.result && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Result</p>
                                      <p className="text-xs text-foreground bg-background p-2 rounded-lg border border-border break-words">
                                        {tool.result}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* ── Collapsed strip ── */
                <div className="flex flex-col items-center py-3 gap-3">
                  <button
                    onClick={() => setToolSidebarOpen(true)}
                    className="btn-ghost p-1.5 rounded-lg"
                    title="Expand tool calls"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div
                    className="flex flex-col items-center gap-1 cursor-pointer"
                    onClick={() => setToolSidebarOpen(true)}
                    title={`${toolCalls.length} tool call(s)`}
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">
                      {toolCalls.length}
                    </span>
                  </div>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
