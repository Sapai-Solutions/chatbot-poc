/**
 * Chat.jsx — AI Chatbot Interface with LangGraph Integration
 *
 * Features:
 * - Real-time chat with AI assistant
 * - Tool call visualization
 * - Conversation history
 * - Session management
 * - Clean, modern design
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Send, Bot, User, RefreshCw, Trash2, Clock, Database, Sparkles } from 'lucide-react'

import { sendChatMessage, clearChatHistory } from '../api'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hello! I'm your AI assistant powered by LangGraph. I can help you with:\n\n• Questions about Aras Integrasi and MTAI Labs\n• Current date and time\n• General knowledge and assistance\n\nWhat would you like to know?",
}

export default function Chat() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [toolCalls, setToolCalls] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await sendChatMessage(userMessage, sessionId)

      // Update session ID if new
      if (response.session_id && !sessionId) {
        setSessionId(response.session_id)
      }

      // Track tool calls
      if (response.tool_calls) {
        setToolCalls(response.tool_calls)
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.message },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

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
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">AI Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Powered by LangGraph
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tool Call Indicator */}
            <AnimatePresence>
              {toolCalls.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{toolCalls.length} tool call(s)</span>
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
                    className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-primary'
                        : 'bg-primary/10'
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
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.isError
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-card border'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading Indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border rounded-2xl px-4 py-3 flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t bg-card p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="input resize-none min-h-[52px] max-h-32 pr-12"
                    rows={1}
                    disabled={isLoading}
                    style={{
                      height: 'auto',
                      minHeight: '52px',
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="btn-primary px-4 disabled:opacity-50"
                >
                  {isLoading ? (
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
              className="w-64 border-l bg-card p-4 hidden lg:block"
            >
              <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
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
                    className="p-3 rounded-lg bg-secondary text-sm"
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
                      <pre className="text-xs text-muted-foreground overflow-x-auto bg-background p-2 rounded">
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
