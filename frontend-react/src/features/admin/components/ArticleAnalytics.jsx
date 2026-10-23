import { useEffect, useState } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

const PERIODS = [7, 28, 90]
const NUMBER = new Intl.NumberFormat('uk-UA')

function ArticleAnalytics() {
  const [period, setPeriod] = useState(28)
  const [state, setState] = useState({ loading: true, rows: [], error: '' })

  useEffect(() => {
    let active = true
    apiClient.get(apiEndpoints.adminArticleAnalytics, { query: { period }, retry: 1 })
      .then(({ data }) => { if (active) setState({ loading: false, rows: data?.results || [], error: '' }) })
      .catch((error) => { if (active) setState({ loading: false, rows: [], error: error?.message || 'Не вдалося завантажити аналітику.' }) })
    return () => { active = false }
  }, [period])

  return <details className="article-import-panel article-analytics" open>
    <summary>Аналітика статей</summary>
    <div className="article-import-panel__content">
      <p>Власна статистика DOMINIUM без персональних даних: від перегляду статті до переходів сайтом, обраного та заявки.</p>
      <div className="admin-toolbar">{PERIODS.map((days) => <button key={days} type="button" className={`admin-button ${days === period ? 'admin-button--primary' : 'admin-button--secondary'}`} onClick={() => { setState((current) => ({ ...current, loading: true, error: '' })); setPeriod(days) }}>{days} днів</button>)}</div>
      {state.loading ? <p role="status">Завантаження…</p> : null}
      {state.error ? <div className="admin-alert admin-alert--error">{state.error}</div> : null}
      {!state.loading && !state.error ? <div className="admin-table-wrap"><table className="admin-table admin-table--compact"><thead><tr><th>Стаття</th><th>Перегляди</th><th>Відвідувачі</th><th>Переходи зі статті</th><th>Сторінки після</th><th>Обране</th><th>Заявки</th></tr></thead><tbody>
        {state.rows.map((row) => <tr key={row.id}><td><a href={`/articles/${row.slug}/`} target="_blank" rel="noreferrer">{row.title}</a>{!row.is_published ? <div className="admin-property-meta">Чернетка</div> : null}</td><td>{NUMBER.format(row.views)}</td><td>{NUMBER.format(row.visitors)}</td><td>{NUMBER.format(row.internal_clicks)}</td><td>{NUMBER.format(row.site_pages)}</td><td>{NUMBER.format(row.favorites)}</td><td>{NUMBER.format(row.consultations)}</td></tr>)}
        {!state.rows.length ? <tr><td colSpan="7">Даних за цей період ще немає.</td></tr> : null}
      </tbody></table></div> : null}
    </div>
  </details>
}

export default ArticleAnalytics
