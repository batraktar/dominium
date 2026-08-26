import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

function ClientsTab() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim())
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const query = search ? { q: search } : {}
      const response = await apiClient.get(apiEndpoints.clients, { query })
      setClients(response.data?.results || [])
    } catch (loadError) {
      setError(loadError?.message || 'Не вдалося завантажити клієнтів.')
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <div>
          <h2 className="admin-panel__title">
            <i className="ri-user-line mr-2" aria-hidden="true"></i>
            Клієнти
          </h2>
          <p className="admin-panel__subtitle">
            {loading ? 'Оновлюємо список...' : `${clients.length} клієнтів у поточній вибірці.`}
          </p>
        </div>
        <button type="button" onClick={load} className="admin-button admin-button--secondary" disabled={loading}>
          <i className={`ri-refresh-line ${loading ? 'admin-spin' : ''}`}></i>
          Оновити
        </button>
      </div>

      <div className="admin-filter-grid admin-filter-grid--compact">
        <label className="admin-field admin-search-field">
          <span>Пошук клієнта</span>
          <i className="ri-search-line" aria-hidden="true"></i>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Ім’я, телефон або email"
            className="admin-input admin-search-input"
          />
        </label>
      </div>

      {error ? (
        <div className="mx-5 mt-4">
          <div className="admin-alert admin-alert--error" role="status">
            <i className="ri-error-warning-line" aria-hidden="true"></i>
            {error}
          </div>
        </div>
      ) : null}

      <div className="admin-table-wrap">
        <table className="admin-table admin-table--compact">
          <thead>
            <tr>
              <th>Ім’я</th>
              <th>Телефон</th>
              <th>Email</th>
              <th className="text-center">Об’єкти</th>
              <th className="text-right">CRM</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5">
                  <div className="admin-empty-state">
                    <i className="ri-loader-4-line admin-spin" aria-hidden="true"></i>
                    <p>Завантаження клієнтів</p>
                    <span>Отримуємо дані з CRM-зв’язків.</span>
                  </div>
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="admin-empty-state">
                    <i className="ri-user-search-line" aria-hidden="true"></i>
                    <p>Клієнтів не знайдено</p>
                    <span>Спробуйте інший запит або очистьте пошук.</span>
                  </div>
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <p className="admin-property-title">{client.name || 'Без імені'}</p>
                    {client.crm_id ? (
                      <p className="admin-property-meta">CRM ID: {client.crm_id}</p>
                    ) : null}
                  </td>
                  <td>
                    {client.phone ? (
                      <a href={`tel:${client.phone}`} className="text-deepOcean hover:underline">
                        {client.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td>{client.email || <span className="text-gray-400">—</span>}</td>
                  <td className="text-center">
                    <span className="admin-badge admin-badge--neutral">
                      {client.property_count || 0}
                    </span>
                  </td>
                  <td className="text-right">
                    {client.crm_url ? (
                      <a
                        href={client.crm_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-icon-button"
                        title="Відкрити CRM"
                        aria-label="Відкрити CRM"
                      >
                        <i className="ri-external-link-line"></i>
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ClientsTab
