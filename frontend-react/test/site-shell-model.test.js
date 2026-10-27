import test from 'node:test'
import assert from 'node:assert/strict'
import { getPrimaryNavKey } from '../src/features/layout/model/siteShellModel.js'

test('marks only the matching primary navigation destination as active', () => {
  assert.equal(getPrimaryNavKey('/'), 'home')
  assert.equal(getPrimaryNavKey('/search/'), 'search')
  assert.equal(getPrimaryNavKey('/search/city/uzhhorod/'), 'search')
  assert.equal(getPrimaryNavKey('/likes/'), 'likes')
  assert.equal(getPrimaryNavKey('/api/admin/'), 'admin')
})

test('does not present content routes as a different primary destination', () => {
  assert.equal(getPrimaryNavKey('/property/example/'), '')
  assert.equal(getPrimaryNavKey('/articles/example/'), '')
  assert.equal(getPrimaryNavKey('/signup/'), '')
})
