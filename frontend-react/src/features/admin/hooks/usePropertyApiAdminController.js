import { useEffect, useRef } from 'react'
import { applyStatus, clearStatus, clearTableStatus } from './property-admin/adminCommon.js'
import getAdminDomRefs from './property-admin/adminDomRefs.js'
import createAdminFormController from './property-admin/adminFormController.js'
import createAdminHighlightController from './property-admin/adminHighlightController.js'
import createAdminImageController from './property-admin/adminImageController.js'
import createAdminImportController from './property-admin/adminImportController.js'
import createAdminState from './property-admin/adminState.js'
import createAdminTableController from './property-admin/adminTableController.js'

export default function usePropertyApiAdminController({ enabled = true, userIsStaff = false } = {}) {
  const rootRef = useRef(null)

  useEffect(() => {
    if (!enabled) return undefined

    const root = rootRef.current
    if (!root) return undefined

    let disposed = false
    const isDisposed = () => disposed

    const dom = getAdminDomRefs(root)
    if (!dom.tableBody || !dom.formNode || !dom.modal) {
      return undefined
    }

    const { state, tableState, selectionState, imageState, runtime } = createAdminState()

    if (!userIsStaff) {
      root.querySelectorAll('[data-staff-only="1"]').forEach((node) => {
        node.classList.add('hidden')
      })
    }

    if (dom.imageUploadInput) {
      dom.imageUploadInput.setAttribute('disabled', 'true')
    }

    const cleanups = []
    const addCleanup = (cleanup) => {
      if (typeof cleanup === 'function') {
        cleanups.push(cleanup)
      }
    }

    const on = (target, eventName, handler, options) => {
      if (!target || typeof target.addEventListener !== 'function') return
      target.addEventListener(eventName, handler, options)
      addCleanup(() => target.removeEventListener(eventName, handler, options))
    }

    const toggleBodyModalLock = () => {
      const hasOpenModal = [dom.modal, dom.importModal, dom.highlightModal].some(
        (modalNode) => modalNode && !modalNode.classList.contains('hidden'),
      )
      document.body.classList.toggle('overflow-hidden', hasOpenModal)
    }

    const toggleModal = (show) => {
      if (!dom.modal) return
      dom.modal.classList.toggle('hidden', !show)
      toggleBodyModalLock()
    }

    const toggleImportModal = (show) => {
      if (!dom.importModal) return
      dom.importModal.classList.toggle('hidden', !show)
      if (!show) {
        clearStatus(dom.importStatusNode)
        if (dom.importProgressNode) {
          dom.importProgressNode.classList.add('hidden')
          dom.importProgressNode.textContent = ''
        }
      }
      toggleBodyModalLock()
    }

    const toggleHighlightModal = (show) => {
      if (!dom.highlightModal) return
      dom.highlightModal.classList.toggle('hidden', !show)
      if (!show) {
        clearStatus(dom.highlightStatusNode)
      }
      toggleBodyModalLock()
    }

    const tableController = createAdminTableController({
      dom,
      tableState,
      selectionState,
      runtime,
      isDisposed,
    })

    const imageController = createAdminImageController({
      dom,
      imageState,
      isDisposed,
    })

    const highlightController = createAdminHighlightController({
      root,
      dom,
      state,
      isDisposed,
      toggleHighlightModal,
      loadProperties: tableController.loadProperties,
    })

    const formController = createAdminFormController({
      root,
      dom,
      state,
      tableState,
      isDisposed,
      toggleModal,
      loadProperties: tableController.loadProperties,
      loadPropertyImages: imageController.loadPropertyImages,
      renderHighlightPropertyTypes: highlightController.renderHighlightPropertyTypes,
    })

    const importController = createAdminImportController({
      dom,
      isDisposed,
      toggleImportModal,
      loadProperties: tableController.loadProperties,
      applyMainStatus: (message, type) => applyStatus(dom.formStatusNode, message, type),
    })

    tableController.bindEvents({
      on,
      onEdit: formController.openEditProperty,
    })
    formController.bindEvents({ on })
    imageController.bindEvents({ on })
    importController.bindEvents({ on })
    highlightController.bindEvents({ on })

    const bootstrap = async () => {
      await formController.loadDictionaries()
      await highlightController.loadHighlightSettings()
      await tableController.loadProperties()
    }

    bootstrap()

    addCleanup(() => {
      formController.cleanup?.()
      importController.cleanup?.()
      tableController.cleanup()
      toggleModal(false)
      toggleImportModal(false)
      toggleHighlightModal(false)
      clearStatus(dom.formStatusNode)
      clearStatus(dom.importStatusNode)
      clearStatus(dom.highlightStatusNode)
      clearTableStatus(dom.tableStatusNode)
    })

    return () => {
      disposed = true
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [enabled, userIsStaff])

  return {
    rootRef,
  }
}
