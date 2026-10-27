import useSearchLoadLikedIdsEffect from './useSearchLoadLikedIdsEffect.js'
import useSearchLoadPropertyTypesEffect from './useSearchLoadPropertyTypesEffect.js'
import useSearchResultsEffect from './useSearchResultsEffect.js'
import useSearchUiEffects from './useSearchUiEffects.js'

export default function useSearchEffects({
  userIsAuthenticated = false,
  likedIdsLength = 0,
  query = '',
  location = '',
  selectedPropertyTypes = [],
  priceRange,
  areaRange,
  roomsRange,
  sortOption = 'date',
  perPage = 24,
  currency = 'USD',
  page = 1,
  requestRef,
  setPropertyTypes,
  setLikedIds,
  setOpenDropdown,
  setOpenShareMenuId,
  setIsLoading,
  setSearchError,
  setResults,
  setTotalCount,
  setTotalPages,
  setExchangeRates,
  setPage,
}) {
  useSearchLoadPropertyTypesEffect({
    setPropertyTypes,
  })

  useSearchLoadLikedIdsEffect({
    userIsAuthenticated,
    likedIdsLength,
    setLikedIds,
  })

  useSearchUiEffects({
    setOpenDropdown,
    setOpenShareMenuId,
  })

  useSearchResultsEffect({
    query,
    location,
    selectedPropertyTypes,
    priceRange,
    areaRange,
    roomsRange,
    sortOption,
    perPage,
    currency,
    page,
    requestRef,
    setIsLoading,
    setSearchError,
    setResults,
    setTotalCount,
    setTotalPages,
    setExchangeRates,
    setPage,
  })
}
