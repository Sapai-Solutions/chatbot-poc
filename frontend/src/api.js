/**
 * API client — centralised fetch wrapper.
 *
 * All API calls should go through fetchApi() to ensure consistent
 * error handling, credentials, and base URL management.
 *
 * Usage:
 *   import { fetchApi } from '../api'
 *
 *   const data = await fetchApi('/api/users')
 *   const user = await fetchApi('/api/users', {
 *     method: 'POST',
 *     body: JSON.stringify({ name: 'Alice' }),
 *   })
 */

const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Wrapper around fetch with:
 *   - Automatic JSON Content-Type header
 *   - Credentials included (for httpOnly JWT cookies)
 *   - Consistent error handling (throws on non-2xx)
 *   - 401 redirect to /login
 */
export async function fetchApi(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',  // Include cookies (for JWT httpOnly cookie auth)
    ...options,
  })

  if (response.status === 401) {
    window.location.href = '/login'
    return
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  // Return null for 204 No Content
  if (response.status === 204) return null

  return response.json()
}

// ── Health ────────────────────────────────────────────────────────────────────

export const getHealth = () => fetchApi('/api/health')

// ── Chat ───────────────────────────────────────────────────────────────────────

export const sendChatMessage = (message, sessionId = null) =>
  fetchApi('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, session_id: sessionId }),
  })

export const getChatHistory = (sessionId) =>
  fetchApi(`/api/chat/history/${sessionId}`)

export const clearChatHistory = (sessionId) =>
  fetchApi(`/api/chat/history/${sessionId}`, { method: 'DELETE' })

/**
 * Stream chat responses using Server-Sent Events.
 *
 * @param {string} message - User message
 * @param {string|null} sessionId - Session ID
 * @param {object} callbacks - Event handlers:
 *   - onToken(token): Called for each token
 *   - onToolStart(tools): Called when tools are invoked
 *   - onToolResult(tool, result): Called when tool completes
 *   - onMessageStart(sessionId): Called when stream starts
 *   - onMessageEnd(fullMessage, sessionId, toolCalls): Called when complete
 *   - onError(error): Called on error
 * @returns {Promise<void>}
 */
export async function streamChatMessage(message, sessionId = null, callbacks = {}) {
  const {
    onToken = () => {},
    onToolStart = () => {},
    onToolResult = () => {},
    onMessageStart = () => {},
    onMessageEnd = () => {},
    onError = () => {},
  } = callbacks

  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ message, session_id: sessionId }),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // Accumulate into a buffer so events split across chunks are handled
      buffer += decoder.decode(value, { stream: true })

      // SSE events are delimited by double-newline
      const parts = buffer.split('\n\n')
      // Last element may be an incomplete event — keep it in the buffer
      buffer = parts.pop() || ''

      for (const part of parts) {
        if (!part.trim()) continue

        // Parse SSE format: "event: <name>\ndata: <json>"
        const eventMatch = part.match(/^event: (.+)$/m)
        const dataMatch = part.match(/^data: (.+)$/m)

        if (eventMatch && dataMatch) {
          const event = eventMatch[1]
          let data
          try {
            data = JSON.parse(dataMatch[1])
          } catch {
            continue
          }

          switch (event) {
            case 'message_start':
              onMessageStart(data.session_id)
              break
            case 'tool_start':
              onToolStart(data.tools)
              break
            case 'tool_result':
              onToolResult(data.tool, data.result)
              break
            case 'token':
              onToken(data.token)
              break
            case 'message_end':
              onMessageEnd(data.full_message, data.session_id, data.tool_calls)
              break
            case 'error':
              onError(data.error)
              break
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ── Sessions ───────────────────────────────────────────────────────────────────

export const getSessions = () => fetchApi('/api/sessions')

export const deleteSession = (sessionId) =>
  fetchApi(`/api/sessions/${sessionId}`, { method: 'DELETE' })

export const renameSession = (sessionId, title) =>
  fetchApi(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })

// ── Knowledge Base ─────────────────────────────────────────────────────────────

export const getKnowledgeBaseDocuments = () => fetchApi('/api/knowledge-base')

export const uploadDocument = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return fetch(`${API_BASE}/api/knowledge-base/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then((response) => {
    if (!response.ok) {
      return response.json().then((error) => {
        throw new Error(error.detail || `HTTP ${response.status}`)
      })
    }
    return response.json()
  })
}

export const deleteDocument = (documentId) =>
  fetchApi(`/api/knowledge-base/${documentId}`, { method: 'DELETE' })
