import { useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'
import { ensureLeafletMarkerIconsConfigured } from '../../../../shared/map/leafletMarkerIcons.js'
import {
  OSM_FALLBACK_LAYER,
  buildMapPopupHtml,
} from '../../model/mapThemeModel.js'

const DEFAULT_LAT = 48.6208
const DEFAULT_LON = 22.2879
const DEFAULT_ZOOM = 8

function buildLayer(definition) {
  const options = {
    attribution: definition?.attribution || '',
    maxZoom: definition?.maxZoom || 19,
  }

  if (definition?.subdomains) options.subdomains = definition.subdomains
  if (typeof definition?.opacity === 'number') options.opacity = definition.opacity
  if (typeof definition?.zIndex === 'number') options.zIndex = definition.zIndex

  return L.tileLayer(definition?.url || OSM_FALLBACK_LAYER.url, options)
}

export default function useInteractiveMapLeaflet({
  basemap,
  baseLayers,
  filteredProperties,
  setActivePropertyId,
}) {
  ensureLeafletMarkerIconsConfigured()

  const mapElementRef = useRef(null)
  const mapRef = useRef(null)
  const markerLayerRef = useRef(null)
  const mapLayersRef = useRef({})
  const markerByIdRef = useRef(new Map())
  const layerErrorsRef = useRef({ map: 0, satellite: 0 })
  const activeLayerNameRef = useRef(null)

  const applyVisibleLayer = useCallback(
    (choice) => {
      const map = mapRef.current
      const layers = mapLayersRef.current
      if (!map || !layers.map || !layers.satellite || !layers.satelliteLabels || !layers.osmFallback) {
        return
      }

      const normalizedChoice = choice === 'satellite' ? 'satellite' : 'map'
      const renderedBase =
        normalizedChoice === 'satellite'
          ? layerErrorsRef.current.satellite >= 8
            ? 'osmFallback'
            : 'satellite'
          : layerErrorsRef.current.map >= 8
            ? 'osmFallback'
            : 'map'

      const shouldShowSatelliteLabels =
        normalizedChoice === 'satellite' && renderedBase === 'satellite'

      Object.entries(layers).forEach(([name, layer]) => {
        const isBaseLayer = name === renderedBase
        const isLabelsLayer = name === 'satelliteLabels' && shouldShowSatelliteLabels
        if (!isBaseLayer && !isLabelsLayer && map.hasLayer(layer)) {
          map.removeLayer(layer)
        }
      })

      if (!map.hasLayer(layers[renderedBase])) {
        map.addLayer(layers[renderedBase])
      }
      if (shouldShowSatelliteLabels && !map.hasLayer(layers.satelliteLabels)) {
        map.addLayer(layers.satelliteLabels)
      }

      activeLayerNameRef.current = renderedBase
    },
    [],
  )

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return

    mapRef.current = L.map(mapElementRef.current, {
      attributionControl: false,
      zoomControl: true,
    }).setView([DEFAULT_LAT, DEFAULT_LON], DEFAULT_ZOOM)

    markerLayerRef.current = L.layerGroup().addTo(mapRef.current)
    window.setTimeout(() => mapRef.current?.invalidateSize(), 350)
    const markerById = markerByIdRef.current

    return () => {
      markerById.clear()
      markerLayerRef.current = null
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const layers = {
      map: buildLayer(baseLayers.map),
      satellite: buildLayer(baseLayers.satellite),
      satelliteLabels: buildLayer(baseLayers.satelliteLabels),
      osmFallback: buildLayer(OSM_FALLBACK_LAYER),
    }
    mapLayersRef.current = layers
    layerErrorsRef.current = { map: 0, satellite: 0 }

    const handleMapTileError = () => {
      layerErrorsRef.current.map += 1
      if (basemap === 'map' && activeLayerNameRef.current === 'map' && layerErrorsRef.current.map >= 8) {
        applyVisibleLayer('map')
      }
    }

    const handleSatelliteTileError = () => {
      layerErrorsRef.current.satellite += 1
      if (
        basemap === 'satellite' &&
        activeLayerNameRef.current === 'satellite' &&
        layerErrorsRef.current.satellite >= 8
      ) {
        applyVisibleLayer('satellite')
      }
    }

    layers.map.on('tileerror', handleMapTileError)
    layers.satellite.on('tileerror', handleSatelliteTileError)

    applyVisibleLayer(basemap)

    return () => {
      layers.map.off('tileerror', handleMapTileError)
      layers.satellite.off('tileerror', handleSatelliteTileError)
      Object.values(layers).forEach((layer) => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer)
        }
      })
      mapLayersRef.current = {}
    }
  }, [applyVisibleLayer, basemap, baseLayers])

  useEffect(() => {
    applyVisibleLayer(basemap)
  }, [applyVisibleLayer, basemap])

  useEffect(() => {
    const map = mapRef.current
    const markerLayer = markerLayerRef.current
    if (!map || !markerLayer) return

    markerLayer.clearLayers()
    markerByIdRef.current.clear()

    const bounds = L.latLngBounds([])
    let markerCount = 0

    filteredProperties.forEach((item) => {
      try {
        const marker = L.marker([item.lat, item.lon])
        marker.bindPopup(buildMapPopupHtml(item), { maxWidth: 320 })
        marker.on('click', () => setActivePropertyId(item.id))
        marker.addTo(markerLayer)
        markerByIdRef.current.set(item.id, marker)
        bounds.extend([item.lat, item.lon])
        markerCount += 1
      } catch {
        // Ignore malformed points and continue rendering.
      }
    })

    if (markerCount > 0 && bounds.isValid()) {
      map.fitBounds(bounds.pad(0.18))
    } else {
      map.setView([DEFAULT_LAT, DEFAULT_LON], DEFAULT_ZOOM)
    }
  }, [filteredProperties, setActivePropertyId])

  const handleSelectProperty = useCallback(
    (item) => {
      const marker = markerByIdRef.current.get(item.id)
      if (!marker || !mapRef.current) return

      mapRef.current.flyTo([item.lat, item.lon], 16, { duration: 0.45 })
      marker.openPopup()
      setActivePropertyId(item.id)
    },
    [setActivePropertyId],
  )

  return {
    mapElementRef,
    handleSelectProperty,
  }
}
