import test from 'node:test'
import assert from 'node:assert/strict'
import { getJourneyContext, getJourneySessionId } from './journey.js'

function storage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('keeps one anonymous session and first-touch attribution', () => {
  const localStorage = storage()
  const first = getJourneyContext(
    { search: '?utm_source=google&utm_medium=organic' },
    localStorage,
    'https://www.google.com/search?q=dominium',
  )
  const second = getJourneyContext(
    { search: '?utm_source=telegram' },
    localStorage,
    'https://t.me/dominium',
  )
  assert.equal(first.sessionId, second.sessionId)
  assert.equal(second.attribution.utm_source, 'google')
  assert.equal(second.attribution.utm_medium, 'organic')
})

test('returns the same journey session id for consultation attribution', () => {
  const localStorage = storage()
  const context = getJourneyContext({ search: '' }, localStorage, '')
  assert.equal(getJourneySessionId(localStorage), context.sessionId)
})
