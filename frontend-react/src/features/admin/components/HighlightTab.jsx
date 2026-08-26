import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { CityAutocomplete } from './SettingsTab.jsx'

const NUMBER_FORMATTER = new Intl.NumberFormat('uk-UA')

function formatPrice(value) {
  if (value == null || value === '') return '—'
  return `${NUMBER_FORMATTER.format(Number(value))} $`
}

function HighlightTab() {
  const [properties, setProperties] = useState([])
  const [highlightIds, setHighlightIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [settings, setSettings] = useState({
    limit: 3,
    region_keyword: '',
    price_min: '',
    price_max: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setStatus(null)

    try {
      const [featuredRes, settingsRes] = await Promise.all([
        apiClient.get(apiEndpoints.properties, { query: { featured: 'true', page_size: 50 } }),
        apiClient.get(apiEndpoints.highlightSettings),
      ])
      const featured = featuredRes.data?.results || []
      setHighlightIds(featured.map((property) => property.id))
      setProperties(featured)

      const nextSettings = settingsRes.data?.result
      if (nextSettings) {
        setSettings({
          limit: nextSettings.limit || 3,
          region_keyword: nextSettings.region_keyword || '',
          price_min: nextSettings.price_min || '',
          price_max: nextSettings.price_max || '',
        })
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.message || 'Не вдалося завантажити налаштування «Топ 3».',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleFeatured = async (propertyId) => {
    setStatus(null)

    try {
      await apiClient.post(apiEndpoints.toggleFeatured(propertyId), { csrf: true })
      await load()
      setStatus({ type: 'success', message: 'Об’єкт прибрано з блоку «Топ 3».' })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.message || 'Не вдалося оновити об’єкт.',
      })
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
      setStatus({ type: 'success', message: 'Налаштування «Топ 3» збережено.' })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.message || 'Не вдалося зберегти налаштування.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <div>
          <h2 className="admin-panel__title">
            <i className="ri-star-smile-line mr-2 text-yellow-500" aria-hidden="true"></i>
            Топ 3
          </h2>
          <p className="admin-panel__subtitle">
            Налаштування автоматичного підбору і список об’єктів, які вже показуються на головній.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="admin-button admin-button--secondary"
          disabled={loading}
        >
          <i className={`ri-refresh-line ${loading ? 'admin-spin' : ''}`}></i>
          Оновити
        </button>
      </div>

      <div className="p-5">
        {status ? (
          <div className={`admin-alert admin-alert--${status.type}`} role="status">
            <i
              className={status.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}
              aria-hidden="true"
            ></i>
            {status.message}
          </div>
        ) : null}

        <section className="admin-form-section">
          <h3 className="admin-form-section__title">Правила автопідбору</h3>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Кількість</span>
              <input
                type="number"
                min="1"
                value={settings.limit}
                onChange={(event) => setSettings({ ...settings, limit: event.target.value })}
                className="admin-input"
              />
            </label>

            <label className="admin-field">
              <span>Регіон / місто</span>
              <CityAutocomplete
                value={settings.region_keyword}
                onChange={(value) => setSettings({ ...settings, region_keyword: value })}
              />
            </label>

            <label className="admin-field">
              <span>Мін. ціна</span>
              <input
                type="number"
                min="0"
                value={settings.price_min}
                onChange={(event) => setSettings({ ...settings, price_min: event.target.value })}
                className="admin-input"
              />
            </label>

            <label className="admin-field">
              <span>Макс. ціна</span>
              <input
                type="number"
                min="0"
                value={settings.price_max}
                onChange={(event) => setSettings({ ...settings, price_max: event.target.value })}
                className="admin-input"
              />
            </label>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="admin-button admin-button--primary"
            >
              <i className={saving ? 'ri-loader-4-line admin-spin' : 'ri-save-line'}></i>
              {saving ? 'Збереження...' : 'Зберегти правила'}
            </button>
          </div>
        </section>

        <section className="admin-form-section">
          <h3 className="admin-form-section__title">Обрані об’єкти ({highlightIds.length})</h3>

          {loading ? (
            <div className="admin-empty-state py-8">
              <i className="ri-loader-4-line admin-spin" aria-hidden="true"></i>
              <p>Завантаження</p>
              <span>Оновлюємо список об’єктів на головній.</span>
            </div>
          ) : highlightIds.length === 0 ? (
            <div className="admin-empty-state py-8">
              <i className="ri-star-line" aria-hidden="true"></i>
              <p>Об’єктів не обрано</p>
              <span>Додайте об’єкт через зірку у вкладці «Об’єкти».</span>
            </div>
          ) : (
            <div className="space-y-2">
              {properties.map((property, index) => (
                <div key={property.id} className="admin-highlight-row">
                  <span className="admin-highlight-row__index">{index + 1}</span>
                  {property.main_image?.url ? (
                    <img src={property.main_image.url} alt="" className="admin-property-thumb" />
                  ) : (
                    <div className="admin-property-thumb admin-property-thumb--empty" aria-hidden="true">
                      <i className="ri-image-line"></i>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="admin-property-title">{property.title}</p>
                    <p className="admin-property-meta">
                      {property.address || '—'} · {formatPrice(property.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFeatured(property.id)}
                    className="admin-icon-button admin-icon-button--featured"
                    title="Прибрати з Топ 3"
                    aria-label="Прибрати з Топ 3"
                  >
                    <i className="ri-star-fill"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default HighlightTab
