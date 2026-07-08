import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

function ClientsTab() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = search ? { q: search } : {}
      const res = await apiClient.get(apiEndpoints.clients, { query })
      setClients(res.data?.results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-deepOcean">
          <i className="ri-user-line mr-2"></i>Клієнти
        </h2>
        <span className="text-sm text-gray-500">{clients.length} клієнтів</span>
      </div>

      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Пошук за ім'ям, телефоном або email..."
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean"
      />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <i className="ri-loader-4-line animate-spin text-2xl"></i>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <i className="ri-user-line text-3xl text-gray-200 mb-2 block"></i>
            <p className="text-sm">Клієнтів не знайдено</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">Ім'я</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-center">Об'єкти</th>
                <th className="px-4 py-3 text-right">CRM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-deepOcean">
                    {c.name || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="hover:text-deepOcean">{c.phone}</a>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.email || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.property_count > 0 ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-deepOcean/10 text-deepOcean text-xs font-bold">
                        {c.property_count}
                      </span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.crm_url && (
                      <a href={c.crm_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 text-xs">
                        <i className="ri-external-link-line"></i>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ClientsTab
