import {
  AREA_RANGE_CONFIG,
  PRICE_RANGE_CONFIG,
  ROOMS_RANGE_CONFIG,
} from '../constants/searchConfig.js'

function normalizeScopeSlug(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized || ''
}

export function resolveSearchScopeFromPath(pathname = window.location.pathname) {
  const currentPath = String(pathname || '')

  const regionMatch = currentPath.match(/^\/search\/region\/([^/]+)\/?$/i)
  if (regionMatch) {
    return {
      citySlug: '',
      regionSlug: normalizeScopeSlug(decodeURIComponent(regionMatch[1] || '')),
    }
  }

  const cityMatch = currentPath.match(/^\/search\/city\/([^/]+)\/?$/i)
  if (cityMatch) {
    return {
      citySlug: normalizeScopeSlug(decodeURIComponent(cityMatch[1] || '')),
      regionSlug: '',
    }
  }

  return {
    citySlug: '',
    regionSlug: '',
  }
}

export function buildSearchQueryParams({
  query = '',
  selectedPropertyTypes = [],
  priceRange,
  areaRange,
  roomsRange,
  sortOption = 'date',
  perPage = 12,
  currency = 'USD',
  page = 1,
  pathname,
}) {
  const browserParams = new URLSearchParams()
  const apiParams = new URLSearchParams()
  const scope = resolveSearchScopeFromPath(pathname)

  const trimmedQuery = query.trim()
  if (trimmedQuery) {
    browserParams.set('q', trimmedQuery)
    apiParams.set('q', trimmedQuery)
  }

  selectedPropertyTypes.forEach((slug) => {
    browserParams.append('property_type', slug)
    apiParams.append('property_type', slug)
  })

  if (priceRange.min > PRICE_RANGE_CONFIG.min) {
    browserParams.set('price_min', String(priceRange.min))
    apiParams.set('price_min', String(priceRange.min))
  }
  if (priceRange.max < PRICE_RANGE_CONFIG.max) {
    browserParams.set('price_max', String(priceRange.max))
    apiParams.set('price_max', String(priceRange.max))
  }

  if (areaRange.min > AREA_RANGE_CONFIG.min) {
    browserParams.set('area_min', String(areaRange.min))
    apiParams.set('area_min', String(areaRange.min))
  }
  if (areaRange.max < AREA_RANGE_CONFIG.max) {
    browserParams.set('area_max', String(areaRange.max))
    apiParams.set('area_max', String(areaRange.max))
  }

  if (roomsRange.min > ROOMS_RANGE_CONFIG.min) {
    browserParams.set('rooms_min', String(roomsRange.min))
    apiParams.set('rooms_min', String(roomsRange.min))
  }
  if (roomsRange.max < ROOMS_RANGE_CONFIG.max) {
    browserParams.set('rooms_max', String(roomsRange.max))
    apiParams.set('rooms_max', String(roomsRange.max))
  }

  browserParams.set('sort', sortOption)
  browserParams.set('per_page', String(perPage))
  browserParams.set('currency', currency)
  if (page > 1) {
    browserParams.set('page', String(page))
  }

  apiParams.set('sort', sortOption)
  apiParams.set('page', String(page))
  apiParams.set('page_size', String(perPage))
  apiParams.set('per_page', String(perPage))
  apiParams.set('currency', currency)
  apiParams.set('status', 'active')
  if (scope.regionSlug) {
    apiParams.set('region_slug', scope.regionSlug)
  }
  if (scope.citySlug) {
    apiParams.set('city_slug', scope.citySlug)
  }

  return {
    browserParams,
    apiParams,
  }
}

export function toSearchPageUrl(browserParams) {
  return `${window.location.pathname}${
    browserParams.toString() ? `?${browserParams.toString()}` : ''
  }`
}
