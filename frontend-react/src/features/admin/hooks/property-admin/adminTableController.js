import { loadAdminProperties, runAdminBulkAction } from '../../services/propertyAdminApi.js'
import { isAbortError } from '../../../../shared/utils/api-error.js'
import { applyTableStatus, clearTableStatus, formatAdminError } from './adminCommon.js'
import createAdminTableSelection from './adminTableSelection.js'
import createAdminTableView from './adminTableView.js'

export default function createAdminTableController({
  dom,
  tableState,
  selectionState,
  runtime,
  isDisposed,
}) {
  const selection = createAdminTableSelection({
    dom,
    tableState,
    selectionState,
  })
  const tableView = createAdminTableView({
    dom,
    tableState,
    syncSelectAllCheckbox: selection.syncSelectAllCheckbox,
  })
  let activeLoadAbortController = null
  let loadRequestId = 0

  const abortActiveLoad = () => {
    if (activeLoadAbortController) {
      activeLoadAbortController.abort()
      activeLoadAbortController = null
    }
  }

  const loadProperties = async () => {
    loadRequestId += 1
    const requestId = loadRequestId
    abortActiveLoad()
    activeLoadAbortController = new AbortController()

    try {
      selection.clearSelection()

      const data = await loadAdminProperties(tableView.buildPropertyQuery(), {
        signal: activeLoadAbortController.signal,
      })
      if (isDisposed() || requestId !== loadRequestId) return

      tableState.totalPages = data.total_pages || 1
      tableState.totalCount = data.count || 0
      tableState.page = data.page || tableState.page
      tableState.ordering = data.ordering || tableState.ordering
      tableState.filters.status = data.status || tableState.filters.status

      if (dom.filterStatusSelect) {
        dom.filterStatusSelect.value = tableState.filters.status
      }

      tableView.renderProperties(data.results)
      tableView.updatePaginationControls()
      clearTableStatus(dom.tableStatusNode)
    } catch (error) {
      if (isAbortError(error)) return
      if (isDisposed() || requestId !== loadRequestId) return

      tableView.renderProperties([])
      applyTableStatus(dom.tableStatusNode, formatAdminError(error), 'error')
      tableState.totalPages = 1
      tableState.totalCount = 0
      tableView.updatePaginationControls()
    } finally {
      if (requestId === loadRequestId) {
        activeLoadAbortController = null
      }
      if (!isDisposed() && requestId === loadRequestId) {
        selection.updateBulkToolbar()
        selection.syncSelectAllCheckbox()
      }
    }
  }

  const performBulkAction = async (action) => {
    if (!selectionState.ids.size || runtime.bulkInProgress) {
      return
    }

    if (action === 'delete' && !window.confirm('Видалити вибрані об’єкти безповоротно?')) {
      return
    }

    runtime.bulkInProgress = true
    selection.setBulkButtonsDisabled(true)

    const ids = Array.from(selectionState.ids)
    try {
      await runAdminBulkAction(action, ids)
      if (isDisposed()) return

      selection.clearSelection()
      await loadProperties()

      const messages = {
        archive: 'Об’єкти переміщено до архіву.',
        restore: 'Об’єкти повернуто з архіву.',
        delete: 'Об’єкти видалено.',
      }
      applyTableStatus(dom.tableStatusNode, messages[action] || 'Операція виконана.', 'success')
    } catch (error) {
      if (isDisposed()) return
      applyTableStatus(dom.tableStatusNode, formatAdminError(error), 'error')
    } finally {
      runtime.bulkInProgress = false
      selection.setBulkButtonsDisabled(false)
    }
  }

  const bindEvents = ({ on, onEdit }) => {
    on(dom.tableBody, 'click', (event) => {
      const button = event.target.closest('.edit-property')
      if (!button) return

      const id = Number(button.dataset.id)
      if (!Number.isFinite(id) || id <= 0) return
      onEdit(id)
    })

    on(dom.tableBody, 'change', selection.handleRowSelectionChange)
    on(dom.selectAllCheckbox, 'change', selection.handleSelectAllChange)

    on(dom.bulkArchiveBtn, 'click', () => performBulkAction('archive'))
    on(dom.bulkRestoreBtn, 'click', () => performBulkAction('restore'))
    on(dom.bulkDeleteBtn, 'click', () => performBulkAction('delete'))

    on(dom.refreshBtn, 'click', () => loadProperties())

    on(dom.filterSearchInput, 'input', (event) => {
      if (runtime.searchDebounceId) {
        window.clearTimeout(runtime.searchDebounceId)
      }
      runtime.searchDebounceId = window.setTimeout(() => {
        tableState.filters.search = event.target.value.trim()
        tableState.page = 1
        loadProperties()
        runtime.searchDebounceId = null
      }, 300)
    })

    on(dom.filterPropertyTypeSelect, 'change', (event) => {
      tableState.filters.propertyType = event.target.value
      tableState.page = 1
      loadProperties()
    })

    on(dom.filterDealTypeSelect, 'change', (event) => {
      tableState.filters.dealType = event.target.value
      tableState.page = 1
      loadProperties()
    })

    on(dom.filterFeaturedSelect, 'change', (event) => {
      tableState.filters.featured = event.target.value
      tableState.page = 1
      loadProperties()
    })

    on(dom.filterStatusSelect, 'change', (event) => {
      tableState.filters.status = event.target.value || 'active'
      tableState.page = 1
      loadProperties()
    })

    on(dom.pageSizeSelect, 'change', (event) => {
      tableState.pageSize = Number(event.target.value) || 10
      tableState.page = 1
      loadProperties()
    })

    on(dom.resetFiltersBtn, 'click', () => {
      tableState.filters = {
        search: '',
        propertyType: '',
        dealType: '',
        featured: '',
        status: 'active',
      }
      tableState.page = 1
      tableState.pageSize = 10

      if (dom.filterSearchInput) dom.filterSearchInput.value = ''
      if (dom.filterPropertyTypeSelect) dom.filterPropertyTypeSelect.value = ''
      if (dom.filterDealTypeSelect) dom.filterDealTypeSelect.value = ''
      if (dom.filterFeaturedSelect) dom.filterFeaturedSelect.value = ''
      if (dom.filterStatusSelect) dom.filterStatusSelect.value = 'active'
      if (dom.pageSizeSelect) dom.pageSizeSelect.value = '10'

      loadProperties()
    })

    on(dom.prevPageBtn, 'click', () => {
      if (tableState.page > 1) {
        tableState.page -= 1
        loadProperties()
      }
    })

    on(dom.nextPageBtn, 'click', () => {
      if (tableState.page < tableState.totalPages) {
        tableState.page += 1
        loadProperties()
      }
    })
  }

  const cleanup = () => {
    abortActiveLoad()
    if (runtime.searchDebounceId) {
      window.clearTimeout(runtime.searchDebounceId)
      runtime.searchDebounceId = null
    }
    selection.updateBulkToolbar()
    selection.syncSelectAllCheckbox()
  }

  return {
    loadProperties,
    bindEvents,
    cleanup,
  }
}
