function percent(value, total) {
  return total > 0 ? Math.round((Math.max(0, value) / total) * 100) : 0
}

export function buildJourneyDashboard(data = {}) {
  const rawFunnel = Array.isArray(data.funnel) ? data.funnel : []
  const funnel = rawFunnel.map((item, index) => {
    const value = Math.max(0, Number(item.value) || 0)
    const previous = index === 0 ? value : Math.max(0, Number(rawFunnel[index - 1]?.value) || 0)
    return { ...item, value, conversion: index === 0 ? (value ? 100 : 0) : percent(value, previous) }
  })
  const daily = Array.isArray(data.daily) ? data.daily : []
  const dailyMax = Math.max(1, ...daily.flatMap((item) => [
    Number(item.sessions) || 0,
    Number(item.property_views) || 0,
    Number(item.consultations) || 0,
  ]))
  const first = funnel[0]?.value || 0
  const last = funnel.at(-1)?.value || 0
  return { funnel, daily, dailyMax, overallConversion: percent(last, first) }
}
