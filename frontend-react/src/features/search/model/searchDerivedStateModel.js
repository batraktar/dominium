import {
  AREA_RANGE_CONFIG,
  PRICE_RANGE_CONFIG,
  ROOMS_RANGE_CONFIG,
  SORT_OPTIONS,
} from '../constants/searchConfig.js'
import { formatNumber } from '../utils/searchPageUtils.js'

export function buildPropertyTypeMap(propertyTypes = []) {
  const map = new Map()
  propertyTypes.forEach((item) => {
    map.set(item.slug, item.name)
  })
  return map
}

export function buildPropertyTypeSummary({
  selectedPropertyTypes = [],
  propertyTypeMap,
}) {
  if (!selectedPropertyTypes.length) return 'Обрати типи нерухомості'
  if (selectedPropertyTypes.length === 1) {
    return propertyTypeMap.get(selectedPropertyTypes[0]) || '1 тип'
  }
  return `Обрано: ${selectedPropertyTypes.length}`
}

export function buildActiveFilterChips({
  query = '',
  selectedPropertyTypes = [],
  propertyTypeMap,
  priceRange,
  areaRange,
  roomsRange,
}) {
  const chips = []

  if (query.trim()) {
    chips.push({
      key: 'query',
      label: 'Пошук',
      value: query.trim(),
    })
  }

  if (selectedPropertyTypes.length) {
    const names = selectedPropertyTypes.map((slug) => propertyTypeMap.get(slug) || slug).join(', ')
    chips.push({
      key: 'property_type',
      label: 'Тип',
      value: names,
    })
  }

  if (priceRange.min > PRICE_RANGE_CONFIG.min || priceRange.max < PRICE_RANGE_CONFIG.max) {
    const minLabel = `${formatNumber(priceRange.min)} $`
    const maxLabel = `${formatNumber(priceRange.max)} $`
    chips.push({
      key: 'price',
      label: 'Ціна',
      value: `${minLabel} — ${maxLabel}`,
    })
  }

  if (areaRange.min > AREA_RANGE_CONFIG.min || areaRange.max < AREA_RANGE_CONFIG.max) {
    const minLabel = `${formatNumber(areaRange.min)} м²`
    const maxLabel = `${formatNumber(areaRange.max)} м²`
    chips.push({
      key: 'area',
      label: 'Площа',
      value: `${minLabel} — ${maxLabel}`,
    })
  }

  if (roomsRange.min > ROOMS_RANGE_CONFIG.min || roomsRange.max < ROOMS_RANGE_CONFIG.max) {
    const minLabel = String(roomsRange.min)
    const maxLabel = roomsRange.max >= ROOMS_RANGE_CONFIG.max ? '6+' : String(roomsRange.max)
    chips.push({
      key: 'rooms',
      label: 'Кімнати',
      value: `${minLabel} — ${maxLabel}`,
    })
  }

  return chips
}

export function resolveSelectedSortLabel(sortOption) {
  return SORT_OPTIONS.find((option) => option.value === sortOption)?.label || SORT_OPTIONS[0].label
}
