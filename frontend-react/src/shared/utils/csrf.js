import { apiEndpoints } from '../api/endpoints.js'

export function getCsrfTokenFromDom() {
  const tokenFromInput = document.getElementById('csrf-token')?.value
  if (tokenFromInput) return tokenFromInput

  const cookies = document.cookie ? document.cookie.split(';') : []
  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim()
    if (cookie.startsWith('csrftoken=')) {
      return decodeURIComponent(cookie.slice('csrftoken='.length))
    }
  }
  return ''
}

export async function ensureCsrfToken() {
  const existing = getCsrfTokenFromDom()
  if (existing) return existing

  try {
    const response = await fetch(apiEndpoints.csrf, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return getCsrfTokenFromDom()
    const data = await response.json().catch(() => ({}))
    return data?.csrfToken || getCsrfTokenFromDom()
  } catch {
    return getCsrfTokenFromDom()
  }
}
