import { useState } from 'react'

export default function useSearchFilterState(initialState) {
  const [queryInput, setQueryInput] = useState(initialState.query)
  const [query, setQuery] = useState(initialState.query)
  const [page, setPage] = useState(initialState.page)
  const [sortOption, setSortOption] = useState(initialState.sort)
  const [perPage, setPerPage] = useState(initialState.perPage)
  const [currency, setCurrency] = useState(initialState.currency)
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState(initialState.propertyTypes)
  const [priceRange, setPriceRange] = useState(initialState.priceRange)
  const [areaRange, setAreaRange] = useState(initialState.areaRange)
  const [roomsRange, setRoomsRange] = useState(initialState.roomsRange)

  return {
    queryInput,
    setQueryInput,
    query,
    setQuery,
    page,
    setPage,
    sortOption,
    setSortOption,
    perPage,
    setPerPage,
    currency,
    setCurrency,
    selectedPropertyTypes,
    setSelectedPropertyTypes,
    priceRange,
    setPriceRange,
    areaRange,
    setAreaRange,
    roomsRange,
    setRoomsRange,
  }
}
