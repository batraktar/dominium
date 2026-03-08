import useSearchActions from './useSearchActions.js'
import useSearchDerivedState from './useSearchDerivedState.js'
import useSearchEffects from './useSearchEffects.js'
import useSearchInitialState from './useSearchInitialState.js'
import useSearchPageViewModel from './useSearchPageViewModel.js'
import useSearchFilterState from './search-state/useSearchFilterState.js'
import useSearchResultsDataState from './search-state/useSearchResultsDataState.js'
import useSearchRuntimeRefs from './search-state/useSearchRuntimeRefs.js'
import useSearchUiState from './search-state/useSearchUiState.js'

export default function useSearchPageController({ userIsAuthenticated = false }) {
  const initialState = useSearchInitialState()

  const filterState = useSearchFilterState(initialState)
  const resultsDataState = useSearchResultsDataState()
  const uiState = useSearchUiState()

  const { requestRef, toastTimerRef } = useSearchRuntimeRefs()

  const { selectedCurrencyMeta, propertyTypeSummary, activeChips, selectedSortLabel } =
    useSearchDerivedState({
      currency: filterState.currency,
      sortOption: filterState.sortOption,
      propertyTypes: resultsDataState.propertyTypes,
      selectedPropertyTypes: filterState.selectedPropertyTypes,
      query: filterState.query,
      priceRange: filterState.priceRange,
      areaRange: filterState.areaRange,
      roomsRange: filterState.roomsRange,
    })

  useSearchEffects({
    userIsAuthenticated,
    likedIdsLength: uiState.likedIds.length,
    query: filterState.query,
    selectedPropertyTypes: filterState.selectedPropertyTypes,
    priceRange: filterState.priceRange,
    areaRange: filterState.areaRange,
    roomsRange: filterState.roomsRange,
    sortOption: filterState.sortOption,
    perPage: filterState.perPage,
    currency: filterState.currency,
    page: filterState.page,
    requestRef,
    setPropertyTypes: resultsDataState.setPropertyTypes,
    setLikedIds: uiState.setLikedIds,
    setOpenDropdown: uiState.setOpenDropdown,
    setOpenShareMenuId: uiState.setOpenShareMenuId,
    setIsLoading: resultsDataState.setIsLoading,
    setSearchError: resultsDataState.setSearchError,
    setResults: resultsDataState.setResults,
    setTotalCount: resultsDataState.setTotalCount,
    setTotalPages: resultsDataState.setTotalPages,
    setPage: filterState.setPage,
  })

  const actionHandlers = useSearchActions({
    userIsAuthenticated,
    queryInput: filterState.queryInput,
    priceRange: filterState.priceRange,
    areaRange: filterState.areaRange,
    roomsRange: filterState.roomsRange,
    setQueryInput: filterState.setQueryInput,
    setQuery: filterState.setQuery,
    setPage: filterState.setPage,
    setSelectedPropertyTypes: filterState.setSelectedPropertyTypes,
    setPriceRange: filterState.setPriceRange,
    setAreaRange: filterState.setAreaRange,
    setRoomsRange: filterState.setRoomsRange,
    setOpenDropdown: uiState.setOpenDropdown,
    setOpenShareMenuId: uiState.setOpenShareMenuId,
    setLikedIds: uiState.setLikedIds,
    setResults: resultsDataState.setResults,
    setSortOption: filterState.setSortOption,
    setPerPage: filterState.setPerPage,
    setCurrency: filterState.setCurrency,
    toastTimerRef,
  })

  const derivedState = {
    selectedCurrencyMeta,
    propertyTypeSummary,
    activeChips,
    selectedSortLabel,
  }

  return useSearchPageViewModel({
    filterState,
    resultsDataState,
    uiState,
    derivedState,
    actionHandlers,
  })
}
