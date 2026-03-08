import { useEffect } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

export default function useSearchLoadLikedIdsEffect({
  userIsAuthenticated = false,
  likedIdsLength = 0,
  setLikedIds,
}) {
  useEffect(() => {
    if (!userIsAuthenticated || likedIdsLength) {
      return undefined
    }

    let cancelled = false

    const loadLikedIds = async () => {
      try {
        const { data: payload } = await apiClient.get(apiEndpoints.likedProperties, {
          query: { ids: 1 },
          retry: 1,
        })
        if (cancelled) return

        const ids = Array.isArray(payload?.results)
          ? payload.results
              .map((id) => Number(id))
              .filter((id) => Number.isFinite(id))
          : []
        setLikedIds(ids)
      } catch {
        // Keep empty likes if request fails.
      }
    }

    loadLikedIds()

    return () => {
      cancelled = true
    }
  }, [likedIdsLength, setLikedIds, userIsAuthenticated])
}
