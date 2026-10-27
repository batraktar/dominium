import { useEffect, useMemo, useState } from 'react'
import { Input, Select } from 'antd'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { buildJourneyDashboard, filterAnalyticsVisitors, summarizeVisitorPaths } from '../model/journeyAnalyticsModel.js'
import { normalizeSearchConsoleData } from '../model/searchConsoleModel.js'

const LABELS = {
  page_view: 'Сторінка', search: 'Пошук', property_view: 'Об’єкт', article_view: 'Стаття',
  internal_click: 'Перехід', favorite: 'Обране', contact_click: 'Контакт', consultation: 'Заявка',
  auth_start: 'Google-вхід', auth_success: 'Вхід успішний', auth_failure: 'Помилка входу',
}
const SERIES = [
  ['sessions', 'Сесії', '#133e44'],
  ['property_views', 'Об’єкти', '#3b82f6'],
  ['consultations', 'Заявки', '#d97706'],
]

function TrendChart({ daily, max }) {
  const [visible, setVisible] = useState(() => new Set(SERIES.map(([key]) => key)))
  const [tooltip, setTooltip] = useState(null)
  if (!daily.length) return <p className="settings-muted">Тренд з’явиться після перших подій.</p>
  const width = 720; const height = 240; const pad = 34
  const x = (index) => pad + (index / Math.max(daily.length - 1, 1)) * (width - pad * 2)
  const y = (value) => height - pad - (Number(value || 0) / max) * (height - pad * 2)
  const area = `${pad},${height - pad} ${daily.map((item, index) => `${x(index)},${y(item.sessions)}`).join(' ')} ${width - pad},${height - pad}`
  return <div className="journey-trend">
    <div className="journey-legend">{SERIES.map(([key, label, color]) => <button type="button" aria-pressed={visible.has(key)} className={visible.has(key) ? 'is-active' : ''} key={label} onClick={() => setVisible((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next })}><i style={{ background: color }} />{label}</button>)}</div>
    {tooltip ? <div className="journey-tooltip" role="status"><b>{tooltip.date}</b><span>{tooltip.label}: {tooltip.value}</span></div> : null}
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Динаміка сесій, переглядів об’єктів і заявок за днями">
      <defs><linearGradient id="journeyArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity=".25" /><stop offset="1" stopColor="#3b82f6" stopOpacity="0" /></linearGradient><filter id="journeyGlow"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#133e44" floodOpacity=".18" /></filter></defs>
      {[0, .25, .5, .75, 1].map((part) => <g key={part}><line className="journey-trend__grid" x1={pad} x2={width - pad} y1={y(max * part)} y2={y(max * part)} /><text x="2" y={y(max * part) + 4}>{Math.round(max * part)}</text></g>)}
      <polygon points={area} fill="url(#journeyArea)" />
      {SERIES.filter(([key]) => visible.has(key)).map(([key, label, color]) => <g key={key} filter="url(#journeyGlow)"><polyline aria-label={label} points={daily.map((item, index) => `${x(index)},${y(item[key])}`).join(' ')} style={{ stroke: color }} />{daily.map((item, index) => <circle tabIndex="0" key={`${key}-${item.date}`} cx={x(index)} cy={y(item[key])} r="4" style={{ fill: color }} onMouseEnter={() => setTooltip({ date: item.date, label, value: item[key] || 0 })} onMouseLeave={() => setTooltip(null)} onFocus={() => setTooltip({ date: item.date, label, value: item[key] || 0 })} onBlur={() => setTooltip(null)}><title>{`${item.date}: ${label.toLowerCase()} — ${item[key] || 0}`}</title></circle>)}</g>)}
    </svg>
    <div className="journey-axis"><span>{daily[0]?.date?.slice(5)}</span><span>{daily[Math.floor(daily.length / 2)]?.date?.slice(5)}</span><span>{daily.at(-1)?.date?.slice(5)}</span></div>
  </div>
}

function Funnel({ items }) {
  if (!items.length) return <p className="settings-muted">Даних для воронки ще немає.</p>
  const maximum = Math.max(items[0]?.value || 0, 1)
  return <div className="journey-funnel" aria-label="Воронка клієнта">{items.map((item, index) => <div className={`journey-funnel__step journey-funnel__step--${index + 1}`} key={item.key}>
    <div className="journey-funnel__label"><span>{index + 1}. {item.label}</span><b>{item.value}</b></div>
    <div className="journey-funnel__track"><span style={{ width: `${Math.max(4, (item.value / maximum) * 100)}%` }} /></div>
    <small>{index === 0 ? '100% візитів' : `${item.conversion}% з попереднього етапу`}</small>
  </div>)}</div>
}

