import useSearchDropdownActions from './search-filter-actions/useSearchDropdownActions.js'
import useSearchPropertyTypeActions from './search-filter-actions/useSearchPropertyTypeActions.js'
import useSearchRangeFilterActions from './search-filter-actions/useSearchRangeFilterActions.js'
import useSearchSubmitActions from './search-filter-actions/useSearchSubmitActions.js'

export default function useSearchFilterActions({
  queryInput = '',
  setQueryInput,
  setQuery,
  setPage,
  setSelectedPropertyTypes,
  priceRange,
  areaRange,
  roomsRange,
  setPriceRange,
  setAreaRange,
  setRoomsRange,
  setOpenDropdown,
  setSortOption,
  setPerPage,
  setCurrency,
}) {
  const submitActions = useSearchSubmitActions({
    queryInput,
    setQuery,
    setPage,
  })

  const propertyTypeActions = useSearchPropertyTypeActions({
    setSelectedPropertyTypes,
    setPage,
  })

  const rangeActions = useSearchRangeFilterActions({
    priceRange,
    areaRange,
    roomsRange,
    setPriceRange,
    setAreaRange,
    setRoomsRange,
    setPage,
  })

  const dropdownActions = useSearchDropdownActions({
    setOpenDropdown,
    setSortOption,
    setPerPage,
    setCurrency,
    setPage,
  })

  const clearChip = (key) => {
    if (key === 'query') {
      setQuery('')
      setQueryInput('')
      setPage(1)
      return
    }

    if (key === 'property_type') {
      propertyTypeActions.resetPropertyTypes()
      return
    }

    if (key === 'price') {
      rangeActions.resetPriceRange()
      return
    }

    if (key === 'area') {
      rangeActions.resetAreaRange()
      return
    }

    if (key === 'rooms') {
      rangeActions.resetRoomsRange()
    }
  }

  return {
    ...submitActions,
    ...propertyTypeActions,
    ...rangeActions,
    clearChip,
    ...dropdownActions,
  }
}
