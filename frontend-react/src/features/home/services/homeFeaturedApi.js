import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { mergeUniqueById } from '../model/featuredPropertyModel.js'

function extractResults(payload) {
  return Array.isArray(payload?.results) ? payload.results : []
}

export async function loadHomeFeaturedPrimary(options = {}) {
  const { signal } = options
  const { data } = await apiClient.get(apiEndpoints.properties, {
    query: {
      featured: 'true',
      status: 'active',
      page: 1,
      page_size: 3,
    },
    retry: 1,
    signal,
  })

  return extractResults(data)
}

export async function loadHomeFeaturedFallback(options = {}) {
  const { signal } = options
  const { data } = await apiClient.get(apiEndpoints.properties, {
    query: {
      status: 'active',
      ordering: '-created_at',
      page: 1,
      page_size: 6,
    },
    retry: 1,
    signal,
  })

  return extractResults(data)
}

export async function loadHomeFeaturedMerged(options = {}) {
  const { signal, limit = 3 } = options
  const primary = await loadHomeFeaturedPrimary({ signal })

  if (primary.length >= limit) {
    return primary.slice(0, limit)
  }

  const fallback = await loadHomeFeaturedFallback({ signal })
  return mergeUniqueById(primary, fallback, limit)
}
