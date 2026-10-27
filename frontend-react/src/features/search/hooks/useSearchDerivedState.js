import { useMemo } from 'react'
import { CURRENCY_OPTIONS } from '../constants/searchConfig.js'
import {
  buildActiveFilterChips,
  buildPropertyTypeMap,
  buildPropertyTypeSummary,
  resolveSelectedSortLabel,
} from '../model/searchDerivedStateModel.js'

export default function useSearchDerivedState({
  currency,
  sortOption,
  propertyTypes = [],
  selectedPropertyTypes = [],
  query = '',
  location = '',
  priceRange,
  areaRange,
  roomsRange,
}) {
  const selectedCurrencyMeta =
    CURRENCY_OPTIONS.find((option) => option.code === currency) || CURRENCY_OPTIONS[0]

  const propertyTypeMap = useMemo(() => buildPropertyTypeMap(propertyTypes), [propertyTypes])

  const propertyTypeSummary = useMemo(
    () =>
      buildPropertyTypeSummary({
        selectedPropertyTypes,
        propertyTypeMap,
      }),
    [propertyTypeMap, selectedPropertyTypes],
  )

  const activeChips = useMemo(() => {
    const chips = buildActiveFilterChips({
        query,
        selectedPropertyTypes,
        propertyTypeMap,
        priceRange,
        areaRange,
        roomsRange,
      })
    if (location) chips.unshift({ key: 'location', label: `Населений пункт: ${location}` })
    return chips
  },
    [
      areaRange,
      priceRange,
      propertyTypeMap,
      query,
      location,
      roomsRange,
      selectedPropertyTypes,
    ],
  )

  const selectedSortLabel = resolveSelectedSortLabel(sortOption)

  return {
    selectedCurrencyMeta,
    propertyTypeSummary,
    activeChips,
    selectedSortLabel,
  }
}
