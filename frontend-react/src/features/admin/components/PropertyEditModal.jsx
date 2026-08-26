import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

function getErrorMessage(error, fallback = 'Сталася помилка.') {
  return error?.message || fallback
}

function parseNullableNumber(value) {
  if (value === '' || value == null) return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function createPropertyForm(property) {
  return {
    title: property?.title || '',
    address: property?.address || '',
    price: property?.price == null ? '' : String(property.price),
    area: property?.area == null ? '' : String(property.area),
    rooms: property?.rooms == null ? '' : String(property.rooms),
    description: property?.description || '',
    property_type_id: property?.property_type?.id == null ? '' : String(property.property_type.id),
    deal_type_id: property?.deal_type?.id == null ? '' : String(property.deal_type.id),
    featured_homepage: Boolean(property?.featured_homepage),
    price_currency: property?.price_currency || 'USD',
  }
}

function serializeForm(form) {
  if (!form) return ''

  return JSON.stringify({
    title: form.title || '',
    address: form.address || '',
    price: form.price == null ? '' : String(form.price),
    area: form.area == null ? '' : String(form.area),
    rooms: form.rooms == null ? '' : String(form.rooms),
    description: form.description || '',
    property_type_id: form.property_type_id == null ? '' : String(form.property_type_id),
    deal_type_id: form.deal_type_id == null ? '' : String(form.deal_type_id),
    featured_homepage: Boolean(form.featured_homepage),
    price_currency: form.price_currency || 'USD',
  })
}

function InfoItem({ label, children }) {
  return (
    <div className="admin-crm-item">
      <span>{label}</span>
      {children || <p>—</p>}
    </div>
  )
}

function PropertyEditModal({ propertyId, onClose, onSave }) {
  const [propData, setPropData] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [propertyTypes, setPropertyTypes] = useState([])
  const [dealTypes, setDealTypes] = useState([])
  const [images, setImages] = useState([])
  const [dragOver, setDragOver] = useState(null)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageStatus, setImageStatus] = useState(null)
  const initialFormSnapshotRef = useRef('')

  const loadImages = useCallback(async () => {
    if (!propertyId) return
    const response = await apiClient.get(apiEndpoints.propertyImages(propertyId))
    setImages(response.data?.results || [])
  }, [propertyId])

  useEffect(() => {
    if (!propertyId) return undefined

    let cancelled = false
    const controller = new AbortController()

    const loadData = async () => {
      setLoading(true)
      setLoadError(null)
      setFormError(null)
      setImageStatus(null)
      initialFormSnapshotRef.current = ''

      try {
        const [propRes, typesRes, dealsRes, imagesRes] = await Promise.all([
          apiClient.get(apiEndpoints.propertyItem(propertyId), { signal: controller.signal }),
          apiClient.get(apiEndpoints.propertyTypes, { signal: controller.signal }),
          apiClient.get(apiEndpoints.dealTypes, { signal: controller.signal }),
          apiClient.get(apiEndpoints.propertyImages(propertyId), { signal: controller.signal }),
        ])

        if (cancelled) return

        const property = propRes.data
        const nextForm = createPropertyForm(property)
        setPropData(property)
        setForm(nextForm)
        initialFormSnapshotRef.current = serializeForm(nextForm)
        setPropertyTypes(typesRes.data?.results || [])
        setDealTypes(dealsRes.data?.results || [])
        setImages(imagesRes.data?.results || [])
      } catch (error) {
        if (cancelled || controller.signal.aborted) return
        setLoadError(getErrorMessage(error, 'Не вдалося завантажити об’єкт.'))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [propertyId])

  const updateForm = (patch) => {
    setForm((current) => ({ ...current, ...patch }))
  }

  const hasUnsavedChanges = useCallback(() => (
    Boolean(initialFormSnapshotRef.current && form && serializeForm(form) !== initialFormSnapshotRef.current)
  ), [form])

  const requestClose = useCallback(() => {
    if (!hasUnsavedChanges() || window.confirm('Ви маєте незбережені зміни. Закрити без збереження?')) {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        requestClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('overflow-hidden')

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('overflow-hidden')
    }
  }, [requestClose])

  const handleSave = async (event) => {
    event.preventDefault()
    if (!form || saving) return

    setSaving(true)
    setFormError(null)

    try {
      const payload = {
        ...form,
        price: parseNullableNumber(form.price),
        area: parseNullableNumber(form.area),
        rooms: parseNullableNumber(form.rooms),
      }

      await apiClient.request(apiEndpoints.propertyItem(propertyId), {
        method: 'PATCH',
        json: payload,
        csrf: true,
      })
      initialFormSnapshotRef.current = serializeForm(form)
      onSave?.()
      onClose()
    } catch (error) {
      setFormError(getErrorMessage(error, 'Не вдалося зберегти об’єкт.'))
    } finally {
      setSaving(false)
    }
  }

  const handleImageReorder = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return

    const previousImages = images
    const nextImages = [...images]
    const [moved] = nextImages.splice(fromIndex, 1)
    nextImages.splice(toIndex, 0, moved)
    setImages(nextImages)
    setImageStatus(null)

    try {
      await apiClient.request(apiEndpoints.propertyImagesReorder(propertyId), {
        method: 'POST',
        json: { order: nextImages.map((image) => image.id) },
        csrf: true,
      })
      setImageStatus({ type: 'success', message: 'Порядок фото оновлено.' })
    } catch (error) {
      setImages(previousImages)
      setImageStatus({ type: 'error', message: getErrorMessage(error, 'Не вдалося змінити порядок фото.') })
    }
  }

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Видалити це фото?')) return
    setImageStatus(null)

    try {
      await apiClient.request(apiEndpoints.propertyImageDetail(imageId), {
        method: 'DELETE',
        csrf: true,
      })
      setImages((current) => current.filter((image) => image.id !== imageId))
      setImageStatus({ type: 'success', message: 'Фото видалено.' })
    } catch (error) {
      setImageStatus({ type: 'error', message: getErrorMessage(error, 'Не вдалося видалити фото.') })
    }
  }

  const handleToggleMain = async (imageId) => {
    setImageStatus(null)

    try {
      await apiClient.request(apiEndpoints.propertyImageDetail(imageId), {
        method: 'PATCH',
        json: { is_main: true },
        csrf: true,
      })
      setImages((current) => current.map((image) => ({ ...image, is_main: image.id === imageId })))
      setImageStatus({ type: 'success', message: 'Головне фото оновлено.' })
    } catch (error) {
      setImageStatus({ type: 'error', message: getErrorMessage(error, 'Не вдалося зробити фото головним.') })
    }
  }

  const handleUploadImages = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length || uploadingImages) return

    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })

    setUploadingImages(true)
    setImageStatus(null)

    try {
      const response = await apiClient.request(apiEndpoints.propertyImages(propertyId), {
        method: 'POST',
        body: formData,
        csrf: true,
      })
      await loadImages()

      const errors = response.data?.errors || []
      if (errors.length) {
        setImageStatus({
          type: 'error',
          message: `Частину фото не додано: ${errors.map((item) => item.error).filter(Boolean).join('; ')}`,
        })
      } else {
        setImageStatus({ type: 'success', message: 'Фото додано.' })
      }
    } catch (error) {
      setImageStatus({ type: 'error', message: getErrorMessage(error, 'Не вдалося додати фото.') })
    } finally {
      setUploadingImages(false)
      event.target.value = ''
    }
  }

  const handleDragStart = (event, index) => {
    event.dataTransfer.setData('text/plain', String(index))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (event, index) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOver(index)
  }

  const handleDrop = (event, toIndex) => {
    event.preventDefault()
    const fromIndex = Number.parseInt(event.dataTransfer.getData('text/plain'), 10)
    if (Number.isFinite(fromIndex)) {
      handleImageReorder(fromIndex, toIndex)
    }
    setDragOver(null)
  }

  const client = propData?.client
  const crmUrl = propData?.crm_url
  const addressParts = (propData?.address || '').split(',')
  const city = addressParts.length > 1 ? addressParts[0].trim() : ''

  if (!propertyId) return null

  return (
    <div className="admin-modal" onMouseDown={(event) => {
      if (event.target === event.currentTarget) requestClose()
    }}>
      <div className="admin-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="property-edit-title">
        <div className="admin-modal__header">
          <div className="min-w-0">
            <h2 className="admin-modal__title" id="property-edit-title">
              Редагування об’єкта
            </h2>
            <p className="admin-modal__subtitle">
              {propData?.title || 'Завантаження даних об’єкта'}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="admin-icon-button"
            aria-label="Закрити"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {loading ? (
          <div className="admin-modal__body">
            <div className="admin-empty-state">
              <i className="ri-loader-4-line admin-spin" aria-hidden="true"></i>
              <p>Завантаження об’єкта</p>
              <span>Отримуємо поля, довідники та фото.</span>
            </div>
          </div>
        ) : loadError ? (
          <div className="admin-modal__body">
            <div className="admin-alert admin-alert--error" role="status">
              <i className="ri-error-warning-line" aria-hidden="true"></i>
              {loadError}
            </div>
          </div>
        ) : form ? (
          <form onSubmit={handleSave} className="contents">
            <div className="admin-modal__body">
              {formError ? (
                <div className="admin-alert admin-alert--error" role="status">
                  <i className="ri-error-warning-line" aria-hidden="true"></i>
                  {formError}
                </div>
              ) : null}

              <section className="admin-form-section">
                <h3 className="admin-form-section__title">
                  <i className="ri-database-2-line mr-2 text-gray-400" aria-hidden="true"></i>
                  Джерело та власник
                </h3>
                <div className="admin-crm-grid">
                  <InfoItem label="Місто">
                    <p>{city || '—'}</p>
                  </InfoItem>
                  <InfoItem label="Джерело">
                    <p>{propData?.external_source === 'realtsoft' ? 'Realtsoft CRM' : 'Власний запис'}</p>
                  </InfoItem>
                  <InfoItem label="CRM об’єкт">
                    {crmUrl ? (
                      <a href={crmUrl} target="_blank" rel="noopener noreferrer">
                        Відкрити CRM
                      </a>
                    ) : (
                      <p>—</p>
                    )}
                  </InfoItem>
                  {client ? (
                    <>
                      <InfoItem label="Власник">
                        <p>{client.name || '—'}</p>
                      </InfoItem>
                      <InfoItem label="Телефон">
                        {client.phone ? <a href={`tel:${client.phone}`}>{client.phone}</a> : <p>—</p>}
                      </InfoItem>
                      <InfoItem label="CRM клієнт">
                        {client.crm_url ? (
                          <a href={client.crm_url} target="_blank" rel="noopener noreferrer">
                            Відкрити CRM
                          </a>
                        ) : (
                          <p>—</p>
                        )}
                      </InfoItem>
                    </>
                  ) : null}
                </div>
              </section>

              <section className="admin-form-section">
                <h3 className="admin-form-section__title">
                  <i className="ri-edit-2-line mr-2 text-gray-400" aria-hidden="true"></i>
                  Основні поля
                </h3>
                <div className="admin-form-grid">
                  <label className="admin-field admin-form-grid__full">
                    <span>Назва</span>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) => updateForm({ title: event.target.value })}
                      className="admin-input"
                      required
                    />
                  </label>

                  <label className="admin-field admin-form-grid__full">
                    <span>Адреса</span>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(event) => updateForm({ address: event.target.value })}
                      className="admin-input"
                      required
                    />
                  </label>

                  <label className="admin-field">
                    <span>Ціна</span>
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(event) => updateForm({ price: event.target.value })}
                      className="admin-input"
                    />
                  </label>

                  <label className="admin-field">
                    <span>Валюта</span>
                    <select
                      value={form.price_currency}
                      onChange={(event) => updateForm({ price_currency: event.target.value })}
                      className="admin-select"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="UAH">UAH</option>
                    </select>
                  </label>

                  <label className="admin-field">
                    <span>Площа, м²</span>
                    <input
                      type="number"
                      min="0"
                      value={form.area}
                      onChange={(event) => updateForm({ area: event.target.value })}
                      className="admin-input"
                    />
                  </label>

                  <label className="admin-field">
                    <span>Кімнат</span>
                    <input
                      type="number"
                      min="1"
                      value={form.rooms}
                      onChange={(event) => updateForm({ rooms: event.target.value })}
                      className="admin-input"
                    />
                  </label>

                  <label className="admin-field">
                    <span>Тип нерухомості</span>
                    <select
                      value={form.property_type_id}
                      onChange={(event) => updateForm({ property_type_id: event.target.value })}
                      className="admin-select"
                    >
                      <option value="">Оберіть тип</option>
                      {propertyTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-field">
                    <span>Тип угоди</span>
                    <select
                      value={form.deal_type_id}
                      onChange={(event) => updateForm({ deal_type_id: event.target.value })}
                      className="admin-select"
                    >
                      <option value="">Оберіть угоду</option>
                      {dealTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-field admin-form-grid__full">
                    <span>Опис</span>
                    <textarea
                      rows={7}
                      value={form.description}
                      onChange={(event) => updateForm({ description: event.target.value })}
                      className="admin-textarea"
                    />
                  </label>

                  <label className="admin-field admin-form-grid__full">
                    <span>Видимість на головній</span>
                    <span className="inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.featured_homepage}
                        onChange={(event) => updateForm({ featured_homepage: event.target.checked })}
                        className="admin-table__checkbox"
                      />
                      Показувати в блоці «Топ 3»
                    </span>
                  </label>
                </div>
              </section>

              <section className="admin-form-section">
                <h3 className="admin-form-section__title">
                  <i className="ri-image-line mr-2 text-gray-400" aria-hidden="true"></i>
                  Фотографії
                </h3>

                {imageStatus ? (
                  <div className={`admin-alert admin-alert--${imageStatus.type}`} role="status">
                    <i className={imageStatus.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} aria-hidden="true"></i>
                    {imageStatus.message}
                  </div>
                ) : null}

                {images.length ? (
                  <div className="admin-image-grid">
                    {images.map((image, index) => (
                      <div
                        key={image.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, index)}
                        onDragOver={(event) => handleDragOver(event, index)}
                        onDrop={(event) => handleDrop(event, index)}
                        onDragEnd={() => setDragOver(null)}
                        className="admin-image-card"
                        style={{
                          outline:
                            dragOver === index ? '2px solid rgba(19, 62, 68, 0.7)' : undefined,
                        }}
                      >
                        <img src={image.url} alt="" />
                        {image.is_main ? <span className="admin-image-card__main">Головне</span> : null}
                        <span className="admin-image-card__position">{index + 1}</span>
                        <div className="admin-image-card__actions">
                          {!image.is_main ? (
                            <button
                              type="button"
                              onClick={() => handleToggleMain(image.id)}
                              className="admin-icon-button bg-white"
                              title="Зробити головним"
                              aria-label="Зробити головним"
                            >
                              <i className="ri-star-line"></i>
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(image.id)}
                            className="admin-icon-button admin-icon-button--danger bg-white"
                            title="Видалити фото"
                            aria-label="Видалити фото"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty-state py-8">
                    <i className="ri-image-add-line" aria-hidden="true"></i>
                    <p>Фото ще не додано</p>
                    <span>Додайте зображення, щоб картка об’єкта виглядала повноцінно.</span>
                  </div>
                )}

                <div className="admin-upload-zone">
                  <p>PNG, JPG або WebP. Можна вибрати кілька файлів одразу.</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUploadImages}
                    disabled={uploadingImages}
                    className="admin-input"
                  />
                </div>
              </section>
            </div>

            <div className="admin-modal__footer">
              <button
                type="button"
                onClick={requestClose}
                className="admin-button admin-button--ghost"
              >
                Скасувати
              </button>
              <button type="submit" disabled={saving} className="admin-button admin-button--primary">
                <i className={saving ? 'ri-loader-4-line admin-spin' : 'ri-save-line'}></i>
                {saving ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}

export default PropertyEditModal
