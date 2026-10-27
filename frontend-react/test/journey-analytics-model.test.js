import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildJourneyDashboard,
  filterAnalyticsVisitors,
  summarizeVisitorPaths,
} from '../src/features/admin/model/journeyAnalyticsModel.js'

test('buildJourneyDashboard derives conversion rates and chart maxima safely', () => {
  const result = buildJourneyDashboard({
    funnel: [
      { key: 'sessions', label: 'Сесії', value: 20 },
      { key: 'property_view', label: 'Об’єкти', value: 10 },
      { key: 'intent', label: 'Намір', value: 4 },
      { key: 'consultation', label: 'Заявка', value: 2 },
    ],
    daily: [
      { date: '2026-10-26', sessions: 0, property_views: 0, consultations: 0 },
      { date: '2026-10-27', sessions: 5, property_views: 3, consultations: 1 },
    ],
  })

  assert.equal(result.overallConversion, 10)
  assert.deepEqual(result.funnel.map((item) => item.conversion), [100, 50, 40, 50])
  assert.equal(result.dailyMax, 5)
})

test('buildJourneyDashboard handles empty analytics', () => {
  assert.deepEqual(buildJourneyDashboard({}), {
    funnel: [], daily: [], dailyMax: 1, overallConversion: 0,
  })
})

test('filters visitor timelines by source, event and search text', () => {
  const visitors = [
    { visitor_id: 'one', source: 'google', ip_address: '203.0.113.7', customer: { name: 'Олена' }, events: [{ type: 'property_view' }] },
    { visitor_id: 'two', source: 'direct', ip_address: '198.51.100.4', customer: {}, events: [{ type: 'article_view' }] },
  ]
  assert.deepEqual(filterAnalyticsVisitors(visitors, { source: 'google', eventType: 'property_view', query: 'олена' }).map((row) => row.visitor_id), ['one'])
  assert.deepEqual(filterAnalyticsVisitors(visitors, { query: '198.51' }).map((row) => row.visitor_id), ['two'])
})

test('summarizes actual path transitions without merging separate events', () => {
  const rows = summarizeVisitorPaths([{ events: [
    { path: '/', target_path: '/articles/a/' },
    { path: '/articles/a/', target_path: '/property/x/' },
    { path: '/property/x/', target_path: '' },
  ] }])
  assert.deepEqual(rows, [
    { from: '/', to: '/articles/a/', count: 1 },
    { from: '/articles/a/', to: '/property/x/', count: 1 },
  ])
})

test('infers navigation from consecutive page views when no click target was recorded', () => {
  const rows = summarizeVisitorPaths([{ events: [
    { path: '/', target_path: '', created_at: '2026-10-28T10:00:00Z' },
    { path: '/search/', target_path: '', created_at: '2026-10-28T10:00:02Z' },
    { path: '/property/x/', target_path: '', created_at: '2026-10-28T10:00:04Z' },
  ] }])
  assert.deepEqual(rows, [
    { from: '/', to: '/search/', count: 1 },
    { from: '/search/', to: '/property/x/', count: 1 },
  ])
})
