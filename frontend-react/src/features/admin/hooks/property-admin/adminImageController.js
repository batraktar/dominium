import { toMediaPath } from '../../../../shared/utils/url.js'
import {
  deleteAdminPropertyImage,
  loadAdminPropertyImages,
  setAdminPropertyImageMain,
  uploadAdminPropertyImages,
} from '../../services/propertyAdminApi.js'
import { escapeHtml } from './adminCommon.js'

export default function createAdminImageController({ dom, imageState, isDisposed }) {
  const setImageGalleryMessage = (message) => {
    if (!dom.imageGallery) return
    dom.imageGallery.innerHTML = `<p class="text-sm text-gray-500">${escapeHtml(message)}</p>`
  }

  const renderImageGallery = (images = []) => {
    if (!dom.imageGallery) return

    if (!images.length) {
      setImageGalleryMessage('Фото не додано.')
      return
    }

    dom.imageGallery.innerHTML = ''
    images.forEach((image) => {
      const card = document.createElement('div')
      card.className = 'image-thumb relative flex flex-col'

      const imageUrl = toMediaPath(image.url, image.url)
      card.innerHTML = `
        <img src="${escapeHtml(imageUrl)}" alt="Фото ${image.id}" />
        ${image.is_main ? '<span class="main-label">Головне</span>' : ''}
        <div class="thumb-buttons">
          <button type="button" class="inline-flex justify-center items-center text-xs text-white bg-deepOcean hover:bg-deepOcean/90" data-image-action="set-main" data-image-id="${image.id}">
            Головне
          </button>
          <button type="button" class="inline-flex justify-center items-center text-xs text-white bg-red-500 hover:bg-red-500/90" data-image-action="delete" data-image-id="${image.id}">
            Видалити
          </button>
        </div>
      `

      dom.imageGallery.append(card)
    })
  }

  const clearImageGallery = () => {
    imageState.propertyId = null
    if (dom.imageUploadInput) {
      dom.imageUploadInput.setAttribute('disabled', 'true')
    }
    if (dom.imageUploadStatus) {
      dom.imageUploadStatus.textContent = 'Збережіть об’єкт, щоб додати фото.'
    }
    setImageGalleryMessage('Фото не додано.')
  }

  const loadPropertyImages = async (propertyId) => {
    if (!dom.imageGallery) return

    if (!propertyId) {
      clearImageGallery()
      return
    }

    imageState.propertyId = propertyId
    dom.imageUploadInput?.removeAttribute('disabled')
    if (dom.imageUploadStatus) {
      dom.imageUploadStatus.textContent = 'Завантаження фото...'
    }

    try {
      const payload = await loadAdminPropertyImages(propertyId)
      if (isDisposed()) return

      renderImageGallery(payload.results || [])
      if (dom.imageUploadStatus) {
        dom.imageUploadStatus.textContent = 'Підтримуються PNG/JPG до 12 МБ.'
      }
    } catch {
      if (isDisposed()) return

      setImageGalleryMessage('Не вдалося завантажити фото.')
      if (dom.imageUploadStatus) {
        dom.imageUploadStatus.textContent = 'Помилка завантаження.'
      }
    }
  }

  const uploadPropertyImages = async (files) => {
    if (!imageState.propertyId || !Array.isArray(files) || files.length === 0) {
      return
    }

    if (dom.imageUploadStatus) {
      dom.imageUploadStatus.textContent = 'Завантаження фото...'
    }

    try {
      await uploadAdminPropertyImages(imageState.propertyId, files)
      if (isDisposed()) return

      await loadPropertyImages(imageState.propertyId)
      if (dom.imageUploadStatus) {
        dom.imageUploadStatus.textContent = 'Фото успішно додано.'
      }
    } catch {
      if (isDisposed()) return

      if (dom.imageUploadStatus) {
        dom.imageUploadStatus.textContent = 'Не вдалося додати фото.'
      }
    } finally {
      if (dom.imageUploadInput) {
        dom.imageUploadInput.value = ''
      }
    }
  }

  const handleImageGalleryClick = async (event) => {
    const button = event.target.closest('[data-image-action]')
    if (!button) return

    const action = button.dataset.imageAction
    const imageId = Number(button.dataset.imageId)
    if (!imageState.propertyId || !Number.isFinite(imageId) || imageId <= 0) return

    if (action === 'set-main') {
      try {
        await setAdminPropertyImageMain(imageId)
        if (isDisposed()) return

        await loadPropertyImages(imageState.propertyId)
      } catch {
        if (isDisposed()) return
        setImageGalleryMessage('Не вдалося зробити фото головним.')
      }
    }

    if (action === 'delete') {
      try {
        await deleteAdminPropertyImage(imageId)
        if (isDisposed()) return

        await loadPropertyImages(imageState.propertyId)
      } catch {
        if (isDisposed()) return
        setImageGalleryMessage('Не вдалося видалити фото.')
      }
    }
  }

  const bindEvents = ({ on }) => {
    on(dom.imageGallery, 'click', handleImageGalleryClick)
    on(dom.imageUploadInput, 'change', (event) => {
      const files = Array.from(event.target.files || [])
      uploadPropertyImages(files)
    })
  }

  return {
    clearImageGallery,
    loadPropertyImages,
    bindEvents,
  }
}
