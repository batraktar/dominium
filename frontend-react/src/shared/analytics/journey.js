import apiClient from '../api/client.js'
import { apiEndpoints } from '../api/endpoints.js'

const SESSION_KEY = 'dominium_journey_session'
const VISITOR_KEY = 'dominium_journey_visitor'
const LAST_ACTIVITY_KEY = 'dominium_journey_last_activity'
const TAB_KEY = 'dominium_journey_tab'
const ATTRIBUTION_KEY = 'dominium_journey_attribution'
const VISIT_TIMEOUT_MS = 30 * 60 * 1000

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getJourneyContext(
  location = window.location,
  storage = window.localStorage,
  referrer = document.referrer,
  tabStorage = null,
  now = Date.now(),
) {
  const resolvedTabStorage = tabStorage || (typeof window !== 'undefined' ? window.sessionStorage : storage)
  let visitorId = storage.getItem(VISITOR_KEY)
  if (!visitorId) {
    visitorId = randomId()
    storage.setItem(VISITOR_KEY, visitorId)
  }
  const lastActivity = Number(storage.getItem(LAST_ACTIVITY_KEY) || 0)
  let visitId = storage.getItem(SESSION_KEY)
  const visitExpired = lastActivity > 0 && now - lastActivity > VISIT_TIMEOUT_MS
  if (!visitId || visitExpired) {
    visitId = randomId()
    storage.setItem(SESSION_KEY, visitId)
    storage.setItem(ATTRIBUTION_KEY, '')
  }
  storage.setItem(LAST_ACTIVITY_KEY, String(now))
  let tabId = resolvedTabStorage.getItem(TAB_KEY)
  if (!tabId) {
    tabId = randomId()
    resolvedTabStorage.setItem(TAB_KEY, tabId)
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
  return { sessionId: visitId, visitorId, visitId, tabId, attribution }
}

export function getJourneySessionId(storage = window.localStorage) {
  const existing = storage.getItem(SESSION_KEY)
  if (existing) return existing
  return getJourneyContext(window.location, storage, document.referrer).sessionId
}

export function trackJourneyEvent(eventType, options = {}) {
  if (typeof window === 'undefined') return Promise.resolve()
  const { visitorId, visitId, tabId, attribution } = getJourneyContext()
  const payload = {
    event_id: randomId(),
    session_id: visitId,
    visitor_id: visitorId,
    tab_id: tabId,
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
