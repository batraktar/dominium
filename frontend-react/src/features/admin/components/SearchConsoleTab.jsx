import { useEffect, useMemo, useState } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { normalizeSearchConsoleData, searchConsoleStateMessage } from '../model/searchConsoleModel.js'

const NUMBER = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 })
const PERIODS = [7, 28, 90]

function Metric({ label, value, suffix = '' }) {
  return <article className="search-console-metric"><span>{label}</span><strong>{NUMBER.format(value)}{suffix}</strong></article>
}

function ResultsTable({ title, rows }) {
  return (
    <section className="search-console-table">
      <h3>{title}</h3>
      {rows.length ? <div className="admin-table-wrap"><table className="admin-table admin-table--compact"><thead><tr><th>Запит / сторінка</th><th>Кліки</th><th>Покази</th><th>CTR</th><th>Позиція</th></tr></thead><tbody>
        {rows.map((row) => <tr key={row.url || row.label}><td>{row.url ? <a href={row.url} target="_blank" rel="noreferrer">{row.label}</a> : row.label}</td><td>{NUMBER.format(row.clicks)}</td><td>{NUMBER.format(row.impressions)}</td><td>{NUMBER.format(row.ctrPercent)}%</td><td>{NUMBER.format(row.position)}</td></tr>)}
      </tbody></table></div> : <p className="search-console-empty">За цей період даних ще немає.</p>}
    </section>
  )
}

function SearchConsoleTab() {
  const [period, setPeriod] = useState(28)
  const [state, setState] = useState({ loading: true, data: null, status: null })

  useEffect(() => {
    let active = true
    apiClient.get(apiEndpoints.adminSearchConsole, { query: { period }, retry: 1 })
      .then(({ data }) => {
        if (!active) return
        if (data.status !== 'ok') {
          setState({ loading: false, data: null, status: data.status || 'unavailable' })
          return
        }
        setState({ loading: false, data: normalizeSearchConsoleData(data), status: null })
      })
      .catch(() => {
        if (active) setState({ loading: false, data: null, status: 'unavailable' })
      })
    return () => { active = false }
  }, [period])
  const maxClicks = useMemo(() => Math.max(1, ...(state.data?.daily || []).map((item) => item.clicks)), [state.data])
  const selectPeriod = (days) => {
    if (state.loading || days === period) return
    setState({ loading: true, data: null, status: null })
    setPeriod(days)
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel__header">
        <div><h2 className="admin-panel__title">Google Search Console</h2><p className="admin-panel__subtitle">Органічні переходи з пошуку. Дані Google можуть надходити із затримкою 2–3 дні.</p></div>
        <div className="search-console-periods" aria-label="Період статистики">
          {PERIODS.map((days) => <button key={days} type="button" className={`admin-button ${period === days ? 'admin-button--primary' : 'admin-button--secondary'}`} aria-pressed={period === days} disabled={state.loading} onClick={() => selectPeriod(days)}>{days} днів</button>)}
        </div>
      </header>
      {state.loading ? <p className="search-console-state" role="status">Завантаження статистики…</p> : null}
      {state.status ? <div className="admin-alert admin-alert--info search-console-state" role="status">{searchConsoleStateMessage(state.status)}</div> : null}
      {state.data ? <div className="search-console-content">
        <div className="search-console-metrics"><Metric label="Кліки" value={state.data.metrics.clicks} /><Metric label="Покази" value={state.data.metrics.impressions} /><Metric label="CTR" value={state.data.metrics.ctrPercent} suffix="%" /><Metric label="Середня позиція" value={state.data.metrics.position} /></div>
        {state.data.incompleteFrom ? <div className="admin-alert admin-alert--info">Дані від {state.data.incompleteFrom} ще можуть змінитися.</div> : null}
        <section className="search-console-chart" aria-label="Кліки за днями"><h3>Кліки за днями</h3><div className="search-console-bars">{state.data.daily.map((item) => <div className="search-console-bar" key={item.date} title={`${item.date}: ${item.clicks}`}><span style={{ height: `${Math.max(4, (item.clicks / maxClicks) * 100)}%` }}></span><small>{item.date.slice(5)}</small></div>)}</div></section>
        <div className="search-console-tables"><ResultsTable title="Популярні запити" rows={state.data.topQueries} /><ResultsTable title="Популярні сторінки" rows={state.data.topPages} /></div>
      </div> : null}
    </section>
  )
}

export default SearchConsoleTab