function RankedRows({ items, label, value = 'sessions', renderLabel }) {
  const maximum = Math.max(1, ...items.map((item) => Number(item[value]) || 0))
  return <div className="journey-card"><h3>{label}</h3>{items.length ? items.map((item, index) => <div className="journey-ranked" key={item.property_id || `${item.utm_source}-${item.utm_medium}-${index}`}>
    <div><span>{renderLabel(item)}</span><b>{item[value]}</b></div><i><span style={{ width: `${((item[value] || 0) / maximum) * 100}%` }} /></i>
  </div>) : <p className="settings-muted">Даних ще немає.</p>}</div>
}

function VisitorExplorer({ visitors }) {
  const [filters, setFilters] = useState({ query: '', source: '', eventType: '' })
  const filtered = useMemo(() => filterAnalyticsVisitors(visitors, filters), [visitors, filters])
  const sources = [...new Set(visitors.map((item) => item.source).filter(Boolean))].sort()
  return <div className="journey-card journey-visitors"><div className="journey-card__heading"><div><h3>Відвідувачі та повний шлях</h3><p>{filtered.length} із {visitors.length} відвідувачів</p></div><div className="journey-filters"><Input allowClear placeholder="Ім’я, телефон, email або IP" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} /><Select allowClear placeholder="Джерело" value={filters.source || undefined} options={sources.map((value) => ({ value, label: value }))} onChange={(value) => setFilters((current) => ({ ...current, source: value || '' }))} /><Select allowClear placeholder="Подія" value={filters.eventType || undefined} options={Object.entries(LABELS).map(([value, label]) => ({ value, label }))} onChange={(value) => setFilters((current) => ({ ...current, eventType: value || '' }))} /></div></div>
    <div className="journey-visitor-list">{filtered.map((visitor) => <details key={visitor.visitor_id} className="journey-visitor"><summary><span><b>{visitor.customer?.name || visitor.customer?.phone || `Відвідувач …${visitor.visitor_id.slice(-8)}`}</b><small>{visitor.source} · {visitor.ip_address || 'IP не визначено'}</small></span><span>{visitor.visit_count} віз. · {visitor.tab_count} вклад. · {visitor.events?.length || 0} дій</span></summary><div className="journey-visitor__meta"><span>{visitor.customer?.email || 'Без email'}</span><span title={visitor.user_agent}>{visitor.user_agent || 'Браузер не визначено'}</span></div><ol className="journey-timeline">{visitor.events?.map((event, index) => <li key={`${event.created_at}-${index}`}><time>{new Date(event.created_at).toLocaleString('uk-UA')}</time><b>{LABELS[event.type] || event.type}</b><span>{event.path}{event.target_path ? ` → ${event.target_path}` : ''}</span><small>{event.tab_id ? `Вкладка …${event.tab_id}` : 'Стара подія без вкладки'}</small></li>)}</ol></details>)}</div>
    {!filtered.length ? <p className="settings-muted">За цими фільтрами маршрутів немає.</p> : null}
  </div>
}

function PathRows({ visitors }) {
  const paths = summarizeVisitorPaths(visitors).slice(0, 10)
  return <div className="journey-card"><h3>Куди переходять далі</h3>{paths.length ? paths.map((path) => <div className="journey-path-row" key={`${path.from}-${path.to}`}><span>{path.from}</span><i className="ri-arrow-right-line" /><b>{path.to}</b><em>{path.count}</em></div>) : <p className="settings-muted">Послідовних переходів ще немає.</p>}</div>
}

function ArticleRows({ rows }) {
  return <div className="journey-card"><h3>Статті</h3>{rows.length ? rows.slice(0, 8).map((row) => <div className="journey-content-row" key={row.id}><a href={`/articles/${row.slug}/`} target="_blank" rel="noreferrer">{row.title}</a><span>{row.visitors} чит. · {row.internal_clicks} переходів · {row.consultations} заявок</span></div>) : <p className="settings-muted">Даних про статті ще немає.</p>}</div>
}

function GoogleSummary({ data, status }) {
  return <div className="journey-card"><h3>Google Search</h3>{data ? <><div className="journey-google-metrics"><b>{data.metrics.clicks}<small>кліків</small></b><b>{data.metrics.impressions}<small>показів</small></b><b>{data.metrics.ctrPercent.toFixed(1)}%<small>CTR</small></b><b>{data.metrics.position.toFixed(1)}<small>позиція</small></b></div><div className="journey-content-row">Топ-запит <span>{data.topQueries[0]?.label || '—'}</span></div></> : <p className="settings-muted">{status === 'not_configured' ? 'Search Console ще не налаштовано.' : 'Дані Google тимчасово недоступні.'}</p>}</div>
}

