import test from 'node:test'
import assert from 'node:assert/strict'
import { buildJourneyDashboard } from '../src/features/admin/model/journeyAnalyticsModel.js'

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
