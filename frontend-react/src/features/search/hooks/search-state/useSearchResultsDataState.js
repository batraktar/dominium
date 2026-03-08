import { useState } from 'react'

export default function useSearchResultsDataState() {
  const [propertyTypes, setPropertyTypes] = useState([])
  const [results, setResults] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  return {
    propertyTypes,
    setPropertyTypes,
    results,
    setResults,
    totalCount,
    setTotalCount,
    totalPages,
    setTotalPages,
    isLoading,
    setIsLoading,
    searchError,
    setSearchError,
  }
}
