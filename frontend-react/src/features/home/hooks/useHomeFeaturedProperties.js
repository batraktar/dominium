import { useEffect, useState } from 'react'
import {
  HOME_FEATURED_FALLBACK_PROPERTIES,
  normalizeFeaturedProperty,
} from '../model/featuredPropertyModel.js'
import { loadHomeFeaturedMerged } from '../services/homeFeaturedApi.js'

export default function useHomeFeaturedProperties({ enabled = true } = {}) {
  const [featuredProperties, setFeaturedProperties] = useState(HOME_FEATURED_FALLBACK_PROPERTIES)

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let cancelled = false
    const abortController = new AbortController()

    const loadFeaturedProperties = async () => {
      try {
        const merged = await loadHomeFeaturedMerged({
          signal: abortController.signal,
          limit: 3,
        })
        if (cancelled) return

        const normalized = merged.slice(0, 3).map(normalizeFeaturedProperty)
        if (normalized.length) {
          setFeaturedProperties(normalized)
        }
      } catch (error) {
        if (error?.name === 'AbortError') return
        // Keep static fallback cards when API is unavailable.
      }
    }

    loadFeaturedProperties()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [enabled])

  return featuredProperties
}
