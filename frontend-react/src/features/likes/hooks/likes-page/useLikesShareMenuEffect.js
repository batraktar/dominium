import { useEffect } from 'react'

export default function useLikesShareMenuEffect({ setOpenShareMenuId }) {
  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!event.target.closest('[data-share-container]')) {
        setOpenShareMenuId(null)
      }
    }

    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [setOpenShareMenuId])
}
