import { importAdminPropertyByHtml, importAdminPropertyByLink } from '../../services/propertyAdminApi.js'
import { isAbortError } from '../../../../shared/utils/api-error.js'
import { applyStatus, clearStatus, formatAdminError } from './adminCommon.js'

export default function createAdminImportController({
  dom,
  isDisposed,
  toggleImportModal,
  loadProperties,
  applyMainStatus,
}) {
  let importInProgress = false
  let activeImportAbortController = null

  const getImportSubmitButton = () => dom.importForm?.querySelector('button[type="submit"]')

  const setImportUiBusy = (busy) => {
    if (dom.importBtn) {
      dom.importBtn.disabled = busy
    }

    const submitBtn = getImportSubmitButton()
    if (submitBtn) {
      submitBtn.disabled = busy
    }

    if (dom.importUrlsTextarea) {
      dom.importUrlsTextarea.readOnly = busy
    }
    if (dom.importFilesInput) {
      dom.importFilesInput.disabled = busy
    }
    if (dom.importGeocodeCheckbox) {
      dom.importGeocodeCheckbox.disabled = busy
    }
  }

  const cancelRunningImport = () => {
    if (activeImportAbortController) {
      activeImportAbortController.abort()
      activeImportAbortController = null
    }
  }

  const handleImportSubmit = async (event) => {
    event.preventDefault()
    if (importInProgress) return

    importInProgress = true
    setImportUiBusy(true)

    clearStatus(dom.importStatusNode)
    const controller = new AbortController()
    activeImportAbortController = controller
    const { signal } = controller

    try {
      const urls = (dom.importUrlsTextarea?.value || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

      const files = dom.importFilesInput?.files ? Array.from(dom.importFilesInput.files) : []

      const totalTasks = urls.length + files.length
      if (!totalTasks) {
        applyStatus(dom.importStatusNode, 'Додайте посилання або HTML-файли для імпорту.', 'error')
        return
      }

      const summary = {
        created: [],
        errors: [],
      }

      if (dom.importProgressNode) {
        dom.importProgressNode.textContent = totalTasks ? `Завантаження (0/${totalTasks})` : 'Працюємо…'
        dom.importProgressNode.classList.remove('hidden')
      }

      let completed = 0

      for (const url of urls) {
        if (signal?.aborted) break
        try {
          const response = await importAdminPropertyByLink(
            {
              url,
              geocode: Boolean(dom.importGeocodeCheckbox?.checked),
            },
            {
              signal,
            },
          )

          if (response.created) {
            summary.created.push(response.created)
          }

          if (Array.isArray(response.errors)) {
            response.errors.forEach((entry) => {
              summary.errors.push({
                item: url,
                error: entry.error || JSON.stringify(entry.errors || {}),
              })
            })
          }
        } catch (error) {
          if (isAbortError(error)) break
          summary.errors.push({ item: url, error: formatAdminError(error) })
        }

        completed += 1
        if (dom.importProgressNode) {
          dom.importProgressNode.textContent = `Опрацьовано ${completed}/${totalTasks} • URL`
        }
      }

      for (const file of files) {
        if (signal?.aborted) break
        const formData = new FormData()
        formData.append('files', file)
        if (dom.importGeocodeCheckbox?.checked) {
          formData.append('geocode', '1')
        }

        try {
          const response = await importAdminPropertyByHtml(formData, { signal })

          if (Array.isArray(response.created)) {
            summary.created.push(...response.created)
          } else if (response.created) {
            summary.created.push(response.created)
          }

          if (Array.isArray(response.errors)) {
            response.errors.forEach((entry) => {
              summary.errors.push({
                item: entry.file || file.name,
                error: entry.error || JSON.stringify(entry.errors || {}),
              })
            })
          }
        } catch (error) {
          if (isAbortError(error)) break
          summary.errors.push({ item: file.name, error: formatAdminError(error) })
        }

        completed += 1
        if (dom.importProgressNode) {
          dom.importProgressNode.textContent = `Опрацьовано ${completed}/${totalTasks} • Файл`
        }
      }

      if (signal?.aborted) {
        applyStatus(dom.importStatusNode, 'Імпорт скасовано.', 'info')
        return
      }

      const createdCount = summary.created.length
      const errorsCount = summary.errors.length

      const warningItems = summary.created.flatMap((item) =>
        (item.warnings || []).map((warning) => `• ${item.title || item.id}: ${warning}`),
      )

      let message = `Створено ${createdCount} об’єкт(ів).`
      if (warningItems.length) {
        const preview = warningItems.slice(0, 5)
        if (warningItems.length > 5) {
          preview.push(`… ще ${warningItems.length - 5} попереджень`)
        }
        message += `\nПопередження:\n${preview.join('\n')}`
      }

      if (errorsCount) {
        const preview = summary.errors.slice(0, 5).map((entry) => `• ${entry.item}: ${entry.error}`)
        if (errorsCount > 5) {
          preview.push(`… ще ${errorsCount - 5} помилок`)
        }
        message += `\n${preview.join('\n')}`
        applyStatus(dom.importStatusNode, message, 'error')
      } else {
        applyStatus(dom.importStatusNode, message, 'success')
        toggleImportModal(false)
        applyMainStatus(message, 'success')
      }

      if (!isDisposed()) {
        await loadProperties()
      }
    } finally {
      if (dom.importProgressNode) {
        dom.importProgressNode.classList.add('hidden')
      }
      if (activeImportAbortController === controller) {
        activeImportAbortController = null
      }
      importInProgress = false
      setImportUiBusy(false)
    }
  }

  const bindEvents = ({ on }) => {
    on(dom.importBtn, 'click', () => {
      dom.importForm?.reset()
      clearStatus(dom.importStatusNode)
      toggleImportModal(true)
    })

    on(dom.closeImportModalBtn, 'click', () => {
      cancelRunningImport()
      toggleImportModal(false)
    })
    on(dom.cancelImportModalBtn, 'click', () => {
      cancelRunningImport()
      toggleImportModal(false)
    })

    on(dom.importModal, 'click', (event) => {
      if (event.target === dom.importModal) {
        cancelRunningImport()
        toggleImportModal(false)
      }
    })

    on(dom.importForm, 'submit', handleImportSubmit)
  }

  return {
    bindEvents,
    cleanup: () => {
      cancelRunningImport()
      importInProgress = false
      setImportUiBusy(false)
    },
  }
}
