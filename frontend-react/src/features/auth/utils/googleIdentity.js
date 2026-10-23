import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

let googleIdentityScriptPromise = null

export function loadGoogleIdentityScript({
  windowObject = window,
  documentObject = document,
} = {}) {
  if (windowObject.google?.accounts?.id) return Promise.resolve(windowObject.google)
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existing = documentObject.querySelector('script[data-google-identity]')
    const script = existing || documentObject.createElement('script')

    const finish = () => {
      if (windowObject.google?.accounts?.id) {
        resolve(windowObject.google)
      } else {
        googleIdentityScriptPromise = null
        reject(new Error('Google Identity Services did not initialize.'))
      }
    }
    const fail = () => {
      googleIdentityScriptPromise = null
      reject(new Error('Google Identity Services failed to load.'))
    }

    script.onload = finish
    script.onerror = fail
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.googleIdentity = 'true'
      documentObject.head.appendChild(script)
    }
  })

  return googleIdentityScriptPromise
}

export async function exchangeGoogleCredential(
  credential,
  { apiClientObject = apiClient } = {},
) {
  const token = String(credential || '').trim()
  if (!token) throw new Error('Google credential is required.')

  const { data } = await apiClientObject.postJson(apiEndpoints.googleIdentityLogin, {
    credential: token,
  })
  return data?.user || null
}
