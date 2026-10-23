import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

const ATTRIBUTION_KEY = 'dominium_article_attribution'
const SESSION_KEY = 'dominium_article_session'
const MAX_AGE_MS = 30 * 60 * 1000

function sessionId() {
  let value = window.sessionStorage.getItem(SESSION_KEY)
  if (!value) {
    value = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.sessionStorage.setItem(SESSION_KEY, value)
  }
  return value
}

export function beginArticleAttribution(article) {
  const context = { article_id: article.id, slug: article.slug, started_at: Date.now() }
  window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(context))
  return trackArticleEvent('view', { context })
}

export function currentArticleAttribution() {
  try {
    const context = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || 'null')
    if (!context?.article_id || Date.now() - context.started_at > MAX_AGE_MS) return null
    return context
  } catch { return null }
}

export function trackArticleEvent(eventType, { context = currentArticleAttribution(), targetPath = '', propertyId = null } = {}) {
  if (!context) return Promise.resolve()
  return apiClient.postJson(apiEndpoints.articleAnalytics, {
    article_id: context.article_id,
    session_id: sessionId(),
    event_type: eventType,
    target_path: String(targetPath || window.location.pathname).slice(0, 500),
    property_id: propertyId,
  }, { timeoutMs: 5000 }).catch(() => undefined)
}

export function trackAttributedPageView() {
  const context = currentArticleAttribution()
  if (!context || window.location.pathname.startsWith('/articles/')) return
  trackArticleEvent('site_page_view', { context })
}
