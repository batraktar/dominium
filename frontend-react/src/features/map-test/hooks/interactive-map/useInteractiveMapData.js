import { useEffect, useMemo, useState } from 'react'
import { filterMapProperties } from '../../model/mapThemeModel.js'
import { loadInteractiveMapProperties } from '../../services/interactiveMapApi.js'

export default function useInteractiveMapData() {
  const [properties, setProperties] = useState([])
  const [query, setQuery] = useState('')
  const [activePropertyId, setActivePropertyId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadError, setHasLoadError] = useState(false)

  const filteredProperties = useMemo(
    () => filterMapProperties(properties, query),
    [properties, query],
  )

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setIsLoading(true)
      setHasLoadError(false)
      try {
        const next = await loadInteractiveMapProperties({ signal: controller.signal })
        setProperties(next)
      } catch (error) {
        if (error?.name === 'AbortError') return
        setHasLoadError(true)
        setProperties([])
      } finally {
        setIsLoading(false)
      }
    }

    load()

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!filteredProperties.some((item) => item.id === activePropertyId)) {
      setActivePropertyId(null)
    }
  }, [activePropertyId, filteredProperties])

  return {
    query,
    setQuery,
    filteredProperties,
    totalCount: filteredProperties.length,
    activePropertyId,
    setActivePropertyId,
    isLoading,
    hasLoadError,
  }
}
