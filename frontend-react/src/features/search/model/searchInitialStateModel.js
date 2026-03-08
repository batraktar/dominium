import {
  AREA_RANGE_CONFIG,
  CURRENCY_OPTIONS,
  PER_PAGE_OPTIONS,
  PRICE_RANGE_CONFIG,
  ROOMS_RANGE_CONFIG,
  SORT_OPTIONS,
} from '../constants/searchConfig.js'
import { clamp, parseIntOr } from '../utils/searchPageUtils.js'

function resolveSort(params) {
  const sort = params.get('sort')
  return SORT_OPTIONS.some((option) => option.value === sort) ? sort : 'date'
}

function resolvePerPage(params) {
  const parsed = parseIntOr(params.get('per_page'), 9)
  return PER_PAGE_OPTIONS.includes(parsed) ? parsed : 9
}

function resolveCurrency(params) {
  const currency = String(params.get('currency') || '').toUpperCase()
  return CURRENCY_OPTIONS.some((option) => option.code === currency) ? currency : 'USD'
}

function parseRangeValue(params, key, fallback, config) {
  return clamp(parseIntOr(params.get(key), fallback), config.min, config.max)
}

function normalizeRange(minValue, maxValue, config) {
  const safeMin = Math.min(minValue, Math.max(config.min, maxValue - config.step))
  const safeMax = Math.max(maxValue, safeMin + config.step)
  return { min: safeMin, max: safeMax }
}

function applyLegacyRoomsFallback(params, roomsMin, roomsMax) {
  if (params.get('rooms_min') || params.get('rooms_max')) {
    return { min: roomsMin, max: roomsMax }
  }

  const legacyRooms = String(params.get('rooms') || '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)

  if (!legacyRooms.length) {
    return { min: roomsMin, max: roomsMax }
  }

  const numericValues = legacyRooms
    .filter((token) => /^\d+$/.test(token))
    .map((token) => Number(token))
  const hasPlus = legacyRooms.includes('5+')

  let nextMin = roomsMin
  let nextMax = roomsMax

  if (numericValues.length) {
    nextMin = clamp(Math.min(...numericValues), ROOMS_RANGE_CONFIG.min, ROOMS_RANGE_CONFIG.max)

    if (!hasPlus) {
      nextMax = clamp(
        Math.max(...numericValues),
        ROOMS_RANGE_CONFIG.min,
        ROOMS_RANGE_CONFIG.max,
      )
    }
  }

  if (hasPlus) {
    nextMax = ROOMS_RANGE_CONFIG.max
  }

  return { min: nextMin, max: nextMax }
}

export function parseSearchInitialState(search = '') {
  const params = new URLSearchParams(search)

  const priceMin = parseRangeValue(params, 'price_min', PRICE_RANGE_CONFIG.min, PRICE_RANGE_CONFIG)
  const priceMax = parseRangeValue(params, 'price_max', PRICE_RANGE_CONFIG.max, PRICE_RANGE_CONFIG)
  const areaMin = parseRangeValue(params, 'area_min', AREA_RANGE_CONFIG.min, AREA_RANGE_CONFIG)
  const areaMax = parseRangeValue(params, 'area_max', AREA_RANGE_CONFIG.max, AREA_RANGE_CONFIG)

  const roomsMin = parseRangeValue(params, 'rooms_min', ROOMS_RANGE_CONFIG.min, ROOMS_RANGE_CONFIG)
  const roomsMax = parseRangeValue(params, 'rooms_max', ROOMS_RANGE_CONFIG.max, ROOMS_RANGE_CONFIG)
  const resolvedRooms = applyLegacyRoomsFallback(params, roomsMin, roomsMax)

  return {
    query: params.get('q') || '',
    page: Math.max(parseIntOr(params.get('page'), 1), 1),
    sort: resolveSort(params),
    perPage: resolvePerPage(params),
    currency: resolveCurrency(params),
    propertyTypes: params.getAll('property_type').filter(Boolean),
    priceRange: normalizeRange(priceMin, priceMax, PRICE_RANGE_CONFIG),
    areaRange: normalizeRange(areaMin, areaMax, AREA_RANGE_CONFIG),
    roomsRange: normalizeRange(resolvedRooms.min, resolvedRooms.max, ROOMS_RANGE_CONFIG),
  }
}
