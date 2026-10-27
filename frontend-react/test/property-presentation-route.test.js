import assert from 'node:assert/strict'
import test from 'node:test'

import { apiEndpoints } from '../src/shared/api/endpoints.js'

test('presentation uses a readable non-API object route', () => {
  assert.equal(apiEndpoints.propertyPresentation('budynok-u-khusti'), '/presentation/budynok-u-khusti/')
})
