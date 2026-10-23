import assert from 'node:assert/strict'
import { test } from 'node:test'

import { apiEndpoints } from '../src/shared/api/endpoints.js'
import {
  exchangeGoogleCredential,
  loadGoogleIdentityScript,
} from '../src/features/auth/utils/googleIdentity.js'

test('uses same-origin Google credential endpoints', () => {
  assert.equal(apiEndpoints.googleIdentityConfig, '/api/auth/google-config/')
  assert.equal(apiEndpoints.googleIdentityLogin, '/api/auth/google/')
  assert.equal(apiEndpoints.googleAuthFallback, '/accounts/google/login/')
})

test('loads Google Identity Services only once', async () => {
  const appended = []
  const windowObject = {}
  const documentObject = {
    querySelector: () => null,
    createElement: () => ({ dataset: {} }),
    head: {
      appendChild(script) {
        appended.push(script)
        windowObject.google = { accounts: { id: {} } }
        script.onload()
      },
    },
  }

  await Promise.all([
    loadGoogleIdentityScript({ windowObject, documentObject }),
    loadGoogleIdentityScript({ windowObject, documentObject }),
  ])

  assert.equal(appended.length, 1)
  assert.equal(appended[0].src, 'https://accounts.google.com/gsi/client')
  assert.equal(appended[0].dataset.googleIdentity, 'true')
})

test('exchanges Google credential for a Django session', async () => {
  const calls = []
  const apiClientObject = {
    async postJson(path, payload) {
      calls.push([path, payload])
      return { data: { user: { is_authenticated: true, email: 'user@example.com' } } }
    },
  }

  const session = await exchangeGoogleCredential('signed-token', { apiClientObject })

  assert.deepEqual(calls, [[apiEndpoints.googleIdentityLogin, { credential: 'signed-token' }]])
  assert.equal(session.email, 'user@example.com')
})

test('rejects an empty Google credential before API submission', async () => {
  await assert.rejects(
    () => exchangeGoogleCredential('', { apiClientObject: {} }),
    /credential/i,
  )
})
