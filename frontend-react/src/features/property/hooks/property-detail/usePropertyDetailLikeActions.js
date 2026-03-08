import { togglePropertyLike } from '../../services/propertyApi.js'
import { getCurrentPathForAuth, requestPropertyAuth } from './propertyDetailAuth.js'

export default function usePropertyDetailLikeActions({
  property,
  userIsAuthenticated = false,
  setLiked,
  showToast,
}) {
  const toggleLike = async () => {
    if (!property) return

    if (!userIsAuthenticated) {
      requestPropertyAuth(getCurrentPathForAuth())
      return
    }

    try {
      const payload = await togglePropertyLike(property.id)
      if (payload.status === 'liked') {
        setLiked(true)
        showToast('Додано до обраного')
      } else if (payload.status === 'unliked') {
        setLiked(false)
        showToast('Видалено з обраного')
      }
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        requestPropertyAuth(getCurrentPathForAuth())
        return
      }
      showToast('Не вдалося оновити обране', true)
    }
  }

  return {
    toggleLike,
  }
}
