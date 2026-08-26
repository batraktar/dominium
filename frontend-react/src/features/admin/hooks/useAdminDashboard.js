import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

const EMPTY_STATS = {
  total: 0,
  active: 0,
  archived: 0,
  featured: 0,
  total_images: 0,
  total_clients: 0,
  avg_price: 0,
  avg_area: 0,
  monthly: [],
  by_type: [],
  by_deal: [],
}

function useAdminDashboard() {
  const [stats, setStats] = useState({
    ...EMPTY_STATS,
    loading: true,
    error: null,
  })

  const loadStats = useCallback(async () => {
    setStats((previous) => ({ ...previous, loading: true, error: null }))

    try {
      const response = await apiClient.get(apiEndpoints.stats)
      setStats({
        ...EMPTY_STATS,
        ...(response.data || {}),
        loading: false,
        error: null,
      })
    } catch (error) {
      setStats((previous) => ({
        ...previous,
        loading: false,
        error: error?.message || 'Не вдалося завантажити статистику.',
      }))
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return { stats, refreshStats: loadStats }
}

export default useAdminDashboard
