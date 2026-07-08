import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

function PropertyRow({ property, onEdit, onToggleFeatured, onDelete, selected, onSelect }) {
  const mainImage = property.main_image?.url || property.images?.[0]?.url
  const dealName = property.deal_type?.name || '—'
  const typeName = property.property_type?.name || '—'

  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(property.id)}
          className="accent-deepOcean"
        />
      </td>
      <td className="px-4 py-3">
        {mainImage ? (
          <img src={mainImage} alt="" className="w-16 h-12 object-cover rounded-lg" loading="lazy" />
        ) : (
          <div className="w-16 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
            <i className="ri-image-line"></i>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="max-w-xs">
          <p className="font-medium text-deepOcean truncate">{property.title}</p>
          <p className="text-xs text-gray-500">{property.rooms} кімн. · {property.area} м²</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{property.address}</td>
      <td className="px-4 py-3 font-semibold text-deepOcean">
        {property.price ? `${Number(property.price).toLocaleString('uk-UA')} $` : '—'}
      </td>
      <td className="px-4 py-3 text-sm">{typeName}</td>
      <td className="px-4 py-3 text-sm">{dealName}</td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggleFeatured(property.id)}
          className={`p-1 rounded transition ${
            property.featured_homepage 
              ? 'text-yellow-500 hover:text-yellow-600' 
              : 'text-gray-300 hover:text-yellow-400'
          }`}
          title={property.featured_homepage ? 'Прибрати з Топ 3' : 'Додати в Топ 3'}
        >
          <i className={`${property.featured_homepage ? 'ri-star-fill' : 'ri-star-line'} text-xl`}></i>
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <a
            href={`/property/${property.slug}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-500 hover:text-deepOcean transition rounded-lg hover:bg-gray-100"
            title="Переглянути"
          >
            <i className="ri-external-link-line"></i>
          </a>
          <button
            onClick={() => onEdit(property)}
            className="p-2 text-gray-500 hover:text-blue-600 transition rounded-lg hover:bg-blue-50"
            title="Редагувати"
          >
            <i className="ri-edit-line"></i>
          </button>
          <button
            onClick={() => onDelete(property.id)}
            className="p-2 text-gray-500 hover:text-red-600 transition rounded-lg hover:bg-red-50"
            title="Видалити"
          >
            <i className="ri-delete-bin-line"></i>
          </button>
        </div>
      </td>
    </tr>
  )
}

function AdminPropertiesTable({ onEditProperty }) {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [perPage, setPerPage] = useState(20)

  const loadProperties = useCallback(async () => {
    setLoading(true)
    try {
      const query = {
        page,
        page_size: perPage,
        status: statusFilter,
      }
      if (search) query.q = search

      const response = await apiClient.get(apiEndpoints.properties, { query })
      setProperties(response.data?.results || [])
      setTotalCount(response.data?.count || 0)
    } catch (error) {
      console.error('Failed to load properties:', error)
    } finally {
      setLoading(false)
    }
  }, [page, perPage, statusFilter, search])

  useEffect(() => { loadProperties() }, [loadProperties])

  const totalPages = Math.ceil(totalCount / perPage)

  const handleToggleFeatured = async (id) => {
    try {
      await apiClient.post(apiEndpoints.toggleFeatured(id))
      loadProperties()
    } catch (error) {
      console.error('Failed to toggle featured:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Видалити цей об\'єкт?')) return
    try {
      await apiClient.request(apiEndpoints.propertyItem(id), { method: 'DELETE', csrf: true })
      loadProperties()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.size === properties.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(properties.map(p => p.id)))
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return
    if (!confirm(`Виконати "${action}" для ${selectedIds.size} об'єктів?`)) return
    
    try {
      await apiClient.postJson(apiEndpoints.propertyBulkAction, {
        ids: Array.from(selectedIds),
        action,
      })
      setSelectedIds(new Set())
      loadProperties()
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Пошук за назвою або адресою..."
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-deepOcean/20 focus:border-deepOcean text-sm w-full sm:w-64"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-deepOcean/20 text-sm"
            >
              <option value="active">Активні</option>
              <option value="archived">Архів</option>
              <option value="all">Усі</option>
            </select>
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <>
                <button onClick={() => handleBulkAction('archive')} className="px-3 py-2 text-sm bg-deepOcean text-white rounded-lg hover:bg-deepOcean/90">
                  В архів ({selectedIds.size})
                </button>
                <button onClick={() => handleBulkAction('delete')} className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-500/90">
                  Видалити ({selectedIds.size})
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={selectedIds.size === properties.length && properties.length > 0} onChange={handleSelectAll} className="accent-deepOcean" />
              </th>
              <th className="px-4 py-3 w-20">Фото</th>
              <th className="px-4 py-3">Назва</th>
              <th className="px-4 py-3 hidden md:table-cell">Адреса</th>
              <th className="px-4 py-3">Ціна</th>
              <th className="px-4 py-3 hidden lg:table-cell">Тип</th>
              <th className="px-4 py-3 hidden lg:table-cell">Угода</th>
              <th className="px-4 py-3 text-center w-12">Топ</th>
              <th className="px-4 py-3 text-right w-24">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="9" className="px-4 py-12 text-center text-gray-400">
                  <i className="ri-loader-4-line animate-spin text-2xl"></i>
                  <p className="mt-2">Завантаження...</p>
                </td>
              </tr>
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-12 text-center text-gray-400">
                  Об'єктів не знайдено
                </td>
              </tr>
            ) : (
              properties.map(property => (
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
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Сторінка {page} з {totalPages} ({totalCount} об'єктів)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Назад
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Вперед
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPropertiesTable
