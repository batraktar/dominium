export default function createAdminTableSelection({ dom, tableState, selectionState }) {
  const updateBulkToolbar = () => {
    if (!dom.bulkToolbar) return

    const count = selectionState.ids.size
    if (dom.bulkCountNode) {
      dom.bulkCountNode.textContent = String(count)
    }
    dom.bulkToolbar.classList.toggle('hidden', count === 0)

    if (count === 0) return

    const isArchiveView = tableState.filters.status === 'archived'
    if (dom.bulkArchiveBtn) {
      dom.bulkArchiveBtn.classList.toggle('hidden', isArchiveView)
      dom.bulkArchiveBtn.disabled = false
    }
    if (dom.bulkRestoreBtn) {
      dom.bulkRestoreBtn.classList.toggle('hidden', !isArchiveView)
      dom.bulkRestoreBtn.disabled = false
    }
    if (dom.bulkDeleteBtn) {
      dom.bulkDeleteBtn.disabled = false
    }
  }

  const setBulkButtonsDisabled = (disabled) => {
    ;[dom.bulkArchiveBtn, dom.bulkRestoreBtn, dom.bulkDeleteBtn].forEach((button) => {
      if (button) {
        button.disabled = disabled
      }
    })
  }

  const syncSelectAllCheckbox = () => {
    if (!dom.selectAllCheckbox || !dom.tableBody) return

    const checkboxes = dom.tableBody.querySelectorAll('.row-select')
    const totalVisible = checkboxes.length
    if (totalVisible === 0) {
      dom.selectAllCheckbox.checked = false
      dom.selectAllCheckbox.indeterminate = false
      return
    }

    let selectedVisible = 0
    checkboxes.forEach((checkbox) => {
      const id = Number(checkbox.dataset.id)
      if (selectionState.ids.has(id)) {
        selectedVisible += 1
      }
    })

    dom.selectAllCheckbox.checked = selectedVisible > 0 && selectedVisible === totalVisible
    dom.selectAllCheckbox.indeterminate = selectedVisible > 0 && selectedVisible < totalVisible
  }

  const clearSelection = () => {
    selectionState.ids.clear()
    if (dom.selectAllCheckbox) {
      dom.selectAllCheckbox.checked = false
      dom.selectAllCheckbox.indeterminate = false
    }
    updateBulkToolbar()
  }

  const handleRowSelectionChange = (event) => {
    const checkbox = event.target.closest('.row-select')
    if (!checkbox) return

    const id = Number(checkbox.dataset.id)
    if (!Number.isFinite(id) || id <= 0) return

    if (checkbox.checked) {
      selectionState.ids.add(id)
    } else {
      selectionState.ids.delete(id)
    }

    syncSelectAllCheckbox()
    updateBulkToolbar()
  }

  const handleSelectAllChange = (event) => {
    const shouldSelectAll = Boolean(event.target.checked)
    selectionState.ids.clear()

    const checkboxes = dom.tableBody.querySelectorAll('.row-select')
    checkboxes.forEach((checkbox) => {
      const id = Number(checkbox.dataset.id)
      if (!Number.isFinite(id) || id <= 0) return

      checkbox.checked = shouldSelectAll
      if (shouldSelectAll) {
        selectionState.ids.add(id)
      }
    })

    if (!shouldSelectAll) {
      selectionState.ids.clear()
    }

    syncSelectAllCheckbox()
    updateBulkToolbar()
  }

  return {
    clearSelection,
    handleRowSelectionChange,
    handleSelectAllChange,
    setBulkButtonsDisabled,
    syncSelectAllCheckbox,
    updateBulkToolbar,
  }
}
