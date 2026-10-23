import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeSearchConsoleData,
  searchConsoleStateMessage,
} from '../src/features/admin/model/searchConsoleModel.js'

test('normalizes metrics, daily series and result tables', () => {
  const result = normalizeSearchConsoleData({
    status: 'ok',
    period_days: 28,
    metrics: { clicks: 12, impressions: 300, ctr: 0.04, position: 5.25 },
    daily: [{ date: '2026-10-22', clicks: 3, impressions: 50, ctr: 0.06, position: 4 }],
    top_queries: [{ query: 'нерухомість', clicks: 8, impressions: 100, ctr: 0.08, position: 2 }],
    top_pages: [{ page: 'https://dominium.com.ua/articles/test/', clicks: 4, impressions: 80, ctr: 0.05, position: 3 }],
    incomplete_from: '2026-10-21',
  })

  assert.equal(result.metrics.ctrPercent, 4)
  assert.equal(result.metrics.position, 5.25)
  assert.equal(result.daily[0].clicks, 3)
  assert.equal(result.topQueries[0].label, 'нерухомість')
  assert.equal(result.topPages[0].label, '/articles/test/')
  assert.equal(result.incompleteFrom, '2026-10-21')
})

test('returns safe empty values and configuration messages', () => {
  assert.deepEqual(normalizeSearchConsoleData(null).daily, [])
  assert.match(searchConsoleStateMessage('not_configured'), /service account/i)
  assert.match(searchConsoleStateMessage('unavailable'), /недоступні/i)
})
