import apiClient from '../../../../shared/api/client.js'
import { apiEndpoints } from '../../../../shared/api/endpoints.js'

export default function useLikesLikeActions({
  userIsAuthenticated = false,
  requestAuth,
  setLikedIds,
  showToast,
}) {
  const toggleLike = async (propertyId) => {
    if (!userIsAuthenticated) {
      requestAuth('/likes/')
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
      } else if (payload.status === 'unliked') {
        showToast('Видалено з обраного')
      }
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        requestAuth('/likes/')
        return
      }
      showToast('Не вдалося оновити обране', true)
    }
  }

  return {
    toggleLike,
  }
}
