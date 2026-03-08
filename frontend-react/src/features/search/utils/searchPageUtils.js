export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function parseIntOr(value, fallback) {
  const numeric = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function formatNumber(value) {
  return new Intl.NumberFormat('uk-UA', {
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDealTagClass(dealName) {
  const normalized = String(dealName || '')
    .toLowerCase()
    .replace(/\s+/g, '')

  if (normalized === 'оренда') return 'bg-creamBeige text-white'
  if (normalized === 'продаж') return 'bg-coolSage text-white'
  return 'bg-red-200 text-white'
}

export function isRentalDeal(dealName) {
  return (
    String(dealName || '')
      .toLowerCase()
      .replace(/\s+/g, '') === 'оренда'
  )
}

export function buildAbsoluteUrl(url) {
  if (!url) return new URL('/search/', window.location.origin).toString()
  try {
    const parsed = new URL(url, window.location.origin)
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return new URL(normalized || '/search/', window.location.origin).toString()
  } catch {
    return new URL('/search/', window.location.origin).toString()
  }
}

export function buildMediaUrl(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url, window.location.origin)
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || ''
  } catch {
    return url
  }
}

export function parseLikedIdsFromDom() {
  const node = document.getElementById('liked-ids-data')
  if (!node) return []

  try {
    const parsed = JSON.parse(node.textContent || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
  } catch {
    return []
  }
}

export function buildRangeBackground(min, max, currentMin, currentMax) {
  const percentMin = ((currentMin - min) / (max - min)) * 100
  const percentMax = ((currentMax - min) / (max - min)) * 100
  const trackColor = 'rgba(255,255,255,0.27)'
  const fillColor = '#133E44'
  return `linear-gradient(90deg, ${trackColor} ${percentMin}%, ${fillColor} ${percentMin}%, ${fillColor} ${percentMax}%, ${trackColor} ${percentMax}%)`
}

export function buildVisiblePages(currentPage, totalPages) {
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  const pages = []
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
}
