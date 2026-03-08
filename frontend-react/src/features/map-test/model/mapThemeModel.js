import { toFrontendPath, toMediaPath } from '../../../shared/utils/url.js'

export const DEFAULT_THEME_ID = 'premium_light'
export const DEFAULT_STORAGE_KEY = 'dominium-map-theme'

export const FALLBACK_THEMES = {
  premium_light: {
    label: 'Premium Light',
    defaultBasemap: 'satellite',
    baseLayers: {
      map: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      },
      satelliteLabels: {
        url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
        opacity: 0.92,
        zIndex: 650,
      },
    },
  },
  dark_contrast: {
    label: 'Dark Contrast',
    defaultBasemap: 'map',
    baseLayers: {
      map: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      },
      satelliteLabels: {
        url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
        opacity: 0.98,
        zIndex: 650,
      },
    },
  },
  minimal_classic: {
    label: 'Minimal Classic',
    defaultBasemap: 'map',
    baseLayers: {
      map: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      },
      satelliteLabels: {
        url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
        opacity: 0.9,
        zIndex: 650,
      },
    },
  },
}

export const OSM_FALLBACK_LAYER = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19,
}

export function isObject(value) {
  return typeof value === 'object' && value !== null
}

export function isBasemapName(value) {
  return value === 'map' || value === 'satellite'
}

export function mergeBaseLayers(baseLayers, overrideLayers) {
  const base = isObject(baseLayers) ? baseLayers : {}
  const override = isObject(overrideLayers) ? overrideLayers : {}
  const keys = new Set([...Object.keys(base), ...Object.keys(override)])
  const merged = {}

  keys.forEach((key) => {
    merged[key] = {
      ...(isObject(base[key]) ? base[key] : {}),
      ...(isObject(override[key]) ? override[key] : {}),
    }
  })

  return merged
}

export function readStoredThemeId(storageKey = DEFAULT_STORAGE_KEY) {
  try {
    return window.localStorage.getItem(storageKey) || ''
  } catch {
    return ''
  }
}

export function writeStoredThemeId(themeId, storageKey = DEFAULT_STORAGE_KEY) {
  try {
    window.localStorage.setItem(storageKey, themeId)
  } catch {
    // Private mode can block storage. Safe to ignore.
  }
}

export function readMapThemeSettings() {
  const config = isObject(window.DOMINIUM_MAP_CONFIG) ? window.DOMINIUM_MAP_CONFIG : {}
  const storageKey =
    typeof config.storageKey === 'string' && config.storageKey.trim()
      ? config.storageKey.trim()
      : DEFAULT_STORAGE_KEY

  const configuredThemes = isObject(config.themes) ? config.themes : {}
  const themeIds = new Set([...Object.keys(FALLBACK_THEMES), ...Object.keys(configuredThemes)])
  const themes = {}

  themeIds.forEach((themeId) => {
    const fallbackTheme = FALLBACK_THEMES[themeId] || FALLBACK_THEMES[DEFAULT_THEME_ID]
    const configuredTheme = isObject(configuredThemes[themeId]) ? configuredThemes[themeId] : {}

    themes[themeId] = {
      label:
        typeof configuredTheme.label === 'string' && configuredTheme.label.trim()
          ? configuredTheme.label.trim()
          : fallbackTheme.label,
      defaultBasemap: isBasemapName(configuredTheme.defaultBasemap)
        ? configuredTheme.defaultBasemap
        : fallbackTheme.defaultBasemap,
      baseLayers: mergeBaseLayers(fallbackTheme.baseLayers, configuredTheme.baseLayers),
    }
  })

  const configuredDefaultTheme =
    typeof config.defaultTheme === 'string' ? config.defaultTheme.trim() : ''
  const fallbackThemeId = themes[DEFAULT_THEME_ID] ? DEFAULT_THEME_ID : Object.keys(themes)[0]
  const defaultThemeId = themes[configuredDefaultTheme] ? configuredDefaultTheme : fallbackThemeId

  const storedThemeId = readStoredThemeId(storageKey)
  const themeId = themes[storedThemeId] ? storedThemeId : defaultThemeId
  const activeTheme = themes[themeId]

  const baseLayersWithLegacyOverrides = mergeBaseLayers(activeTheme.baseLayers, config.baseLayers)
  const baseLayers = mergeBaseLayers(FALLBACK_THEMES[DEFAULT_THEME_ID].baseLayers, baseLayersWithLegacyOverrides)

  const defaultBasemap = isBasemapName(config.defaultBasemap)
    ? config.defaultBasemap
    : activeTheme.defaultBasemap

  return {
    storageKey,
    themeId,
    themes,
    defaultBasemap: isBasemapName(defaultBasemap)
      ? defaultBasemap
      : FALLBACK_THEMES[DEFAULT_THEME_ID].defaultBasemap,
    baseLayers,
  }
}

function parseNumber(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

export function normalizeMapProperty(item) {
  const lat = parseNumber(item?.lat)
  const lon = parseNumber(item?.lon)

  if (lat === null || lon === null) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null

  const price = parseNumber(item?.price)

  return {
    id: Number.parseInt(item?.id ?? 0, 10) || 0,
    title: String(item?.title || ''),
    address: String(item?.address || ''),
    lat,
    lon,
    price,
    url: toFrontendPath(item?.url || (item?.slug ? `/property/${item.slug}/` : '#'), '#'),
    image: item?.image ? toMediaPath(item.image, '') : '',
    propertyType: String(item?.property_type || ''),
    dealType: String(item?.deal_type || ''),
  }
}

export function sanitizeMapProperties(input) {
  if (!Array.isArray(input)) return []
  return input.map(normalizeMapProperty).filter(Boolean)
}

export function formatMapPrice(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Ціна не вказана'
  }
  const formatted = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(value)
  return `${formatted} $`
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildMapPopupHtml(item) {
  const imageHtml = item.image
    ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="map-popup-image" loading="lazy" />`
    : ''

  const typeRow = [item.propertyType, item.dealType]
    .filter(Boolean)
    .map((value) => escapeHtml(value))
    .join(' • ')

  return `
    <div class="map-popup">
      ${imageHtml}
      <div class="map-popup-body">
        <h4>${escapeHtml(item.title || "Об'єкт")}</h4>
        <p>${escapeHtml(item.address || 'Адреса не вказана')}</p>
        ${typeRow ? `<div class="map-popup-meta">${typeRow}</div>` : ''}
        <div class="map-popup-price">${formatMapPrice(item.price)}</div>
        <a href="${escapeHtml(item.url || '#')}" class="map-popup-link">Перейти до обʼєкта</a>
      </div>
    </div>
  `
}

export function filterMapProperties(properties, query) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return properties

  return properties.filter((item) => {
    const haystack = `${normalizeText(item.title)} ${normalizeText(item.address)}`
    return haystack.includes(normalizedQuery)
  })
}
