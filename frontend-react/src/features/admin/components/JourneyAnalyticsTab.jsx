import { useEffect, useState } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

const LABELS = {
  page_view: 'Сторінка', search: 'Пошук', property_view: 'Об’єкт', article_view: 'Стаття',
  internal_click: 'Перехід', favorite: 'Обране', contact_click: 'Контакт', consultation: 'Заявка',
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
  return <section className="admin-panel">
      <div className="admin-panel__heading"><div><h2>Рух відвідувачів</h2><p>Анонімна воронка від джерела до заявки.</p></div><div className="journey-periods">{[7, 28, 90].map((value) => <button type="button" key={value} className={period === value ? 'is-active' : ''} onClick={() => { setState((current) => ({ ...current, loading: true, error: '' })); setPeriod(value) }}>{value} днів</button>)}</div></div>
    {state.error ? <div className="admin-alert admin-alert--error">{state.error}</div> : null}
    <div className="admin-metric-grid journey-metrics">{[
      ['Сесії', overview.sessions], ['Перегляди об’єктів', overview.property_views], ['Намір', overview.intent], ['Заявки', overview.consultations],
    ].map(([label, value]) => <article className="admin-metric-card" key={label}><div><p className="admin-metric-card__label">{label}</p><p className="admin-metric-card__value">{state.loading ? '…' : (value || 0)}</p></div></article>)}</div>
    <div className="journey-grid">
      <div className="journey-card"><h3>Джерела</h3>{state.data?.sources?.length ? state.data.sources.map((source, index) => <div className="journey-row" key={`${source.utm_source}-${source.utm_medium}-${index}`}><span>{source.utm_source || 'direct'}{source.utm_medium ? ` / ${source.utm_medium}` : ''}</span><b>{source.sessions}</b></div>) : <p className="settings-muted">Даних ще немає.</p>}</div>
      <div className="journey-card"><h3>Популярні об’єкти</h3>{state.data?.top_properties?.length ? state.data.top_properties.map((item) => <div className="journey-row" key={item.property_id}><a href={`/property/${item.property__slug}/`} target="_blank" rel="noreferrer">{item.property__title}</a><b>{item.visitors}</b></div>) : <p className="settings-muted">Даних ще немає.</p>}</div>
    </div>
    <div className="journey-card"><h3>Останні маршрути</h3>{state.data?.journeys?.length ? state.data.journeys.map((journey) => <div className="journey-path" key={`${journey.session_id}-${journey.last_seen_at}`}><div><b>…{journey.session_id}</b><span>{journey.source} · {journey.first_path}</span></div><div className="journey-events">{journey.events.map((event, index) => <span key={`${event.created_at}-${index}`}>{LABELS[event.type] || event.type}</span>)}</div></div>) : <p className="settings-muted">Маршрутів ще немає.</p>}</div>
  </section>
}

export default JourneyAnalyticsTab
