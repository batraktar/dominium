export const FALLBACK_IMAGE_URL = 'https://via.placeholder.com/400x300'

export function formatNumber(value) {
  return new Intl.NumberFormat('uk-UA', {
    maximumFractionDigits: 0,
  }).format(value)
}

export function isRentalDeal(dealName) {
  return (
    String(dealName || '')
      .toLowerCase()
      .replace(/\s+/g, '') === 'оренда'
  )
}

export function formatDealTagClass(dealName) {
  const normalized = String(dealName || '')
    .toLowerCase()
    .replace(/\s+/g, '')

  if (normalized === 'оренда') return 'bg-creamBeige text-white'
  if (normalized === 'продаж') return 'bg-coolSage text-white'
  return 'bg-red-200 text-white'
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
