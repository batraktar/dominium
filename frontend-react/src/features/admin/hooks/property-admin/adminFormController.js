import {
  createAdminProperty,
  deleteAdminProperty,
  loadAdminDealTypes,
  loadAdminFeatures,
  loadAdminPropertyById,
  loadAdminPropertyTypes,
  updateAdminProperty,
} from '../../services/propertyAdminApi.js'
import { isAbortError } from '../../../../shared/utils/api-error.js'
import { applyStatus, clearStatus, escapeHtml, fillSelect, formatAdminError } from './adminCommon.js'

export default function createAdminFormController({
  root,
  dom,
  state,
  tableState,
  isDisposed,
  toggleModal,
  loadProperties,
  loadPropertyImages,
  renderHighlightPropertyTypes,
}) {
  let dictionariesAbortController = null
  let activeEditAbortController = null
  let activeEditRequestId = 0
  let submitInProgress = false
  let deleteInProgress = false

  const abortDictionariesRequest = () => {
    if (dictionariesAbortController) {
      dictionariesAbortController.abort()
      dictionariesAbortController = null
    }
  }

  const abortActiveEditRequest = () => {
    if (activeEditAbortController) {
      activeEditAbortController.abort()
      activeEditAbortController = null
    }
  }

  const setFormActionButtonsDisabled = (disabled) => {
    if (dom.submitBtn) {
      dom.submitBtn.disabled = disabled
    }
    if (dom.deleteBtn) {
      dom.deleteBtn.disabled = disabled
    }
  }

  const resetForm = () => {
    dom.formNode?.reset()
    state.editingId = null

    const propertyIdNode = dom.field('property-id')
    if (propertyIdNode) {
      propertyIdNode.value = ''
    }

    if (dom.formTitle) {
      dom.formTitle.textContent = 'Створення нового об’єкта'
    }

    if (dom.deleteBtn) {
      dom.deleteBtn.classList.add('hidden')
    }

    if (dom.submitBtn) {
      dom.submitBtn.innerHTML = '<i class="ri-save-line"></i> Створити'
    }

    clearStatus(dom.formStatusNode)

    const featuredCheckbox = dom.field('property-featured')
    if (featuredCheckbox) {
      featuredCheckbox.checked = false
    }

    root.querySelectorAll('#features-list input[type="checkbox"]').forEach((input) => {
      input.checked = false
    })

    loadPropertyImages(null)
  }

  const collectFormData = () => ({
    title: dom.field('property-title')?.value?.trim() || '',
    address: dom.field('property-address')?.value?.trim() || '',
    description: dom.field('property-description')?.value?.trim() || '',
    price: dom.field('property-price')?.value || null,
    area: dom.field('property-area')?.value || null,
    rooms: dom.field('property-rooms')?.value || null,
    property_type_id: Number(dom.field('property-type')?.value) || null,
    deal_type_id: Number(dom.field('deal-type')?.value) || null,
    feature_ids: Array.from(root.querySelectorAll('.feature-checkbox:checked')).map((input) =>
      Number(input.value),
    ),
    featured_homepage: dom.field('property-featured')?.checked ?? false,
  })

  const populateForm = (data) => {
    state.editingId = data.id

    const setValue = (id, value) => {
      const node = dom.field(id)
      if (node) {
        node.value = value ?? ''
      }
    }

    setValue('property-id', data.id)
    setValue('property-title', data.title)
    setValue('property-address', data.address)
    setValue('property-description', data.description)
    setValue('property-price', data.price)
    setValue('property-area', data.area)
    setValue('property-rooms', data.rooms)
    setValue('property-type', data.property_type?.id)
    setValue('deal-type', data.deal_type?.id)

    const featuredCheckbox = dom.field('property-featured')
    if (featuredCheckbox) {
      featuredCheckbox.checked = Boolean(data.featured_homepage)
    }

    const selectedFeatures = new Set((data.features || []).map((feature) => feature.id))
    root.querySelectorAll('.feature-checkbox').forEach((input) => {
      input.checked = selectedFeatures.has(Number(input.value))
    })

    if (dom.formTitle) {
      dom.formTitle.textContent = data.title ? `Редагування: ${data.title}` : 'Редагування'
    }

    if (dom.deleteBtn) {
      dom.deleteBtn.classList.remove('hidden')
    }

    if (dom.submitBtn) {
      dom.submitBtn.innerHTML = '<i class="ri-save-line"></i> Оновити'
    }

    toggleModal(true)
    loadPropertyImages(data.id)
  }

  const loadDictionaries = async () => {
    abortDictionariesRequest()
    const controller = new AbortController()
    dictionariesAbortController = controller

    try {
      const [propertyTypesPayload, dealTypesPayload, featuresPayload] = await Promise.all([
        loadAdminPropertyTypes({ signal: controller.signal }),
        loadAdminDealTypes({ signal: controller.signal }),
        loadAdminFeatures({ signal: controller.signal }),
      ])

      if (isDisposed()) return

      state.propertyTypes = propertyTypesPayload.results || []
      state.dealTypes = dealTypesPayload.results || []
      state.features = featuresPayload.results || []

      fillSelect(dom.field('property-type'), state.propertyTypes, 'Оберіть тип')
      fillSelect(dom.field('deal-type'), state.dealTypes, 'Оберіть угоду')
      fillSelect(dom.filterPropertyTypeSelect, state.propertyTypes, 'Усі типи')
      fillSelect(dom.filterDealTypeSelect, state.dealTypes, 'Усі угоди')

      if (typeof renderHighlightPropertyTypes === 'function') {
        renderHighlightPropertyTypes(state.highlightSettings?.property_type_ids || [])
      }

      if (dom.pageSizeSelect) {
        dom.pageSizeSelect.value = String(tableState.pageSize)
      }

      if (dom.filterStatusSelect) {
        dom.filterStatusSelect.value = tableState.filters.status
      }

      const featuresList = dom.byId('features-list')
      if (featuresList) {
        featuresList.innerHTML = ''

        if (state.features.length === 0) {
          featuresList.innerHTML = '<p class="text-sm text-gray-500">Немає характеристик.</p>'
        } else {
          state.features.forEach((feature) => {
            const wrapper = document.createElement('label')
            wrapper.className =
              'flex items-center gap-2 rounded-[9px] border border-gray-200 px-3 py-2 text-sm'
            wrapper.innerHTML = `
              <input type="checkbox" value="${feature.id}" class="feature-checkbox accent-deepOcean" />
              <span>${escapeHtml(feature.name)}</span>
            `
            featuresList.append(wrapper)
          })
        }
      }
    } catch (error) {
      if (isAbortError(error)) return
      if (isDisposed()) return
      applyStatus(dom.formStatusNode, formatAdminError(error), 'error')
    } finally {
      if (dictionariesAbortController === controller) {
        dictionariesAbortController = null
      }
    }
  }

  const openEditProperty = async (id) => {
    if (!Number.isFinite(id) || id <= 0) return

    activeEditRequestId += 1
    const requestId = activeEditRequestId
    abortActiveEditRequest()
    const controller = new AbortController()
    activeEditAbortController = controller

    toggleModal(true)
    applyStatus(dom.formStatusNode, 'Завантаження даних...', 'info')

    try {
      const detail = await loadAdminPropertyById(id, { signal: controller.signal })
      if (isDisposed() || requestId !== activeEditRequestId) return

      populateForm(detail)
      clearStatus(dom.formStatusNode)
    } catch (error) {
      if (isAbortError(error)) return
      if (isDisposed()) return
      applyStatus(dom.formStatusNode, formatAdminError(error), 'error')
    } finally {
      if (activeEditAbortController === controller) {
        activeEditAbortController = null
      }
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitInProgress) return

    submitInProgress = true
    setFormActionButtonsDisabled(true)
    clearStatus(dom.formStatusNode)

    const payload = collectFormData()
    const isEditing = Boolean(state.editingId)

    try {
      const result = isEditing
        ? await updateAdminProperty(state.editingId, payload)
        : await createAdminProperty(payload)

      if (isDisposed()) return

      applyStatus(dom.formStatusNode, isEditing ? 'Об’єкт успішно оновлено.' : 'Об’єкт створено.', 'success')
      await loadProperties()

      if (!isEditing && result?.id) {
        populateForm(result)
      }

      if (!isEditing) {
        state.editingId = result?.id || null

        if (dom.formTitle) {
          dom.formTitle.textContent = result?.title ? `Редагування: ${result.title}` : 'Редагування'
        }

        if (dom.deleteBtn) {
          dom.deleteBtn.classList.remove('hidden')
        }

        if (dom.submitBtn) {
          dom.submitBtn.innerHTML = '<i class="ri-save-line"></i> Оновити'
        }
      }
    } catch (error) {
      if (isAbortError(error)) return
      if (isDisposed()) return
      applyStatus(dom.formStatusNode, formatAdminError(error), 'error')
    } finally {
      submitInProgress = false
      if (!isDisposed()) {
        setFormActionButtonsDisabled(false)
      }
    }
  }

  const handleDelete = async () => {
    if (deleteInProgress) return
    if (!state.editingId) {
      applyStatus(dom.formStatusNode, 'Спочатку оберіть об’єкт для видалення.', 'info')
      return
    }

    if (!window.confirm('Видалити поточний об’єкт?')) {
      return
    }

    deleteInProgress = true
    setFormActionButtonsDisabled(true)
    try {
      await deleteAdminProperty(state.editingId)
      if (isDisposed()) return

      applyStatus(dom.formStatusNode, 'Об’єкт видалено.', 'success')
      resetForm()
      await loadProperties()
      toggleModal(false)
    } catch (error) {
      if (isAbortError(error)) return
      if (isDisposed()) return
      applyStatus(dom.formStatusNode, formatAdminError(error), 'error')
    } finally {
      deleteInProgress = false
      if (!isDisposed()) {
        setFormActionButtonsDisabled(false)
      }
    }
  }

  const closeModalAndResetStatus = () => {
    abortActiveEditRequest()
    toggleModal(false)
    clearStatus(dom.formStatusNode)
  }

  const bindEvents = ({ on }) => {
    on(dom.startCreateBtn, 'click', () => {
      resetForm()
      toggleModal(true)
    })

    on(dom.formNode, 'submit', handleSubmit)
    on(dom.deleteBtn, 'click', handleDelete)

    on(dom.closeModalBtn, 'click', closeModalAndResetStatus)

    on(dom.cancelModalBtn, 'click', closeModalAndResetStatus)

    on(dom.modal, 'click', (event) => {
      if (event.target === dom.modal) {
        closeModalAndResetStatus()
      }
    })
  }

  return {
    bindEvents,
    resetForm,
    loadDictionaries,
    openEditProperty,
    cleanup: () => {
      abortDictionariesRequest()
      abortActiveEditRequest()
    },
  }
}
