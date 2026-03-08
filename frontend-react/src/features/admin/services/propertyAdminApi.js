import { apiClient } from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

function toIntegerOrNull(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : null
}

export async function loadAdminProperties(params = {}, options = {}) {
  const query = {
    page: params.page ?? 1,
    page_size: params.pageSize ?? 10,
    ordering: params.ordering ?? '-created_at',
    q: params.search || undefined,
    property_type: params.propertyType || undefined,
    deal_type: params.dealType || undefined,
    featured: params.featured || undefined,
    status: params.status || 'active',
  }

  const { data } = await apiClient.get(apiEndpoints.properties, {
    query,
    signal: options.signal,
  })
  return data
}

export async function loadAdminPropertyById(propertyId, options = {}) {
  const id = toIntegerOrNull(propertyId)
  if (!id) {
    throw new Error('Некоректний ID обʼєкта.')
  }

  const { data } = await apiClient.get(apiEndpoints.propertyItem(id), {
    signal: options.signal,
  })
  return data
}

export async function createAdminProperty(payload, options = {}) {
  const { data } = await apiClient.postJson(apiEndpoints.properties, payload, {
    signal: options.signal,
  })
  return data
}

export async function updateAdminProperty(propertyId, payload, options = {}) {
  const id = toIntegerOrNull(propertyId)
  if (!id) {
    throw new Error('Некоректний ID обʼєкта.')
  }

  const { data } = await apiClient.request(apiEndpoints.propertyItem(id), {
    method: 'PATCH',
    json: payload,
    csrf: true,
    signal: options.signal,
  })
  return data
}

export async function deleteAdminProperty(propertyId, options = {}) {
  const id = toIntegerOrNull(propertyId)
  if (!id) {
    throw new Error('Некоректний ID обʼєкта.')
  }

  const { data } = await apiClient.request(apiEndpoints.propertyItem(id), {
    method: 'DELETE',
    csrf: true,
    signal: options.signal,
  })
  return data
}

export async function runAdminBulkAction(action, ids, options = {}) {
  const payload = {
    action: String(action || '').trim().toLowerCase(),
    ids: Array.isArray(ids) ? ids : [],
  }

  const { data } = await apiClient.postJson(apiEndpoints.propertyBulkAction, payload, {
    signal: options.signal,
  })
  return data
}

export async function loadAdminPropertyTypes(options = {}) {
  const { data } = await apiClient.get(apiEndpoints.propertyTypes, {
    signal: options.signal,
  })
  return data
}

export async function loadAdminDealTypes(options = {}) {
  const { data } = await apiClient.get(apiEndpoints.dealTypes, {
    signal: options.signal,
  })
  return data
}

export async function loadAdminFeatures(options = {}) {
  const { data } = await apiClient.get(apiEndpoints.features, {
    signal: options.signal,
  })
  return data
}

export async function loadAdminHighlightSettings(options = {}) {
  const { data } = await apiClient.get(apiEndpoints.highlightSettings, {
    signal: options.signal,
  })
  return data
}

export async function saveAdminHighlightSettings(payload, options = {}) {
  const method = options.isCreate ? 'POST' : 'PATCH'
  const { data } = await apiClient.request(apiEndpoints.highlightSettings, {
    method,
    json: payload,
    csrf: true,
    signal: options.signal,
  })
  return data
}

export async function importAdminPropertyByLink(payload, options = {}) {
  const { data } = await apiClient.postJson(apiEndpoints.propertyImportLink, payload, {
    signal: options.signal,
  })
  return data
}

export async function importAdminPropertyByHtml(formData, options = {}) {
  const { data } = await apiClient.request(apiEndpoints.propertyImportHtml, {
    method: 'POST',
    body: formData,
    csrf: true,
    signal: options.signal,
  })
  return data
}

export async function loadAdminPropertyImages(propertyId, options = {}) {
  const id = toIntegerOrNull(propertyId)
  if (!id) {
    throw new Error('Некоректний ID обʼєкта.')
  }

  const { data } = await apiClient.get(apiEndpoints.propertyImages(id), {
    signal: options.signal,
  })
  return data
}

export async function uploadAdminPropertyImages(propertyId, files, options = {}) {
  const id = toIntegerOrNull(propertyId)
  if (!id) {
    throw new Error('Некоректний ID обʼєкта.')
  }

  const formData = new FormData()
  ;(Array.isArray(files) ? files : []).forEach((file) => {
    formData.append('images', file)
  })

  const { data } = await apiClient.request(apiEndpoints.propertyImages(id), {
    method: 'POST',
    body: formData,
    csrf: true,
    signal: options.signal,
  })
  return data
}

export async function setAdminPropertyImageMain(imageId, options = {}) {
  const id = toIntegerOrNull(imageId)
  if (!id) {
    throw new Error('Некоректний ID зображення.')
  }

  const { data } = await apiClient.request(apiEndpoints.propertyImageDetail(id), {
    method: 'PATCH',
    json: { is_main: true },
    csrf: true,
    signal: options.signal,
  })
  return data
}

export async function deleteAdminPropertyImage(imageId, options = {}) {
  const id = toIntegerOrNull(imageId)
  if (!id) {
    throw new Error('Некоректний ID зображення.')
  }

  const { data } = await apiClient.request(apiEndpoints.propertyImageDetail(id), {
    method: 'DELETE',
    csrf: true,
    signal: options.signal,
  })
  return data
}

export async function reorderAdminPropertyImages(propertyId, order, options = {}) {
  const id = toIntegerOrNull(propertyId)
  if (!id) {
    throw new Error('Некоректний ID обʼєкта.')
  }

  const { data } = await apiClient.postJson(
    apiEndpoints.propertyImagesReorder(id),
    { order: Array.isArray(order) ? order : [] },
    {
      signal: options.signal,
    },
  )
  return data
}

export default {
  loadAdminProperties,
  loadAdminPropertyById,
  createAdminProperty,
  updateAdminProperty,
  deleteAdminProperty,
  runAdminBulkAction,
  loadAdminPropertyTypes,
  loadAdminDealTypes,
  loadAdminFeatures,
  loadAdminHighlightSettings,
  saveAdminHighlightSettings,
  importAdminPropertyByLink,
  importAdminPropertyByHtml,
  loadAdminPropertyImages,
  uploadAdminPropertyImages,
  setAdminPropertyImageMain,
  deleteAdminPropertyImage,
  reorderAdminPropertyImages,
}
