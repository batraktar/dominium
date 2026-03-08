import { toMediaPath } from '../../../../shared/utils/url.js'
import { escapeHtml } from './adminCommon.js'

const PRICE_FORMATTER = new Intl.NumberFormat('uk-UA')

export default function createAdminTableView({ dom, tableState, syncSelectAllCheckbox }) {
  const updatePaginationControls = () => {
    if (dom.paginationInfo) {
      dom.paginationInfo.textContent = `Сторінка ${tableState.page} із ${tableState.totalPages} • ${tableState.totalCount} об’єктів`
    }
    if (dom.prevPageBtn) {
      dom.prevPageBtn.disabled = tableState.page <= 1
    }
    if (dom.nextPageBtn) {
      dom.nextPageBtn.disabled = tableState.page >= tableState.totalPages
    }
  }

  const buildPropertyQuery = () => ({
    page: tableState.page,
    pageSize: tableState.pageSize,
    ordering: tableState.ordering,
    search: tableState.filters.search,
    propertyType: tableState.filters.propertyType,
    dealType: tableState.filters.dealType,
    featured: tableState.filters.featured,
    status: tableState.filters.status,
  })

  const renderProperties = (rows) => {
    dom.tableBody.innerHTML = ''

    if (!rows || rows.length === 0) {
      const tr = document.createElement('tr')
      const message =
        tableState.filters.status === 'archived'
          ? 'В архіві поки немає жодного об’єкта.'
          : 'Об’єктів не знайдено за вказаними параметрами.'
      tr.innerHTML = `<td colspan="9" class="px-4 py-6 text-center text-gray-500">${escapeHtml(message)}</td>`
      dom.tableBody.append(tr)

      syncSelectAllCheckbox()
      if (dom.selectAllCheckbox) {
        dom.selectAllCheckbox.disabled = true
        dom.selectAllCheckbox.checked = false
        dom.selectAllCheckbox.indeterminate = false
      }
      return
    }

    rows.forEach((item) => {
      const tr = document.createElement('tr')
      tr.className = 'hover:bg-gray-50 transition'

      const formattedPrice = item.price != null ? PRICE_FORMATTER.format(item.price) : '—'
      const statusBadge = item.is_archived
        ? '<span class="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"><i class="ri-archive-stack-line"></i> Архів</span>'
        : ''

      const imagePreviewUrl =
        toMediaPath(item.main_image?.url || item.images?.[0]?.url || '', '') ||
        'https://via.placeholder.com/120x90?text=Фото'

      tr.innerHTML = `
        <td class="px-4 py-3 text-center" data-label="Фото">
          <span class="cell-label">Фото</span>
          <img class="table-thumb mx-auto" src="${escapeHtml(imagePreviewUrl)}" alt="Фото" />
        </td>
        <td class="px-4 py-3 align-top" data-label="Вибір">
          <span class="cell-label">Вибір</span>
          <input type="checkbox" class="row-select accent-deepOcean" data-id="${item.id}" />
        </td>
        <td class="px-4 py-3 font-medium text-gray-900" data-label="Назва">
          <span class="cell-label">Назва</span>
          ${escapeHtml(item.title || '—')}${statusBadge}
        </td>
        <td class="px-4 py-3 text-gray-700" data-label="Адреса">
          <span class="cell-label">Адреса</span>
          ${escapeHtml(item.address || '—')}
        </td>
        <td class="px-4 py-3 text-gray-700" data-label="Ціна">
          <span class="cell-label">Ціна</span>
          ${escapeHtml(formattedPrice)}
        </td>
        <td class="px-4 py-3 text-gray-700" data-label="Тип">
          <span class="cell-label">Тип</span>
          ${escapeHtml(item.property_type?.name || '—')}
        </td>
        <td class="px-4 py-3 text-gray-700" data-label="Угода">
          <span class="cell-label">Угода</span>
          ${escapeHtml(item.deal_type?.name || '—')}
        </td>
        <td class="px-4 py-3 text-center" data-label="Топ">
          <span class="cell-label">Топ</span>
          ${
            item.featured_homepage
              ? '<span class="inline-flex items-center gap-1 text-green-600"><i class="ri-star-smile-line"></i> Так</span>'
              : '<span class="text-gray-400">Ні</span>'
          }
        </td>
        <td class="px-4 py-3 text-right text-sm" data-label="Дії">
          <span class="cell-label">Дії</span>
          <button data-id="${item.id}" class="edit-property inline-flex items-center gap-2 px-3 py-1.5 bg-coolSage text-white rounded-[9px] hover:bg-coolSage/90 transition">
            <i class="ri-edit-2-line"></i>
            Редагувати
          </button>
        </td>
      `

      dom.tableBody.append(tr)
    })

    syncSelectAllCheckbox()
    if (dom.selectAllCheckbox) {
      dom.selectAllCheckbox.disabled = false
    }
  }

  return {
    buildPropertyQuery,
    renderProperties,
    updatePaginationControls,
  }
}
