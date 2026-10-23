function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function metrics(value = {}) {
  return {
    clicks: number(value.clicks),
    impressions: number(value.impressions),
    ctr: number(value.ctr),
    ctrPercent: number(value.ctr) * 100,
    position: number(value.position),
  }
}

function shortPage(value) {
  try {
    const url = new URL(value)
    return `${url.pathname}${url.search}` || '/'
  } catch {
    return String(value || '')
  }
}

export function normalizeSearchConsoleData(data) {
  const source = data && typeof data === 'object' ? data : {}
  return {
    status: source.status || 'unavailable',
    periodDays: number(source.period_days),
    metrics: metrics(source.metrics),
    daily: Array.isArray(source.daily)
      ? source.daily.map((item) => ({ date: String(item.date || ''), ...metrics(item) }))
      : [],
    topQueries: Array.isArray(source.top_queries)
      ? source.top_queries.map((item) => ({ label: String(item.query || ''), ...metrics(item) }))
      : [],
    topPages: Array.isArray(source.top_pages)
      ? source.top_pages.map((item) => ({ label: shortPage(item.page), url: String(item.page || ''), ...metrics(item) }))
      : [],
    incompleteFrom: source.incomplete_from || null,
  }
}

export function searchConsoleStateMessage(status) {
  if (status === 'not_configured') {
    return 'Google Search Console ще не налаштовано: додайте service account у змінні середовища та надайте йому доступ до ресурсу.'
  }
  return 'Дані Google Search Console тимчасово недоступні. Перевірте доступ service account і повторіть запит.'
}
