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

// ── Add your API functions below ──────────────────────────────────────────────
// Group by resource, e.g.:
//
// export const getUsers = () => fetchApi('/api/users')
// export const createUser = (data) => fetchApi('/api/users', { method: 'POST', body: JSON.stringify(data) })
// export const deleteUser = (id) => fetchApi(`/api/users/${id}`, { method: 'DELETE' })
