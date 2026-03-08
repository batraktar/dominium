export function getCurrentPathWithQuery() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
}

export function normalizeNextPath(rawNext, fallback = '/') {
  if (!rawNext) return fallback
  try {
    const parsed = new URL(rawNext, window.location.origin)
    const candidate = `${parsed.pathname}${parsed.search}${parsed.hash}`
    if (!candidate || !candidate.startsWith('/')) return fallback
    if (candidate.startsWith('//')) return fallback
    return candidate
  } catch {
    return fallback
  }
}
