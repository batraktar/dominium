import assert from 'node:assert/strict'
import { test } from 'node:test'

import { apiEndpoints } from '../src/shared/api/endpoints.js'
import { submitGoogleAuthInCurrentTab } from '../src/features/auth/utils/googleAuth.js'

test('uses the standard allauth login endpoint from the React client', () => {
  assert.equal(apiEndpoints.googleAuth, '/accounts/google/login/')
})

test('submits Google OAuth in the current tab and preserves the SPA route', () => {
  const submitted = []
  const documentObject = {
    createElement: (tagName) => tagName === 'form'
      ? {
          children: [],
          submit() {
            submitted.push(this)
          },
          appendChild(input) {
            this.children.push(input)
          },
        }
      : {},
    body: {
      appendChild(form) {
        submitted.push(form)
      },
    },
  }

  submitGoogleAuthInCurrentTab({
    authUrl: '/accounts/google/login/',
    nextPath: '/property/20-50000usd/?from=search#photos',
    csrfToken: 'masked-csrf-token',
    origin: 'https://dominium.com.ua',
    documentObject,
  })

  const form = submitted[1]
  assert.equal(form.method, 'post')
  assert.equal(form.target, '_self')
  assert.equal(form.action, 'https://dominium.com.ua/accounts/google/login/?process=login&next=%2Fproperty%2F20-50000usd%2F%3Ffrom%3Dsearch%23photos')
  assert.deepEqual(form.children, [
    { type: 'hidden', name: 'csrfmiddlewaretoken', value: 'masked-csrf-token' },
  ])
  assert.equal(submitted.length, 2)
})

test('rejects missing CSRF tokens rather than falling back to an intermediate login page', () => {
  assert.throws(
    () => submitGoogleAuthInCurrentTab({
      authUrl: '/accounts/google/login/',
      nextPath: '/search/',
      csrfToken: '',
      origin: 'https://dominium.com.ua',
      documentObject: {},
    }),
    /CSRF/,
  )
})

test('rejects external OAuth endpoints', () => {
  assert.throws(
    () => submitGoogleAuthInCurrentTab({
      authUrl: 'https://evil.example/login/',
      nextPath: '/search/',
      csrfToken: 'token',
      origin: 'https://dominium.com.ua',
      documentObject: {},
    }),
    /same origin/,
  )
})
