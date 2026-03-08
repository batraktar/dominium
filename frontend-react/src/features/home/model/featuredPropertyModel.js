import { toFrontendPath, toMediaPath } from '../../../shared/utils/url.js'

const FEATURED_PLACEHOLDER_IMAGE = 'https://placehold.co/1200x900'
const FEATURED_FALLBACK_DETAIL_URL = '/search/'

export const HOME_FEATURED_FALLBACK_PROPERTIES = [
  {
    id: 1,
    title: 'Сучасна квартира в центрі',
    image: FEATURED_PLACEHOLDER_IMAGE,
    price: '125000 $',
    address: 'м. Ужгород, вул. Загорська',
    rooms: 3,
    area: 92,
    dealType: 'Продаж',
    detailUrl: FEATURED_FALLBACK_DETAIL_URL,
  },
  {
    id: 2,
    title: 'Апартаменти для оренди',
    image: FEATURED_PLACEHOLDER_IMAGE,
    price: '950 $/міс',
    address: 'м. Київ, вул. Січових Стрільців',
    rooms: 2,
    area: 68,
    dealType: 'Оренда',
    detailUrl: FEATURED_FALLBACK_DETAIL_URL,
  },
  {
    id: 3,
    title: 'Будинок з терасою',
    image: FEATURED_PLACEHOLDER_IMAGE,
    price: '210000 $',
    address: 'м. Хуст, вул. Карпатська',
    rooms: 4,
    area: 154,
    dealType: 'Продаж',
    detailUrl: FEATURED_FALLBACK_DETAIL_URL,
  },
]

export function formatFeaturedPrice(value, dealTypeName) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'Ціна за запитом'

  const rounded = Math.round(numeric).toLocaleString('uk-UA')
  if ((dealTypeName || '').toLowerCase() === 'оренда') {
    return `${rounded} $/міс`
  }

  return `${rounded} $`
}

export function normalizeFeaturedProperty(item) {
  const dealType = item?.deal_type?.name || 'Продаж'
  const mainImageUrl = item?.main_image?.url || item?.images?.[0]?.url

  return {
    id: item?.id ?? Math.random(),
    title: item?.title || 'Обʼєкт нерухомості',
    image: mainImageUrl ? toMediaPath(mainImageUrl, '') : FEATURED_PLACEHOLDER_IMAGE,
    price: formatFeaturedPrice(item?.price, dealType),
    address: item?.address || 'Адресу уточнюйте',
    rooms: item?.rooms || '-',
    area: item?.area || '-',
    dealType,
    detailUrl: toFrontendPath(
      item?.absolute_url || (item?.slug ? `/property/${item.slug}/` : FEATURED_FALLBACK_DETAIL_URL),
      FEATURED_FALLBACK_DETAIL_URL,
    ),
  }
}

export function mergeUniqueById(primary = [], fallback = [], limit = 3) {
  const merged = []
  const usedIds = new Set()

  const pushUnique = (item) => {
    if (!item || merged.length >= limit) return
    const itemId = item?.id

    if (itemId != null) {
      if (usedIds.has(itemId)) return
      usedIds.add(itemId)
    }

    merged.push(item)
  }

  primary.forEach(pushUnique)
  fallback.forEach(pushUnique)

  return merged.slice(0, limit)
}
