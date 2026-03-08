import apiClient from '../../../../shared/api/client.js'
import { apiEndpoints } from '../../../../shared/api/endpoints.js'

export default function useSearchFeaturedActions({ setResults, showToast }) {
  const toggleFeatured = async (propertyId, isFeaturedNow) => {
    try {
      const { data } = await apiClient.postForm(apiEndpoints.toggleFeatured(propertyId), {
        featured: isFeaturedNow ? 'false' : 'true',
      })
      setResults((previous) =>
        previous.map((item) =>
          item.id === propertyId ? { ...item, featured_homepage: Boolean(data.featured) } : item,
        ),
      )

      showToast(
        data.featured ? 'Обʼєкт додано до блоку «Топ 3»' : 'Обʼєкт вилучено з блоку «Топ 3»',
      )
    } catch {
      showToast('Не вдалося оновити «Топ 3»', true)
    }
  }

  return {
    toggleFeatured,
  }
}
