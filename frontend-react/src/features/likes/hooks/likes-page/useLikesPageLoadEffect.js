import { useEffect } from 'react'
import apiClient from '../../../../shared/api/client.js'
import { apiEndpoints } from '../../../../shared/api/endpoints.js'

export default function useLikesPageLoadEffect({
  userIsAuthenticated = false,
  requestAuth,
  setIsLoading,
  setLoadError,
  setProperties,
  setLikedIds,
}) {
  useEffect(() => {
    if (!userIsAuthenticated) {
      requestAuth('/likes/')
      setIsLoading(false)
      return undefined
    }

    let cancelled = false

    const loadLikedProperties = async () => {
      setIsLoading(true)
      setLoadError('')

      try {
        const { data: payload } = await apiClient.get(apiEndpoints.likedProperties, { retry: 1 })
        if (cancelled) return

        const items = Array.isArray(payload?.results) ? payload.results : []
        setProperties(items)
        setLikedIds(
          items
            .map((item) => Number(item?.id))
            .filter((id) => Number.isFinite(id)),
        )
      } catch (error) {
        if (cancelled) return
        if (error?.status === 401 || error?.status === 403) {
          requestAuth('/likes/')
          return
        }
        setLoadError('Не вдалося завантажити обране. Спробуйте ще раз.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadLikedProperties()

    return () => {
      cancelled = true
    }
  }, [
    requestAuth,
    setIsLoading,
    setLoadError,
    setProperties,
    setLikedIds,
    userIsAuthenticated,
  ])
}
