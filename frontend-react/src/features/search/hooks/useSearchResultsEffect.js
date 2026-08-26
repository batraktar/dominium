import { useEffect } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { buildSearchQueryParams, toSearchPageUrl } from '../model/searchResultsQueryModel.js'

export default function useSearchResultsEffect({
  query = '',
  selectedPropertyTypes = [],
  priceRange,
  areaRange,
  roomsRange,
  sortOption = 'date',
  perPage = 9,
  currency = 'USD',
  page = 1,
  requestRef,
  setIsLoading,
  setSearchError,
  setResults,
  setTotalCount,
  setTotalPages,
  setExchangeRates,
  setPage,
}) {
  useEffect(() => {
    const debounceId = window.setTimeout(async () => {
      if (requestRef.current) {
        requestRef.current.abort()
      }

      const { browserParams, apiParams } = buildSearchQueryParams({
        query,
        selectedPropertyTypes,
        priceRange: {
          min: priceRange.min,
          max: priceRange.max,
        },
        areaRange: {
          min: areaRange.min,
          max: areaRange.max,
        },
        roomsRange: {
          min: roomsRange.min,
          max: roomsRange.max,
        },
        sortOption,
        perPage,
        currency,
        page,
        pathname: window.location.pathname,
      })

      const nextUrl = toSearchPageUrl(browserParams)
      window.history.replaceState({}, '', nextUrl)

      const controller = new AbortController()
      requestRef.current = controller
      setIsLoading(true)
      setSearchError('')

      try {
        const { data: payload } = await apiClient.get(apiEndpoints.properties, {
          query: apiParams,
          signal: controller.signal,
          retry: 1,
        })
        const payloadResults = Array.isArray(payload?.results) ? payload.results : []

        setResults(payloadResults)
        setTotalCount(Number(payload?.count || 0))
        setTotalPages(Math.max(Number(payload?.total_pages || 1), 1))
        setExchangeRates({
          USD: Number(payload?.exchange_rates?.USD) || null,
          EUR: Number(payload?.exchange_rates?.EUR) || null,
        })

        const apiPage = Number(payload?.page || page)
        if (Number.isFinite(apiPage) && apiPage > 0 && apiPage !== page) {
          setPage(apiPage)
        }
      } catch (error) {
        if (error?.name === 'AbortError' || controller.signal.aborted) return
        setSearchError('Не вдалося оновити результати. Спробуйте ще раз.')
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null
        }
        setIsLoading(false)
      }
    }, 320)

    return () => {
      window.clearTimeout(debounceId)
      if (requestRef.current) {
        requestRef.current.abort()
        requestRef.current = null
      }
    }
  }, [
    areaRange.max,
    areaRange.min,
    currency,
    page,
    perPage,
    priceRange.max,
    priceRange.min,
    query,
    roomsRange.max,
    roomsRange.min,
    selectedPropertyTypes,
    sortOption,
    requestRef,
    setIsLoading,
    setPage,
    setResults,
    setSearchError,
    setTotalCount,
    setTotalPages,
    setExchangeRates,
  ])
}
