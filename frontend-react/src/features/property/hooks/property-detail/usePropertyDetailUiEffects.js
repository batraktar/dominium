import { useEffect } from 'react'

export default function usePropertyDetailUiEffects({
  setOpenShareMenu,
  modalOpen,
  galleryImagesLength,
  setModalOpen,
  setModalImageIndex,
}) {
  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!event.target.closest('[data-share-container]')) {
        setOpenShareMenu(false)
      }
    }

    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [setOpenShareMenu])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!modalOpen) return
      if (event.key === 'Escape') {
        setModalOpen(false)
      } else if (event.key === 'ArrowRight') {
        setModalImageIndex((index) => Math.min(index + 1, galleryImagesLength - 1))
      } else if (event.key === 'ArrowLeft') {
        setModalImageIndex((index) => Math.max(index - 1, 0))
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [galleryImagesLength, modalOpen, setModalImageIndex, setModalOpen])

}
