import apiClient from '../api/client.js'
import { apiEndpoints } from '../api/endpoints.js'

const SESSION_KEY = 'dominium_journey_session'
const ATTRIBUTION_KEY = 'dominium_journey_attribution'

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getJourneyContext(location = window.location, storage = window.localStorage, referrer = document.referrer) {
  let sessionId = storage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = randomId()
    storage.setItem(SESSION_KEY, sessionId)
  }
  let attribution
  try {
    attribution = JSON.parse(storage.getItem(ATTRIBUTION_KEY) || 'null')
  } catch {
    attribution = null
  }
  if (!attribution) {
    const params = new URLSearchParams(location.search)
    attribution = {
      referrer_host: referrer || '',
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || '',
    }
    storage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution))
  }
  return { sessionId, attribution }
}

export function getJourneySessionId(storage = window.localStorage) {
  const existing = storage.getItem(SESSION_KEY)
  if (existing) return existing
  return getJourneyContext(window.location, storage, document.referrer).sessionId
}

export function trackJourneyEvent(eventType, options = {}) {
  if (typeof window === 'undefined') return Promise.resolve()
  const { sessionId, attribution } = getJourneyContext()
  const payload = {
    event_id: randomId(),
    session_id: sessionId,
    event_type: eventType,
    path: window.location.pathname,
    target_path: options.targetPath || '',
    property_id: options.propertyId || null,
    article_slug: options.articleSlug || '',
    metadata: options.metadata || {},
    attribution,
  }
  return apiClient.postJson(apiEndpoints.journeyEvents, payload, { timeoutMs: 5000 }).catch(() => undefined)
}

export function trackCurrentPage() {
  if (window.location.pathname.startsWith('/api/admin/') || window.location.pathname.startsWith('/admin/')) {
    return Promise.resolve()
  }
  return trackJourneyEvent('page_view')
}
