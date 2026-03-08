export function toFrontendPath(url, fallback = '/search/') {
  if (!url) return fallback

  try {
    const parsed = new URL(url, window.location.origin)
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return normalized || fallback
  } catch {
    return fallback
  }
}

export function toMediaPath(url, fallback = '') {
  if (!url) return fallback

  try {
    const parsed = new URL(url, window.location.origin)
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return normalized || fallback
  } catch {
    return url
  }
}
