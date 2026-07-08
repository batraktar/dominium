import { useState, useEffect } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

function HighlightSettingsModal({ onClose }) {
  const [form, setForm] = useState({
    limit: 3,
    price_min: '',
    price_max: '',
    region_keyword: '',
    property_type_ids: [],
  })
  const [propertyTypes, setPropertyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        console.log('Loading highlight settings...')
        const [settingsRes, typesRes] = await Promise.all([
          apiClient.get(apiEndpoints.highlightSettings),
          apiClient.get(apiEndpoints.propertyTypes),
        ])
        console.log('Settings response:', settingsRes)
        const data = settingsRes.data?.result
        if (data) {
          setForm({
            limit: data.limit || 3,
            price_min: data.price_min || '',
            price_max: data.price_max || '',
            region_keyword: data.region_keyword || '',
            property_type_ids: data.property_type_ids || [],
          })
        }
        setPropertyTypes(typesRes.data?.results || [])
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      console.log('Saving highlight settings:', form)
      const res = await apiClient.request(apiEndpoints.highlightSettings, {
        method: 'POST',
        json: {
          limit: Number(form.limit) || 3,
          price_min: form.price_min ? Number(form.price_min) : null,
          price_max: form.price_max ? Number(form.price_max) : null,
          region_keyword: form.region_keyword,
          property_type_ids: form.property_type_ids,
        },
        csrf: true,
      })
      console.log('Save response:', res)
      setStatus({ type: 'success', message: 'Налаштування збережено' })
    } catch (err) {
      console.error('Save error:', err)
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const togglePropertyType = (id) => {
    setForm(prev => ({
      ...prev,
      property_type_ids: prev.property_type_ids.includes(id)
        ? prev.property_type_ids.filter(i => i !== id)
        : [...prev.property_type_ids, id],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-deepOcean">
            <i className="ri-star-smile-line mr-2 text-yellow-500"></i>
            Налаштування «Топ 3»
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <i className="ri-loader-4-line animate-spin text-2xl"></i>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {status && (
              <div className={`p-3 rounded-lg text-sm ${
                status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                {status.message}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Кількість об'єктів</label>
                <input
                  type="number"
                  min="1"
                  value={form.limit}
                  onChange={e => setForm({ ...form, limit: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Регіон / ключове слово</label>
                <input
                  type="text"
                  value={form.region_keyword}
                  onChange={e => setForm({ ...form, region_keyword: e.target.value })}
                  placeholder="Напр. Київ, Хуст"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Мін. ціна, $</label>
                <input
                  type="number"
                  min="0"
                  value={form.price_min}
                  onChange={e => setForm({ ...form, price_min: e.target.value })}
                  placeholder="Без обмежень"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Макс. ціна, $</label>
                <input
                  type="number"
                  min="0"
                  value={form.price_max}
                  onChange={e => setForm({ ...form, price_max: e.target.value })}
                  placeholder="Без обмежень"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Типи нерухомості (обмежити)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {propertyTypes.map(t => (
                  <label key={t.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.property_type_ids.includes(t.id)}
                      onChange={() => togglePropertyType(t.id)}
                      className="accent-deepOcean"
                    />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-deepOcean text-white rounded-lg font-medium hover:bg-deepOcean/90 transition disabled:opacity-50"
              >
                {saving ? 'Збереження...' : 'Зберегти'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
              >
                Закрити
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HighlightSettingsModal
