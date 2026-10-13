import assert from 'node:assert/strict'
import { after, test } from 'node:test'

import apiClient from '../src/shared/api/client.js'
import { ensureCsrfToken } from '../src/shared/utils/csrf.js'

const originalDocument = globalThis.document
const originalFetch = globalThis.fetch
const originalWindow = globalThis.window

after(() => {
  if (originalDocument === undefined) {
    delete globalThis.document
  } else {
    globalThis.document = originalDocument
  }
  globalThis.fetch = originalFetch
  if (originalWindow === undefined) {
    delete globalThis.window
  } else {
    globalThis.window = originalWindow
  }
})

test('uses Django-rendered token when React token is blank and cookie is HttpOnly', async () => {
  let requestedUrl = ''
  globalThis.document = {
    getElementById: (id) => ({ value: id === 'django-csrf-token' ? 'masked-django-token' : '' }),
    cookie: '',
  }
  globalThis.fetch = async (url) => {
    requestedUrl = String(url)
    throw new Error('Unexpected request: a rendered CSRF token is already available')
  }

  assert.equal(await ensureCsrfToken(), 'masked-django-token')
  assert.equal(requestedUrl, '')
})

test('sends the Django-rendered CSRF token with logout POST', async () => {
  let requestHeaders
  globalThis.document = {
    getElementById: (id) => ({ value: id === 'django-csrf-token' ? 'masked-django-token' : '' }),
    cookie: '',
  }
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = async (_url, options) => {
    requestHeaders = new Headers(options.headers)
    return new Response('', { status: 200 })
  }

  await apiClient.post('/logout/', { parseAs: 'raw', withJsonAccept: false })

  assert.equal(requestHeaders.get('X-CSRFToken'), 'masked-django-token')
})
