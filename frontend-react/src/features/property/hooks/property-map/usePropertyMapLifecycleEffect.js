import { useEffect } from 'react'
import {
  applyBasemap,
  createLeafletLayers,
  createLeafletMap,
  createLeafletMarker,
  getPropertyLatLng,
  scheduleMapInvalidateSize,
  syncMapMarker,
} from './propertyMapLeaflet.js'

export default function usePropertyMapLifecycleEffect({
  property = null,
  hasCoords = false,
  basemap = 'satellite',
  mapElementRef,
  mapInstanceRef,
  mapLayersRef,
  markerRef,
}) {
  useEffect(() => {
    if (!property || !hasCoords || !mapElementRef.current) return

    const { latitude, longitude } = getPropertyLatLng(property)

    if (!mapInstanceRef.current) {
      const map = createLeafletMap(mapElementRef.current, latitude, longitude)

      mapLayersRef.current = createLeafletLayers()
      markerRef.current = createLeafletMarker(map, latitude, longitude)
      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current
    const layers = mapLayersRef.current

    applyBasemap(map, layers, basemap)
    syncMapMarker(markerRef.current, map, latitude, longitude, property)
    scheduleMapInvalidateSize(map, 120)
  }, [basemap, hasCoords, mapElementRef, mapInstanceRef, mapLayersRef, markerRef, property])

  useEffect(() => {
    return () => {
      if (!mapInstanceRef.current) return

      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
      mapLayersRef.current = {}
      markerRef.current = null
    }
  }, [mapInstanceRef, mapLayersRef, markerRef])
}