function JourneyAnalyticsTab() {
  const [period, setPeriod] = useState(28)
  const [state, setState] = useState({ loading: true, error: '', data: null, articles: [], google: null, googleStatus: '' })
  useEffect(() => {
    let active = true
    Promise.allSettled([
      apiClient.get(apiEndpoints.adminJourneyAnalytics, { query: { period } }),
      apiClient.get(apiEndpoints.adminArticleAnalytics, { query: { period }, retry: 1 }),
      apiClient.get(apiEndpoints.adminSearchConsole, { query: { period }, retry: 1 }),
    ]).then(([journey, articles, google]) => {
      if (!active) return
      if (journey.status === 'rejected') {
        setState({ loading: false, error: journey.reason?.message || 'Не вдалося завантажити аналітику.', data: null, articles: [], google: null, googleStatus: '' })
        return
      }
      const googlePayload = google.status === 'fulfilled' ? google.value.data : null
      setState({ loading: false, error: '', data: journey.value.data, articles: articles.status === 'fulfilled' ? articles.value.data?.results || [] : [], google: googlePayload?.status === 'ok' ? normalizeSearchConsoleData(googlePayload) : null, googleStatus: googlePayload?.status || 'unavailable' })
    })
    return () => { active = false }
  }, [period])
  const overview = state.data?.overview || {}
  const dashboard = useMemo(() => buildJourneyDashboard(state.data || {}), [state.data])
  const visitors = state.data?.visitors || []
  const metrics = [
    ['Відвідувачі', overview.visitors ?? overview.sessions, 'ri-user-3-line'], ['Візити', overview.sessions, 'ri-route-line'], ['Перегляди об’єктів', overview.property_views, 'ri-home-4-line'],
    ['Виявили намір', overview.intent, 'ri-heart-3-line'], ['Заявки', overview.consultations, 'ri-chat-check-line'],
    ['Конверсія у заявку', `${dashboard.overallConversion}%`, 'ri-line-chart-line'],
  ]
  return <section className="admin-panel journey-dashboard">
    <div className="admin-panel__heading"><div><h2>Рух відвідувачів</h2><p>Від джерела й першого перегляду до наміру та заявки.</p></div><div className="journey-periods">{[7, 28, 90].map((value) => <button type="button" key={value} className={period === value ? 'is-active' : ''} onClick={() => { setState((current) => ({ ...current, loading: true, error: '' })); setPeriod(value) }}>{value} днів</button>)}</div></div>
    {state.error ? <div className="admin-alert admin-alert--error">{state.error}</div> : null}
    <div className="journey-kpis">{metrics.map(([label, value, icon]) => <article key={label}><i className={icon} /><span>{label}</span><b>{state.loading ? '…' : (value ?? 0)}</b></article>)}</div>
    <div className="journey-visual-grid">
      <div className="journey-card journey-card--wide"><h3>Динаміка за днями</h3><TrendChart daily={dashboard.daily} max={dashboard.dailyMax} /></div>
      <div className="journey-card"><h3>Воронка клієнта</h3><Funnel items={dashboard.funnel} /></div>
    </div>
    <div className="journey-grid">
      <RankedRows items={state.data?.sources || []} label="Джерела трафіку" renderLabel={(source) => `${source.utm_source || 'direct'}${source.utm_medium ? ` / ${source.utm_medium}` : ''}`} />
      <RankedRows items={state.data?.top_properties || []} label="Популярні об’єкти" value="visitors" renderLabel={(item) => <a href={`/property/${item.property__slug}/`} target="_blank" rel="noreferrer">{item.property__title}</a>} />
    </div>
    <div className="journey-grid"><PathRows visitors={visitors} /><GoogleSummary data={state.google} status={state.googleStatus} /></div>
    <ArticleRows rows={state.articles} />
    <VisitorExplorer visitors={visitors} />
    <div className="journey-chart-about"><p><b>Що показує:</b> реальний рух відвідувача від першого візиту до заявки.</p><p><b>Як рахується:</b> відвідувачі об’єднуються між вкладками, а воронка рахує унікальні візити на кожному етапі; відсоток показує перехід із попереднього етапу.</p></div>
  </section>
}

export default JourneyAnalyticsTab
