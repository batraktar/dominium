import { useState } from 'react'

export default function useLikesPageState() {
  const [properties, setProperties] = useState([])
  const [likedIds, setLikedIds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [openShareMenuId, setOpenShareMenuId] = useState(null)

  return {
    properties,
    setProperties,
    likedIds,
    setLikedIds,
    isLoading,
    setIsLoading,
    loadError,
    setLoadError,
    openShareMenuId,
    setOpenShareMenuId,
  }
}
