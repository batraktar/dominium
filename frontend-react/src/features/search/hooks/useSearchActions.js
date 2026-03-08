import useSearchFilterActions from './useSearchFilterActions.js'
import useSearchResultActions from './useSearchResultActions.js'

export default function useSearchActions({
  userIsAuthenticated = false,
  queryInput = '',
  priceRange,
  areaRange,
  roomsRange,
  setQueryInput,
  setQuery,
  setPage,
  setSelectedPropertyTypes,
  setPriceRange,
  setAreaRange,
  setRoomsRange,
  setOpenDropdown,
  setOpenShareMenuId,
  setLikedIds,
  setResults,
  setSortOption,
  setPerPage,
  setCurrency,
  toastTimerRef,
}) {
  const filterActions = useSearchFilterActions({
    queryInput,
    priceRange,
    areaRange,
    roomsRange,
    setQueryInput,
    setQuery,
    setPage,
    setSelectedPropertyTypes,
    setPriceRange,
    setAreaRange,
    setRoomsRange,
    setOpenDropdown,
    setSortOption,
    setPerPage,
    setCurrency,
  })

  const resultActions = useSearchResultActions({
    userIsAuthenticated,
    setLikedIds,
    setResults,
    setOpenShareMenuId,
    toastTimerRef,
  })

  return {
    ...filterActions,
    ...resultActions,
  }
}
