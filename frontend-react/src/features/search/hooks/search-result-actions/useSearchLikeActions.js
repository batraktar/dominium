import apiClient from '../../../../shared/api/client.js'
import { apiEndpoints } from '../../../../shared/api/endpoints.js'

export default function useSearchLikeActions({
  userIsAuthenticated = false,
  setLikedIds,
  showToast,
  requestAuth,
}) {
  const toggleLike = async (propertyId) => {
    if (!userIsAuthenticated) {
      requestAuth(`${window.location.pathname}${window.location.search}`)
      return
    }

    try {
      const { data: payload } = await apiClient.post(apiEndpoints.likeProperty(propertyId))
      setLikedIds((previous) => {
        if (payload.status === 'liked') {
          if (previous.includes(propertyId)) return previous
          return [...previous, propertyId]
        }

        if (payload.status === 'unliked') {
          return previous.filter((id) => id !== propertyId)
        }

        return previous
      })

      if (payload.status === 'liked') {
        showToast('Додано до обраного')
      }
      if (payload.status === 'unliked') {
        showToast('Видалено з обраного')
      }
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        requestAuth(`${window.location.pathname}${window.location.search}`)
        return
      }
      showToast('Не вдалося оновити обране', true)
    }
  }

  return {
    toggleLike,
  }
}
