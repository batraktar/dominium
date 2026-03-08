import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { UiError } from '../../../shared/utils/api-error.js'

export async function getPropertyBySlug(slug, options = {}) {
  if (!slug) {
    throw new UiError({
      message: 'Некоректна адреса обʼєкта.',
      code: 'invalid_slug',
      status: 400,
    })
  }

  const { data } = await apiClient.get(apiEndpoints.propertiesBySlug(slug), {
    retry: 1,
    signal: options.signal,
  })
  const result = data?.result || null
  if (!result) {
    throw new UiError({
      message: 'Обʼєкт не знайдено.',
      code: 'empty_result',
      status: 404,
    })
  }
  return result
}

export async function getLikedPropertyIds(options = {}) {
  const { data } = await apiClient.get(apiEndpoints.likedProperties, {
    query: { ids: 1 },
    retry: 1,
    signal: options.signal,
  })

  if (!Array.isArray(data?.results)) return []
  return data.results.map((id) => Number(id)).filter((id) => Number.isFinite(id))
}

export async function togglePropertyLike(propertyId, options = {}) {
  const { data } = await apiClient.post(apiEndpoints.likeProperty(propertyId), {
    signal: options.signal,
  })
  return data || {}
}

export async function sendConsultation(payload, options = {}) {
  const { data } = await apiClient.postForm(apiEndpoints.consultation, payload, {
    signal: options.signal,
  })
  return data || {}
}
