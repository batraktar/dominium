import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

function HighlightTab() {
  const [properties, setProperties] = useState([])
  const [highlightIds, setHighlightIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [settings, setSettings] = useState({ limit: 3, region_keyword: '', price_min: '', price_max: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [featuredRes, settingsRes, allRes] = await Promise.all([
        apiClient.get(apiEndpoints.properties, { query: { featured: 'true', page_size: 50 } }),
        apiClient.get(apiEndpoints.highlightSettings),
        apiClient.get(apiEndpoints.propertyTypes),
      ])
      const featured = featuredRes.data?.results || []
      setHighlightIds(featured.map(p => p.id))
      setProperties(featured)

      const s = settingsRes.data?.result
      if (s) {
        setSettings({
          limit: s.limit || 3,
          region_keyword: s.region_keyword || '',
          price_min: s.price_min || '',
          price_max: s.price_max || '',
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleFeatured = async (propertyId) => {
    try {
      await apiClient.post(apiEndpoints.toggleFeatured(propertyId), { csrf: true })
      setHighlightIds(prev =>
        prev.includes(propertyId) ? prev.filter(id => id !== propertyId) : [...prev, propertyId]
      )
      load()
    } catch (err) {
      console.error(err)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setStatus(null)
    try {
      await apiClient.request(apiEndpoints.highlightSettings, {
        method: 'POST',
        json: {
          limit: Number(settings.limit) || 3,
          price_min: settings.price_min ? Number(settings.price_min) : null,
          price_max: settings.price_max ? Number(settings.price_max) : null,
          region_keyword: settings.region_keyword,
          property_type_ids: [],
        },
        csrf: true,
      })
      setStatus({ type: 'success', message: 'Налаштування збережено' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-deepOcean mb-4">
          <i className="ri-star-smile-line mr-2 text-yellow-500"></i>
          Налаштування «Топ 3»
        </h2>
        <p className="text-gray-500 mb-4 text-sm">
          Автоматичний підбір об'єктів для головної сторінки. Об'єкти додаються через зірку в таблиці «Об'єкти».
        </p>

        {status && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {status.message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Кількість (авто)</label>
            <input type="number" min="1" value={settings.limit}
              onChange={e => setSettings({ ...settings, limit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Регіон</label>
            <input type="text" value={settings.region_keyword}
              onChange={e => setSettings({ ...settings, region_keyword: e.target.value })}
              placeholder="напр. Хуст" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Мін. ціна $</label>
            <input type="number" min="0" value={settings.price_min}
              onChange={e => setSettings({ ...settings, price_min: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Макс. ціна $</label>
            <input type="number" min="0" value={settings.price_max}
              onChange={e => setSettings({ ...settings, price_max: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
        </div>
        <button onClick={saveSettings} disabled={saving}
          className="px-4 py-2 bg-deepOcean text-white rounded-lg text-sm hover:bg-deepOcean/90 transition disabled:opacity-50">
          {saving ? 'Збереження...' : 'Зберегти налаштування'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-deepOcean mb-4">
          Обрані об'єкти ({highlightIds.length})
        </h3>
        {loading ? (
          <p className="text-gray-400 text-sm">Завантаження...</p>
        ) : highlightIds.length === 0 ? (
          <p className="text-gray-400 text-sm">Об'єктів не обрано. Додайте через зірку в таблиці «Об'єкти».</p>
        ) : (
          <div className="space-y-2">
            {properties.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-bold text-deepOcean w-6">{i + 1}.</span>
                {p.main_image?.url && (
                  <img src={p.main_image.url} alt="" className="w-12 h-9 object-cover rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-deepOcean truncate">{p.title}</p>
                  <p className="text-xs text-gray-500">{p.address} — {Number(p.price).toLocaleString('uk-UA')} $</p>
                </div>
                <button onClick={() => toggleFeatured(p.id)}
                  className="text-yellow-500 hover:text-red-500 transition" title="Прибрати з Топ 3">
                  <i className="ri-star-fill text-lg"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HighlightTab
