import 'leaflet/dist/leaflet.css'
import {
  ensureMarkerIconsConfigured,
} from './property-map/propertyMapLeaflet.js'
import usePropertyMapLifecycleEffect from './property-map/usePropertyMapLifecycleEffect.js'
import usePropertyMapState from './property-map/usePropertyMapState.js'

export default function usePropertyMapController({ property = null, hasCoords = false }) {
  ensureMarkerIconsConfigured()

  const { basemap, setBasemap, mapElementRef, mapInstanceRef, mapLayersRef, markerRef } =
    usePropertyMapState()

  usePropertyMapLifecycleEffect({
    property,
    hasCoords,
    basemap,
    mapElementRef,
    mapInstanceRef,
    mapLayersRef,
    markerRef,
  })

  return {
    mapElementRef,
    basemap,
    setBasemap,
  }
}
