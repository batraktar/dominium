import { useState, useEffect } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

function PropertyEditModal({ propertyId, onClose, onSave }) {
  const [propData, setPropData] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [propertyTypes, setPropertyTypes] = useState([])
  const [dealTypes, setDealTypes] = useState([])
  const [images, setImages] = useState([])
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (!propertyId) return
    setLoading(true)
    setError(null)

    const loadData = async () => {
      try {
        const [propRes, typesRes, dealsRes, imagesRes] = await Promise.all([
          apiClient.request(apiEndpoints.propertyItem(propertyId)),
          apiClient.get(apiEndpoints.propertyTypes),
          apiClient.get(apiEndpoints.dealTypes),
          apiClient.request(`/api/properties/${propertyId}/images/`),
        ])
        const pd = propRes.data
        setPropData(pd)
        setForm({
          title: pd?.title || '',
          address: pd?.address || '',
          price: pd?.price || '',
          area: pd?.area || '',
          rooms: pd?.rooms || '',
          description: pd?.description || '',
          property_type_id: pd?.property_type?.id || '',
          deal_type_id: pd?.deal_type?.id || '',
          featured_homepage: pd?.featured_homepage || false,
          price_currency: pd?.price_currency || 'USD',
        })
        setPropertyTypes(typesRes.data?.results || [])
        setDealTypes(dealsRes.data?.results || [])
        setImages(imagesRes.data?.results || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [propertyId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await apiClient.request(apiEndpoints.propertyItem(propertyId), {
        method: 'PATCH',
        json: {
          ...form,
          price: Number(form.price) || 0,
          area: Number(form.area) || 0,
          rooms: Number(form.rooms) || 1,
        },
        csrf: true,
      })
      onSave?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleImageReorder = async (fromIndex, toIndex) => {
    const newImages = [...images]
    const [moved] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, moved)
    setImages(newImages)
    try {
      await apiClient.request(`/api/properties/${propertyId}/images/order/`, {
        method: 'POST',
        json: { order: newImages.map(img => img.id) },
        csrf: true,
      })
    } catch (err) { console.error('Reorder failed:', err) }
  }

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Видалити це фото?')) return
    try {
      await apiClient.request(`/api/properties/images/${imageId}/`, { method: 'DELETE', csrf: true })
      setImages(prev => prev.filter(img => img.id !== imageId))
    } catch (err) { console.error('Delete failed:', err) }
  }

  const handleToggleMain = async (imageId) => {
    try {
      await apiClient.request(`/api/properties/images/${imageId}/`, {
        method: 'PATCH', json: { is_main: true }, csrf: true,
      })
      setImages(prev => prev.map(img => ({ ...img, is_main: img.id === imageId })))
    } catch (err) { console.error('Toggle main failed:', err) }
  }

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(index)
  }

  const handleDrop = (e, toIndex) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (fromIndex !== toIndex) handleImageReorder(fromIndex, toIndex)
    setDragOver(false)
  }

  const handleDragEnd = () => setDragOver(false)

  const client = propData?.client
  const crmUrl = propData?.crm_url
  const addressParts = (propData?.address || '').split(',')
  const city = addressParts.length > 1 ? addressParts[0].trim() : ''

  if (!propertyId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-deepOcean">Редагування об'єкта</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <i className="ri-loader-4-line animate-spin text-2xl"></i>
            <p className="mt-2">Завантаження...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-red-500">{error}</div>
        ) : form ? (
          <div className="p-6 space-y-6">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

            {/* CRM Info Block */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Інформація з CRM</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Місто:</span>
                  <p className="font-medium text-deepOcean">{city || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Джерело:</span>
                  <p className="font-medium text-deepOcean">
                    {propData?.external_source === 'realtsoft' ? 'Realtsoft CRM' : 'Власний'}
                  </p>
                </div>
                {crmUrl && (
                  <div>
                    <span className="text-gray-500">CRM об'єкт:</span>
                    <a href={crmUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline break-all">
                      {crmUrl}
                    </a>
                  </div>
                )}
              </div>
              {client && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <h4 className="text-sm font-semibold text-gray-500 mb-2">Власник</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Ім'я:</span>
                      <p className="font-medium text-deepOcean">{client.name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Телефон:</span>
                      <p className="font-medium text-deepOcean">{client.phone || '—'}</p>
                    </div>
                    {client.crm_url && (
                      <div>
                        <span className="text-gray-500">CRM клієнт:</span>
                        <a href={client.crm_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline break-all">
                          {client.crm_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Назва</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Адреса</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ціна, $</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Площа, м²</label>
                <input type="number" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Кімнат</label>
                <input type="number" value={form.rooms} onChange={e => setForm({ ...form, rooms: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Валюта</label>
                <select value={form.price_currency} onChange={e => setForm({ ...form, price_currency: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean">
                  <option value="USD">USD</option><option value="EUR">EUR</option><option value="UAH">UAH</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип нерухомості</label>
                <select value={form.property_type_id} onChange={e => setForm({ ...form, property_type_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean">
                  <option value="">— Оберіть —</option>
                  {propertyTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип угоди</label>
                <select value={form.deal_type_id} onChange={e => setForm({ ...form, deal_type_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean">
                  <option value="">— Оберіть —</option>
                  {dealTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
                <textarea rows={6} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean" />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.featured_homepage} onChange={e => setForm({ ...form, featured_homepage: e.target.checked })} className="w-5 h-5 rounded accent-deepOcean" />
                <span className="text-sm font-medium text-gray-700">Показувати в "Топ 3"</span>
              </label>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Фотографії (перетягуйте для зміни порядку)</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {images.map((img, index) => (
                  <div key={img.id} draggable onDragStart={e => handleDragStart(e, index)} onDragOver={e => handleDragOver(e, index)}
                    onDrop={e => handleDrop(e, index)} onDragEnd={handleDragEnd}
                    className={`relative group rounded-lg overflow-hidden cursor-grab border-2 transition ${dragOver === index ? 'border-deepOcean scale-105' : 'border-transparent'} ${img.is_main ? 'ring-2 ring-deepOcean' : ''}`}>
                    <img src={img.url} alt="" className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-1">
                        {!img.is_main && <button onClick={() => handleToggleMain(img.id)} className="p-1.5 bg-white/90 rounded-lg text-xs hover:bg-white" title="Головне"><i className="ri-star-line"></i></button>}
                        {img.is_main && <span className="p-1.5 bg-deepOcean text-white rounded-lg text-xs"><i className="ri-star-fill"></i></span>}
                        <button onClick={() => handleDeleteImage(img.id)} className="p-1.5 bg-red-500/90 text-white rounded-lg text-xs hover:bg-red-500" title="Видалити"><i className="ri-delete-bin-line"></i></button>
                      </div>
                    </div>
                    {img.is_main && <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-deepOcean text-white text-[10px] rounded font-medium">Головне</span>}
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded">{index + 1}</span>
                  </div>
                ))}
                {images.length === 0 && <p className="col-span-full text-gray-400 text-sm py-4 text-center">Фото не додано</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-deepOcean text-white rounded-lg font-medium hover:bg-deepOcean/90 transition disabled:opacity-50">
                {saving ? 'Збереження...' : 'Зберегти'}
              </button>
              <button onClick={onClose} className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition">Скасувати</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default PropertyEditModal
