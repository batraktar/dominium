import { useState, useEffect, useCallback, useMemo } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { isAbortError } from '../../../shared/utils/api-error.js'

const NUMBER_FORMATTER = new Intl.NumberFormat('uk-UA')

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '0'
  return NUMBER_FORMATTER.format(Number(value))
}

function getCurrencyLabel(property) {
  return property?.price_currency || property?.currency || 'USD'
}

function getExportCurrency(property) {
  return property?.price_currency || property?.currency || ''
}

function formatPrice(value, currency = 'USD') {
  if (value == null || value === '') return '—'
  return `${formatNumber(Number(value))} ${currency}`
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function exportToCsv(data, filename) {
  const headers = [
    'ID',
    'Назва',
    'Адреса',
    'Ціна',
    'Валюта',
    'Площа',
    'Кімнат',
    'Тип',
    'Угода',
    'Статус',
    'Топ',
    'CRM URL',
    'Джерело',
  ]
  const rows = data.map((property) => [
    property.id,
    csvValue(property.title),
    csvValue(property.address),
    property.price ?? '',
    csvValue(getExportCurrency(property)),
    property.area ?? '',
    property.rooms ?? '',
    csvValue(property.property_type?.name || ''),
    csvValue(property.deal_type?.name || ''),
    property.is_archived ? 'Архів' : 'Активний',
    property.featured_homepage ? 'Так' : 'Ні',
    csvValue(property.crm_url || ''),
    csvValue(property.external_source || ''),
  ])
  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename || 'dominium_export.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

const BULK_ACTION_COPY = {
  archive: {
    buttonLabel: 'В архів',
    confirmationAction: 'перемістити в архів',
    failureAction: 'перемістити в архів',
    successMessage: (count) => `${formatNumber(count)} вибраних об’єкт(ів) переміщено в архів.`,
  },
  restore: {
    buttonLabel: 'Повернути',
    confirmationAction: 'повернути з архіву',
    failureAction: 'повернути з архіву',
    successMessage: (count) => `${formatNumber(count)} вибраних об’єкт(ів) повернуто з архіву.`,
  },
  delete: {
    buttonLabel: 'Видалити',
    confirmationAction: 'видалити безповоротно',
    failureAction: 'видалити',
    successMessage: (count) => `${formatNumber(count)} вибраних об’єкт(ів) видалено.`,
  },
}

function getSelectedCountLabel(count) {
  return `${formatNumber(count)} вибраних об’єкт(ів)`
}

function PropertyRow({
  property,
  onEdit,
  onToggleFeatured,
  onDelete,
  selected,
  onSelect,
  busy,
}) {
  const mainImage = property.main_image?.url || property.images?.[0]?.url
  const dealName = property.deal_type?.name || '—'
  const typeName = property.property_type?.name || '—'
  const details = [
    property.rooms ? `${property.rooms} кімн.` : null,
    property.area ? `${property.area} м²` : null,
    property.is_archived ? 'Архів' : null,
  ].filter(Boolean)

  return (
    <tr>
      <td className="w-12">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(property.id)}
          className="admin-table__checkbox"
          aria-label={`Вибрати ${property.title || 'об’єкт'}`}
        />
      </td>
      <td>
        <div className="admin-property-cell">
          {mainImage ? (
            <img src={mainImage} alt="" className="admin-property-thumb" loading="lazy" />
          ) : (
            <div className="admin-property-thumb admin-property-thumb--empty" aria-hidden="true">
              <i className="ri-image-line"></i>
            </div>
          )}
          <div className="min-w-0">
            <p className="admin-property-title">{property.title || 'Без назви'}</p>
            <p className="admin-property-meta">{details.length ? details.join(' · ') : 'Без параметрів'}</p>
          </div>
        </div>
      </td>
      <td>
        <div className="admin-property-address">{property.address || '—'}</div>
      </td>
      <td>
        <span className="admin-price">{formatPrice(property.price, getCurrencyLabel(property))}</span>
      </td>
      <td>
        <span className="admin-badge admin-badge--neutral">{typeName}</span>
      </td>
      <td>
        <span className="admin-badge admin-badge--neutral">{dealName}</span>
      </td>
      <td className="text-center">
        <button
          type="button"
          onClick={() => onToggleFeatured(property.id)}
          disabled={busy}
          className={`admin-icon-button ${property.featured_homepage ? 'admin-icon-button--featured' : ''}`}
          title={property.featured_homepage ? 'Прибрати з Топ 3' : 'Додати в Топ 3'}
          aria-label={property.featured_homepage ? 'Прибрати з Топ 3' : 'Додати в Топ 3'}
        >
          <i className={property.featured_homepage ? 'ri-star-fill' : 'ri-star-line'}></i>
        </button>
      </td>
      <td>
        <div className="admin-row-actions">
          <a
            href={property.absolute_url || `/property/${property.slug}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-icon-button"
            title="Переглянути на сайті"
            aria-label="Переглянути на сайті"
          >
            <i className="ri-external-link-line"></i>
          </a>
          <button
            type="button"
            onClick={() => onEdit(property)}
            className="admin-icon-button"
            title="Редагувати"
            aria-label="Редагувати"
          >
            <i className="ri-edit-line"></i>
          </button>
          <button
            type="button"
            onClick={() => onDelete(property.id)}
            disabled={busy}
            className="admin-icon-button admin-icon-button--danger"
            title="Видалити"
            aria-label="Видалити"
          >
            <i className="ri-delete-bin-line"></i>
          </button>
        </div>
      </td>
    </tr>
  )
}

function AdminPropertiesTable({ onEditProperty, onDataChange }) {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('')
  const [dealTypeFilter, setDealTypeFilter] = useState('')
  const [featuredFilter, setFeaturedFilter] = useState('')
  const [perPage, setPerPage] = useState(20)
  const [propertyTypes, setPropertyTypes] = useState([])
  const [dealTypes, setDealTypes] = useState([])
  const [actionBusy, setActionBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([apiClient.get(apiEndpoints.propertyTypes), apiClient.get(apiEndpoints.dealTypes)])
      .then(([typesResponse, dealsResponse]) => {
        if (cancelled) return
        setPropertyTypes(typesResponse.data?.results || [])
        setDealTypes(dealsResponse.data?.results || [])
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError?.message || 'Не вдалося завантажити довідники.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const query = useMemo(() => {
    const params = {
      page,
      page_size: perPage,
      status: statusFilter,
      ordering: '-created_at',
    }

    if (search) params.q = search
    if (propertyTypeFilter) params.property_type = propertyTypeFilter
    if (dealTypeFilter) params.deal_type = dealTypeFilter
    if (featuredFilter) params.featured = featuredFilter

    return params
  }, [dealTypeFilter, featuredFilter, page, perPage, propertyTypeFilter, search, statusFilter])

  const loadProperties = useCallback(
    async (options = {}) => {
      const signal = options.signal
      setLoading(true)
      setError(null)

      try {
        const response = await apiClient.get(apiEndpoints.properties, { query, signal })
        const results = response.data?.results || []
        setProperties(results)
        setTotalCount(response.data?.count || 0)
        setSelectedIds((previous) => {
          const visibleIds = new Set(results.map((property) => property.id))
          return new Set(Array.from(previous).filter((id) => visibleIds.has(id)))
        })
      } catch (loadError) {
        if (isAbortError(loadError)) return
        setError(loadError?.message || 'Не вдалося завантажити об’єкти.')
        setProperties([])
        setTotalCount(0)
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [query],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadProperties({ signal: controller.signal })
    return () => controller.abort()
  }, [loadProperties])

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const selectedProperties = useMemo(
    () => properties.filter((property) => selectedIds.has(property.id)),
    [properties, selectedIds],
  )
  const isAllVisibleSelected = properties.length > 0 && selectedIds.size === properties.length

  const reloadAfterMutation = async (message) => {
    await loadProperties()
    onDataChange?.()
    if (message) {
      setNotice({ type: 'success', message })
    }
  }

  const handleToggleFeatured = async (id) => {
    if (actionBusy) return
    setActionBusy(true)
    setNotice(null)

    try {
      await apiClient.post(apiEndpoints.toggleFeatured(id))
      await reloadAfterMutation('Статус «Топ 3» оновлено.')
    } catch (actionError) {
      setError(actionError?.message || 'Не вдалося оновити статус «Топ 3».')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDelete = async (id) => {
    if (actionBusy) return
    if (!window.confirm('Видалити цей об’єкт безповоротно?')) return

    setActionBusy(true)
    setNotice(null)

    try {
      await apiClient.request(apiEndpoints.propertyItem(id), { method: 'DELETE', csrf: true })
      setSelectedIds((previous) => {
        const next = new Set(previous)
        next.delete(id)
        return next
      })
      await reloadAfterMutation('Об’єкт видалено.')
    } catch (actionError) {
      setError(actionError?.message || 'Не вдалося видалити об’єкт.')
    } finally {
      setActionBusy(false)
    }
  }

  const handleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(properties.map((property) => property.id)))
  }

  const handleBulkAction = async (action) => {
    if (actionBusy) return

    const actionCopy = BULK_ACTION_COPY[action]
    if (!actionCopy) {
      setError('Невідома bulk-дія для вибраних об’єктів.')
      return
    }

    const ids = Array.from(selectedIds)
    const selectedCount = ids.length

    if (selectedCount === 0) {
      setNotice(null)
      setError(`Спочатку виберіть об’єкти, щоб виконати дію «${actionCopy.buttonLabel}».`)
      return
    }

    const selectedCountLabel = getSelectedCountLabel(selectedCount)
    const confirmed = window.confirm(
      `Підтвердіть дію: ${actionCopy.confirmationAction} ${selectedCountLabel}?`,
    )
    if (!confirmed) {
      return
    }

    setActionBusy(true)
    setNotice(null)
    setError(null)

    try {
      await apiClient.postJson(apiEndpoints.propertyBulkAction, {
        ids,
        action,
      })
      setSelectedIds(new Set())
      await reloadAfterMutation(actionCopy.successMessage(selectedCount))
    } catch (actionError) {
      const reason = actionError?.message ? ` ${actionError.message}` : ''
      setError(`Не вдалося ${actionCopy.failureAction} ${selectedCountLabel}.${reason}`)
    } finally {
      setActionBusy(false)
    }
  }

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatusFilter('active')
    setPropertyTypeFilter('')
    setDealTypeFilter('')
    setFeaturedFilter('')
    setPerPage(20)
    setPage(1)
    setNotice(null)
  }

  const statusLabel = {
    active: 'активних',
    archived: 'в архіві',
    all: 'загалом',
  }[statusFilter]

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <div>
          <h2 className="admin-panel__title">
            <i className="ri-home-4-line mr-2" aria-hidden="true"></i>
            Об’єкти
          </h2>
          <p className="admin-panel__subtitle">
            {loading ? 'Оновлюємо список...' : `${formatNumber(totalCount)} об’єктів ${statusLabel}.`}
          </p>
        </div>
        <div className="admin-toolbar">
          <button
            type="button"
            onClick={() => {
              setNotice(null)
              loadProperties()
            }}
            className="admin-button admin-button--secondary"
            disabled={loading}
          >
            <i className={`ri-refresh-line ${loading ? 'admin-spin' : ''}`}></i>
            Оновити
          </button>
          <a href="/admin/house/property/add/" className="admin-button admin-button--primary">
            <i className="ri-add-line"></i>
            Новий об’єкт
          </a>
        </div>
      </div>

      <div className="admin-filter-grid">
        <label className="admin-field admin-search-field">
          <span>Пошук</span>
          <i className="ri-search-line" aria-hidden="true"></i>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Назва, адреса або CRM-дані"
            className="admin-input admin-search-input"
          />
        </label>

        <label className="admin-field">
          <span>Статус</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            className="admin-select"
          >
            <option value="active">Активні</option>
            <option value="archived">Архів</option>
            <option value="all">Усі</option>
          </select>
        </label>

        <label className="admin-field">
          <span>Тип</span>
          <select
            value={propertyTypeFilter}
            onChange={(event) => {
              setPropertyTypeFilter(event.target.value)
              setPage(1)
            }}
            className="admin-select"
          >
            <option value="">Усі типи</option>
            {propertyTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>Угода</span>
          <select
            value={dealTypeFilter}
            onChange={(event) => {
              setDealTypeFilter(event.target.value)
              setPage(1)
            }}
            className="admin-select"
          >
            <option value="">Усі угоди</option>
            {dealTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>Вивід</span>
          <select
            value={featuredFilter}
            onChange={(event) => {
              setFeaturedFilter(event.target.value)
              setPage(1)
            }}
            className="admin-select"
          >
            <option value="">Усі</option>
            <option value="true">Лише Топ 3</option>
            <option value="false">Без Топ 3</option>
          </select>
        </label>

        <label className="admin-field">
          <span>На сторінку</span>
          <select
            value={perPage}
            onChange={(event) => {
              setPerPage(Number(event.target.value) || 20)
              setPage(1)
            }}
            className="admin-select"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
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

      {notice ? (
        <div className="mx-5 mt-4">
          <div className={`admin-alert admin-alert--${notice.type}`} role="status">
            <i className="ri-check-line" aria-hidden="true"></i>
            {notice.message}
          </div>
        </div>
      ) : null}

      {selectedIds.size > 0 ? (
        <div className="admin-bulk-bar">
          <p className="admin-bulk-bar__count">Вибрано: {getSelectedCountLabel(selectedIds.size)}</p>
          <div className="admin-toolbar">
            <button
              type="button"
              onClick={() => exportToCsv(selectedProperties, `dominium_export_${new Date().toISOString().slice(0, 10)}.csv`)}
              className="admin-button admin-button--secondary"
            >
              <i className="ri-download-line"></i>
              CSV ({formatNumber(selectedIds.size)})
            </button>
            {statusFilter === 'archived' ? (
              <button
                type="button"
                onClick={() => handleBulkAction('restore')}
                className="admin-button admin-button--primary"
                disabled={actionBusy}
              >
                <i className="ri-history-line"></i>
                Повернути ({formatNumber(selectedIds.size)})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleBulkAction('archive')}
                className="admin-button admin-button--primary"
                disabled={actionBusy}
              >
                <i className="ri-archive-line"></i>
                В архів ({formatNumber(selectedIds.size)})
              </button>
            )}
            <button
              type="button"
              onClick={() => handleBulkAction('delete')}
              className="admin-button admin-button--danger"
              disabled={actionBusy}
            >
              <i className="ri-delete-bin-line"></i>
              Видалити ({formatNumber(selectedIds.size)})
            </button>
          </div>
        </div>
      ) : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  onChange={handleSelectAll}
                  disabled={!properties.length || loading}
                  className="admin-table__checkbox"
                  aria-label="Вибрати всі видимі об’єкти"
                />
              </th>
              <th>Об’єкт</th>
              <th>Адреса</th>
              <th>Ціна</th>
              <th>Тип</th>
              <th>Угода</th>
              <th className="text-center">Топ</th>
              <th className="text-right">Дії</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">
                  <div className="admin-empty-state">
                    <i className="ri-loader-4-line admin-spin" aria-hidden="true"></i>
                    <p>Завантаження об’єктів</p>
                    <span>Дані оновлюються без перезавантаження сторінки.</span>
                  </div>
                </td>
              </tr>
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className="admin-empty-state">
                    <i className="ri-search-eye-line" aria-hidden="true"></i>
                    <p>Об’єктів не знайдено</p>
                    <span>Змініть фільтри або скиньте їх до активних об’єктів.</span>
                    <div className="mt-4">
                      <button type="button" onClick={resetFilters} className="admin-button admin-button--secondary">
                        <i className="ri-arrow-go-back-line"></i>
                        Скинути фільтри
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              properties.map((property) => (
                <PropertyRow
                  key={property.id}
                  property={property}
                  selected={selectedIds.has(property.id)}
                  onSelect={(id) => {
                    const next = new Set(selectedIds)
                    if (next.has(id)) next.delete(id)
                    else next.add(id)
                    setSelectedIds(next)
                  }}
                  onEdit={onEditProperty}
                  onToggleFeatured={handleToggleFeatured}
                  onDelete={handleDelete}
                  busy={actionBusy}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <span>
          Сторінка {page} з {totalPages} · {formatNumber(totalCount)} записів
        </span>
        <div className="admin-toolbar">
          <button
            type="button"
            onClick={resetFilters}
            className="admin-button admin-button--ghost"
            disabled={loading}
          >
            <i className="ri-arrow-go-back-line"></i>
            Скинути
          </button>
          <button
            type="button"
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={page === 1 || loading}
            className="admin-button admin-button--secondary"
          >
            <i className="ri-arrow-left-s-line"></i>
            Назад
          </button>
          <button
            type="button"
            onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
            disabled={page >= totalPages || loading}
            className="admin-button admin-button--secondary"
          >
            Вперед
            <i className="ri-arrow-right-s-line"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminPropertiesTable
