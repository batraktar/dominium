import { apiClient } from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

export async function loadPropertyApiDemoPayload(options = {}) {
  const response = await apiClient.get(apiEndpoints.properties, {
    signal: options.signal,
    retry: options.retry ?? 1,
  })
  return response.data
}

export default {
  loadPropertyApiDemoPayload,
}
