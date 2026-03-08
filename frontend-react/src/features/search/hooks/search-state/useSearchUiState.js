import { useState } from 'react'
import { parseLikedIdsFromDom } from '../../utils/searchPageUtils.js'

export default function useSearchUiState() {
  const [openDropdown, setOpenDropdown] = useState(null)
  const [openShareMenuId, setOpenShareMenuId] = useState(null)
  const [likedIds, setLikedIds] = useState(() => parseLikedIdsFromDom())

  return {
    openDropdown,
    setOpenDropdown,
    openShareMenuId,
    setOpenShareMenuId,
    likedIds,
    setLikedIds,
  }
}
