export const SORT_OPTIONS = [
  { value: 'date', label: 'За датою додавання' },
  { value: 'price_asc', label: 'За ціною (від дешевих)' },
  { value: 'price_desc', label: 'За ціною (від дорогих)' },
  { value: 'area_asc', label: 'За площею (від менших)' },
  { value: 'area_desc', label: 'За площею (від більших)' },
]

export const PER_PAGE_OPTIONS = [9, 12, 18, 24]

export const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'UAH', symbol: '₴', label: 'UAH (₴)' },
]

export const PRICE_RANGE_CONFIG = {
  min: 0,
  max: 250000,
  step: 1000,
}

export const AREA_RANGE_CONFIG = {
  min: 0,
  max: 250,
  step: 5,
}

export const ROOMS_RANGE_CONFIG = {
  min: 0,
  max: 5,
  step: 1,
}

export const FALLBACK_IMAGE_URL = 'https://via.placeholder.com/400x300'
