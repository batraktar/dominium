import { useRef, useState } from 'react'

export default function usePropertyMapState() {
  const [basemap, setBasemap] = useState('satellite')
  const mapElementRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const mapLayersRef = useRef({})
  const markerRef = useRef(null)

  return {
    basemap,
    setBasemap,
    mapElementRef,
    mapInstanceRef,
    mapLayersRef,
    markerRef,
  }
}
