import { useEffect } from 'react'

export default function useSearchUiEffects({
  setOpenDropdown,
  setOpenShareMenuId,
}) {
  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!event.target.closest('[data-react-dropdown]')) {
        setOpenDropdown(null)
      }

      if (!event.target.closest('[data-share-container]')) {
        setOpenShareMenuId(null)
      }
    }

    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [setOpenDropdown, setOpenShareMenuId])
}
