import { loadAdminHighlightSettings, saveAdminHighlightSettings } from '../../services/propertyAdminApi.js'
import { applyStatus, clearStatus, escapeHtml, formatAdminError } from './adminCommon.js'

export default function createAdminHighlightController({
  root,
  dom,
  state,
  isDisposed,
  toggleHighlightModal,
  loadProperties,
}) {
  const renderHighlightPropertyTypes = (selectedIds = []) => {
    if (!dom.highlightPropertyTypesContainer) return

    const selectedSet = new Set(selectedIds || [])
    dom.highlightPropertyTypesContainer.innerHTML = ''

    if (!state.propertyTypes.length) {
      dom.highlightPropertyTypesContainer.innerHTML =
        '<p class="text-sm text-gray-500">Немає доступних типів нерухомості.</p>'
      return
    }

    state.propertyTypes.forEach((item) => {
      const label = document.createElement('label')
      label.className =
        'flex items-center gap-2 rounded-[9px] border border-gray-200 px-3 py-2 text-sm'

      const isChecked = selectedSet.has(item.id)
      label.innerHTML = `
        <input type="checkbox" value="${item.id}" class="highlight-type-checkbox accent-deepOcean" ${
          isChecked ? 'checked' : ''
        } />
        <span>${escapeHtml(item.name)}</span>
      `

      dom.highlightPropertyTypesContainer.append(label)
    })
  }

  const populateHighlightForm = (data) => {
    if (!dom.highlightForm || !data) return

    const setValue = (id, value) => {
      const node = dom.field(id)
      if (node) {
        node.value = value ?? ''
      }
    }

    setValue('highlight-limit', data.limit ?? 3)
    setValue('highlight-price-min', data.price_min)
    setValue('highlight-price-max', data.price_max)
    setValue('highlight-region', data.region_keyword || '')
    renderHighlightPropertyTypes(data.property_type_ids || [])
  }

  const collectHighlightPayload = () => {
    const payload = {
      limit: dom.field('highlight-limit')?.value ?? null,
      price_min: dom.field('highlight-price-min')?.value ?? null,
      price_max: dom.field('highlight-price-max')?.value ?? null,
      region_keyword: dom.field('highlight-region')?.value ?? '',
      property_type_ids: Array.from(root.querySelectorAll('.highlight-type-checkbox:checked')).map(
        (input) => Number(input.value),
      ),
    }

    if (payload.price_min === '' || payload.price_min == null) {
      payload.price_min = null
    }
    if (payload.price_max === '' || payload.price_max == null) {
      payload.price_max = null
    }

    return payload
  }

  const loadHighlightSettings = async () => {
    if (!dom.highlightForm) return

    clearStatus(dom.highlightStatusNode)
    try {
      const response = await loadAdminHighlightSettings()
      if (isDisposed()) return

      state.highlightSettings = response.result || null
      populateHighlightForm(state.highlightSettings || {})
    } catch (error) {
      if (isDisposed()) return
      applyStatus(dom.highlightStatusNode, formatAdminError(error), 'error')
    }
  }

  const bindEvents = ({ on }) => {
    on(dom.openHighlightBtn, 'click', async () => {
      await loadHighlightSettings()
      toggleHighlightModal(true)
    })

    on(dom.closeHighlightModalBtn, 'click', () => toggleHighlightModal(false))
    on(dom.cancelHighlightModalBtn, 'click', () => toggleHighlightModal(false))

    on(dom.highlightModal, 'click', (event) => {
      if (event.target === dom.highlightModal) {
        toggleHighlightModal(false)
      }
    })

    on(dom.highlightForm, 'submit', async (event) => {
      event.preventDefault()
      clearStatus(dom.highlightStatusNode)

      try {
        const payload = collectHighlightPayload()
        const response = await saveAdminHighlightSettings(payload, {
          isCreate: !state.highlightSettings?.id,
        })
        if (isDisposed()) return

        state.highlightSettings = response.result || null
        populateHighlightForm(state.highlightSettings || {})
        applyStatus(dom.highlightStatusNode, 'Налаштування збережено.', 'success')
        await loadProperties()
      } catch (error) {
        if (isDisposed()) return
        applyStatus(dom.highlightStatusNode, formatAdminError(error), 'error')
      }
    })

    on(dom.highlightResetBtn, 'click', (event) => {
      event.preventDefault()
      populateHighlightForm({
        limit: 3,
        price_min: null,
        price_max: null,
        region_keyword: '',
        property_type_ids: [],
      })
      applyStatus(
        dom.highlightStatusNode,
        'Поля скинуто. Натисніть «Зберегти», щоб застосувати зміни.',
        'info',
      )
    })
  }

  return {
    renderHighlightPropertyTypes,
    loadHighlightSettings,
    bindEvents,
  }
}
