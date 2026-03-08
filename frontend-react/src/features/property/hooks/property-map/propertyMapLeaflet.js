import L from 'leaflet'
import { escapeHtml } from '../../model/propertyDetailModel.js'
import { ensureLeafletMarkerIconsConfigured } from '../../../../shared/map/leafletMarkerIcons.js'

export function ensureMarkerIconsConfigured() {
  ensureLeafletMarkerIconsConfigured()
}

export function getPropertyLatLng(property) {
  return {
    latitude: Number(property?.latitude),
    longitude: Number(property?.longitude),
  }
}

export function createLeafletMap(mapElement, latitude, longitude) {
  return L.map(mapElement, { attributionControl: false }).setView([latitude, longitude], 15)
}

export function createLeafletMarker(map, latitude, longitude) {
  return L.marker([latitude, longitude]).addTo(map)
}

export function createLeafletLayers() {
  const mapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  })

  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    },
  )

  const satelliteLabelsLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
      opacity: 0.92,
      zIndex: 650,
    },
  )

  return {
    map: mapLayer,
    satellite: satelliteLayer,
    satelliteLabels: satelliteLabelsLayer,
  }
}

export function applyBasemap(map, layers, basemap) {
  Object.values(layers).forEach((layer) => {
    if (map.hasLayer(layer)) {
      map.removeLayer(layer)
    }
  })

  if (basemap === 'map') {
    layers.map.addTo(map)
  } else {
    layers.satellite.addTo(map)
    layers.satelliteLabels.addTo(map)
  }
}

export function syncMapMarker(marker, map, latitude, longitude, property) {
  if (!marker) return

  marker
    .setLatLng([latitude, longitude])
    .bindPopup(
      `<div class="font-fixel text-deepOcean"><b>${escapeHtml(
        property?.title || '',
      )}</b><br>${escapeHtml(property?.address || '')}</div>`,
    )
    .openPopup()

  map.setView([latitude, longitude], map.getZoom() || 15)
}

export function scheduleMapInvalidateSize(map, delay = 120) {
  window.setTimeout(() => map.invalidateSize(), delay)
}
