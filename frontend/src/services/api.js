const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000/api'
const SESSION_KEY = 'theater_bot_anonymous_session_id'

function createSessionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  return `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = createSessionId()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

export function resetSessionId() {
  localStorage.removeItem(SESSION_KEY)
  return getSessionId()
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Anonymous-Session-Id': getSessionId(),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || payload?.ok === false) {
    const error = new Error(
      payload?.error?.message || 'Не удалось связаться с сервером. Попробуйте повторить запрос.',
    )
    error.code = payload?.error?.code || 'NETWORK_ERROR'
    error.details = payload?.error?.details
    error.status = response.status
    throw error
  }

  return payload?.data
}

export const api = {
  health: () => request('/health'),
  catalog: () => request('/catalog'),
  sendMessage: (body) => request('/chat/message', { method: 'POST', body }),
  createRecommendation: (body) => request('/recommendations', { method: 'POST', body }),
  sendFeedback: (recommendationId, body) =>
    request(`/recommendations/${recommendationId}/feedback`, { method: 'POST', body }),
  getProfile: () => request('/profile/me'),
  updateProfile: (body) => request('/profile/me', { method: 'PUT', body }),
  getFavorites: () => request('/favorites'),
  addFavorite: (eventId) => request('/favorites', { method: 'POST', body: { eventId } }),
  removeFavorite: (favoriteId) => request(`/favorites/${favoriteId}`, { method: 'DELETE' }),
  getHistory: () => request('/history'),
  clearHistory: () => request('/history', { method: 'DELETE' }),
  getAdminEvents: (query = '') => request(`/admin/events${query}`),
  createAdminEvent: (body) => request('/admin/events', { method: 'POST', body }),
  moderateEvent: (id, body) => request(`/admin/events/${id}/moderate`, { method: 'POST', body }),
  getSafetyRules: () => request('/admin/safety-rules'),
  createSafetyRule: (body) => request('/admin/safety-rules', { method: 'POST', body }),
  getDataSources: () => request('/admin/data-sources'),
  importDemoEvents: () => request('/admin/data-sources/import', { method: 'POST', body: {} }),
}
