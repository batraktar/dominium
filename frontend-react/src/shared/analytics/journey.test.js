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

test('shares visitor and visit across tabs but assigns each tab its own identity', () => {
  const localStorage = storage()
  const firstTab = getJourneyContext({ search: '' }, localStorage, '', storage(), 1000)
  const secondTab = getJourneyContext({ search: '' }, localStorage, '', storage(), 2000)

  assert.equal(firstTab.visitorId, secondTab.visitorId)
  assert.equal(firstTab.visitId, secondTab.visitId)
  assert.notEqual(firstTab.tabId, secondTab.tabId)
})

test('rotates a visit after thirty minutes of inactivity without changing visitor', () => {
  const localStorage = storage()
  const sessionStorage = storage()
  const first = getJourneyContext({ search: '' }, localStorage, '', sessionStorage, 1000)
  const active = getJourneyContext({ search: '' }, localStorage, '', sessionStorage, 1000 + 29 * 60 * 1000)
  const expired = getJourneyContext({ search: '' }, localStorage, '', sessionStorage, 1000 + 60 * 60 * 1000)

  assert.equal(first.visitId, active.visitId)
  assert.notEqual(active.visitId, expired.visitId)
  assert.equal(first.visitorId, expired.visitorId)
})
