import { toFrontendPath, toMediaPath } from '../../../shared/utils/url.js'

export const PROPERTY_FALLBACK_IMAGE_URL = 'https://via.placeholder.com/1200x900'

function formatNumber(value) {
  return new Intl.NumberFormat('uk-UA', {
    maximumFractionDigits: 0,
  }).format(value)
}

function isRentalDealName(dealName) {
  return (
    String(dealName || '')
      .toLowerCase()
      .replace(/\s+/g, '') === 'оренда'
  )
}

export function extractPropertySlugFromPathname(pathname) {
  const match = String(pathname || '').match(/^\/property\/([^/]+)\/?$/)
  if (!match) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function toAbsoluteFrontendUrl(url, fallback = '/search/') {
  const path = toFrontendPath(url, fallback)
  try {
    return new URL(path, window.location.origin).toString()
  } catch {
    return new URL(fallback, window.location.origin).toString()
  }
}

export function toPropertyMediaPath(url) {
  return toMediaPath(url, '')
}

export function buildPropertyAbsoluteUrl(property) {
  return toAbsoluteFrontendUrl(
    property?.absolute_url || (property?.slug ? `/property/${property.slug}/` : '/search/'),
  )
}

export function buildCurrentPropertyPageAbsoluteUrl(pathname = window.location.pathname) {
  return toAbsoluteFrontendUrl(pathname, '/search/')
}

export function buildPropertyDocumentTitle(property) {
  return `${property?.title || 'Обʼєкт'} - DOMINIUM`
}

export function buildPropertyGalleryImages(property) {
  if (!property) return []

  const fromImages = Array.isArray(property.images)
    ? property.images
        .map((image) => ({
          id: image.id ?? Math.random(),
          url: toPropertyMediaPath(image.url),
          isMain: Boolean(image.is_main),
        }))
        .filter((image) => Boolean(image.url))
    : []

  const mainImageUrl = toPropertyMediaPath(property.main_image?.url || '')
  const hasMainInList = fromImages.some((image) => image.url === mainImageUrl)

  let combined = fromImages
  if (mainImageUrl && !hasMainInList) {
    combined = [{ id: 'main', url: mainImageUrl, isMain: true }, ...combined]
  }

  combined = combined.sort((a, b) => {
    if (a.isMain && !b.isMain) return -1
    if (!a.isMain && b.isMain) return 1
    return 0
  })

  if (!combined.length) {
    return [{ id: 'fallback', url: PROPERTY_FALLBACK_IMAGE_URL, isMain: true }]
  }
  return combined
}

export function buildPropertyPriceLabel(property) {
  const dealName = property?.deal_type?.name || 'Угода'
  const isRentalDeal = isRentalDealName(dealName)

  if (property?.price == null) {
    return 'Ціна за запитом'
  }
  return `${formatNumber(property.price)} ${isRentalDeal ? '$/міс' : '$'}`
}

export function hasPropertyCoordinates(property) {
  return Number.isFinite(Number(property?.latitude)) && Number.isFinite(Number(property?.longitude))
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
