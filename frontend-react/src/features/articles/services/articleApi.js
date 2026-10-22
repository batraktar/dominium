import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

export async function getPublishedArticles(options = {}) {
  const { data } = await apiClient.get(apiEndpoints.articles, { signal: options.signal })
  return Array.isArray(data?.results) ? data.results : []
}

export async function getPublishedArticle(slug, options = {}) {
  const { data } = await apiClient.get(apiEndpoints.articleDetail(slug), {
    signal: options.signal,
  })
  return data?.result || null
}
