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
import { Send, Bot, User, RefreshCw, Trash2, Clock, Database, Sparkles } from 'lucide-react'

import { streamChatMessage, clearChatHistory } from '../api'

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
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

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
    p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    code: ({ children, inline }) =>
      inline ? (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
          {children}
        </code>
      ) : (
        <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-3 border border-border">
          <code className="text-sm font-mono text-foreground">{children}</code>
        </pre>
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
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-base">AI Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Powered by LangGraph
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
      <main className="flex-1 flex max-w-4xl mx-auto w-full">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
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
                      <Bot className="w-4 h-4 text-primary" />
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
                  <Bot className="w-4 h-4 text-primary" />
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
                  {/* Cursor indicator for streaming */}
                  <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle rounded-sm" />
                </div>
              </motion.div>
            )}

            {/* Loading Indicator (before streaming starts) */}
            {isLoading && !streamingContent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4 flex items-center gap-2 shadow-sm">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-primary/60"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-primary/60"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-primary/60"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  />
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
              className="w-64 border-l border-border bg-card p-4 hidden lg:block"
            >
              <h2 className="font-semibold text-sm mb-4 flex items-center gap-2 text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                Tool Calls
              </h2>
              <div className="space-y-3">
                {toolCalls.map((tool, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-3 rounded-xl bg-secondary border border-border text-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {tool.tool_name === 'get_current_time' ? (
                        <Clock className="w-4 h-4 text-primary" />
                      ) : tool.tool_name === 'query_knowledge_base' ? (
                        <Database className="w-4 h-4 text-primary" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-primary" />
                      )}
                      <span className="font-medium text-secondary-foreground">
                        {tool.tool_name}
                      </span>
                    </div>
                    {tool.arguments && Object.keys(tool.arguments).length > 0 && (
                      <pre className="text-xs text-muted-foreground overflow-x-auto bg-background p-2 rounded-lg border border-border">
                        {JSON.stringify(tool.arguments, null, 2)}
                      </pre>
                    )}
                    {tool.result && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {tool.result}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
