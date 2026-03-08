import { apiClient } from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { sanitizeMapProperties } from '../model/mapThemeModel.js'

export async function loadInteractiveMapProperties(options = {}) {
  const response = await apiClient.get(apiEndpoints.interactiveMapData, {
    signal: options.signal,
    retry: options.retry ?? 1,
  })

  return sanitizeMapProperties(response.data?.results || [])
}

export default {
  loadInteractiveMapProperties,
}
