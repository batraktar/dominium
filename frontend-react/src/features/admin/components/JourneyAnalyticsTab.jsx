import { useEffect, useMemo, useState } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { buildJourneyDashboard } from '../model/journeyAnalyticsModel.js'

const LABELS = {
  page_view: 'Сторінка', search: 'Пошук', property_view: 'Об’єкт', article_view: 'Стаття',
  internal_click: 'Перехід', favorite: 'Обране', contact_click: 'Контакт', consultation: 'Заявка',
}
const SERIES = [
  ['sessions', 'Сесії', '#133e44'],
  ['property_views', 'Об’єкти', '#3b82f6'],
  ['consultations', 'Заявки', '#d97706'],
]

function TrendChart({ daily, max }) {
  if (!daily.length) return <p className="settings-muted">Тренд з’явиться після перших подій.</p>
  const width = 720; const height = 240; const pad = 34
  const x = (index) => pad + (index / Math.max(daily.length - 1, 1)) * (width - pad * 2)
  const y = (value) => height - pad - (Number(value || 0) / max) * (height - pad * 2)
  const area = `${pad},${height - pad} ${daily.map((item, index) => `${x(index)},${y(item.sessions)}`).join(' ')} ${width - pad},${height - pad}`
  return <div className="journey-trend">
    <div className="journey-legend">{SERIES.map(([, label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Динаміка сесій, переглядів об’єктів і заявок за днями">
      <defs><linearGradient id="journeyArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity=".25" /><stop offset="1" stopColor="#3b82f6" stopOpacity="0" /></linearGradient><filter id="journeyGlow"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#133e44" floodOpacity=".18" /></filter></defs>
      {[0, .25, .5, .75, 1].map((part) => <g key={part}><line className="journey-trend__grid" x1={pad} x2={width - pad} y1={y(max * part)} y2={y(max * part)} /><text x="2" y={y(max * part) + 4}>{Math.round(max * part)}</text></g>)}
      <polygon points={area} fill="url(#journeyArea)" />
      {SERIES.map(([key, label, color]) => <g key={key} filter="url(#journeyGlow)"><polyline aria-label={label} points={daily.map((item, index) => `${x(index)},${y(item[key])}`).join(' ')} style={{ stroke: color }} />{daily.map((item, index) => <circle key={`${key}-${item.date}`} cx={x(index)} cy={y(item[key])} r="4" style={{ fill: color }}><title>{`${item.date}: ${label.toLowerCase()} — ${item[key] || 0}`}</title></circle>)}</g>)}
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
    <small>{index === 0 ? '100% відвідувачів' : `${item.conversion}% з попереднього етапу`}</small>
  </div>)}</div>
}

function RankedRows({ items, label, value = 'sessions', renderLabel }) {
  const maximum = Math.max(1, ...items.map((item) => Number(item[value]) || 0))
  return <div className="journey-card"><h3>{label}</h3>{items.length ? items.map((item, index) => <div className="journey-ranked" key={item.property_id || `${item.utm_source}-${item.utm_medium}-${index}`}>
    <div><span>{renderLabel(item)}</span><b>{item[value]}</b></div><i><span style={{ width: `${((item[value] || 0) / maximum) * 100}%` }} /></i>
  </div>) : <p className="settings-muted">Даних ще немає.</p>}</div>
}

function JourneyAnalyticsTab() {
  const [period, setPeriod] = useState(28)
  const [state, setState] = useState({ loading: true, error: '', data: null })
  useEffect(() => {
    let active = true
    apiClient.get(apiEndpoints.adminJourneyAnalytics, { query: { period } })
      .then((response) => { if (active) setState({ loading: false, error: '', data: response.data }) })
      .catch((error) => { if (active) setState({ loading: false, error: error?.message || 'Не вдалося завантажити аналітику.', data: null }) })
    return () => { active = false }
  }, [period])
  const overview = state.data?.overview || {}
  const dashboard = useMemo(() => buildJourneyDashboard(state.data || {}), [state.data])
  const metrics = [
    ['Сесії', overview.sessions, 'ri-user-3-line'], ['Перегляди об’єктів', overview.property_views, 'ri-home-4-line'],
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
    <div className="journey-card"><h3>Останні маршрути</h3>{state.data?.journeys?.length ? state.data.journeys.map((journey) => <div className="journey-path" key={`${journey.session_id}-${journey.last_seen_at}`}><div><b>{journey.customer?.name || `…${journey.session_id}`}</b><span>{journey.customer?.phone || journey.customer?.email || `${journey.source} · ${journey.first_path}`}</span></div><div className="journey-events">{journey.events.map((event, index) => <span key={`${event.created_at}-${index}`}>{LABELS[event.type] || event.type}</span>)}</div></div>) : <p className="settings-muted">Маршрутів ще немає.</p>}</div>
    <div className="journey-chart-about"><p><b>Що показує:</b> реальний рух відвідувача від першого візиту до заявки.</p><p><b>Як рахується:</b> кожна людина враховується один раз на етапі; відсоток показує перехід із попереднього етапу.</p></div>
  </section>
}

export default JourneyAnalyticsTab
