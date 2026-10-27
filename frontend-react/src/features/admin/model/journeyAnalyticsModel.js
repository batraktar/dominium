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

export function filterAnalyticsVisitors(visitors = [], filters = {}) {
  const source = String(filters.source || '').toLowerCase()
  const eventType = String(filters.eventType || '')
  const query = String(filters.query || '').trim().toLowerCase()
  return visitors.filter((visitor) => {
    if (source && String(visitor.source || '').toLowerCase() !== source) return false
    if (eventType && !visitor.events?.some((event) => event.type === eventType)) return false
    if (!query) return true
    const haystack = [
      visitor.visitor_id, visitor.ip_address, visitor.customer?.name,
      visitor.customer?.phone, visitor.customer?.email,
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(query)
  })
}

export function summarizeVisitorPaths(visitors = []) {
  const counts = new Map()
  const addTransition = (from, to) => {
    if (!from || !to || from === to) return
    const key = `${from}\u0000${to}`
    const current = counts.get(key) || { from, to, count: 0 }
    current.count += 1
    counts.set(key, current)
  }
  visitors.forEach((visitor) => {
    const events = [...(visitor.events || [])].sort((left, right) =>
      String(left.created_at || '').localeCompare(String(right.created_at || '')))
    events.forEach((event, index) => {
      if (event.target_path) addTransition(event.path, event.target_path)
      const previous = events[index - 1]
      if (previous && !previous.target_path) addTransition(previous.path, event.path)
    })
  })
  return [...counts.values()].sort((left, right) => right.count - left.count || left.from.localeCompare(right.from))
}
