import { useEffect } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

export default function useSearchLoadPropertyTypesEffect({ setPropertyTypes }) {
  useEffect(() => {
    let cancelled = false

    const loadPropertyTypes = async () => {
      try {
        const { data: payload } = await apiClient.get(apiEndpoints.propertyTypes, { retry: 1 })
        if (cancelled) return

        const options = Array.isArray(payload?.results) ? payload.results : []
        setPropertyTypes(options)
      } catch {
        if (!cancelled) {
          setPropertyTypes([])
        }
      }
    }

    loadPropertyTypes()

    return () => {
      cancelled = true
    }
  }, [setPropertyTypes])
}
