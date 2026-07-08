import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

const STATS_ENDPOINT = '/api/properties/?page_size=1'

function useAdminDashboard() {
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalImages: 0,
    activeProperties: 0,
    archivedProperties: 0,
    loading: true,
    error: null,
  })

  const loadStats = useCallback(async () => {
    setStats(prev => ({ ...prev, loading: true, error: null }))
    try {
      const [activeRes, archivedRes] = await Promise.all([
        apiClient.get(apiEndpoints.properties, { query: { page_size: 1, status: 'active' } }),
        apiClient.get(apiEndpoints.properties, { query: { page_size: 1, status: 'archived' } }),
      ])
      setStats({
        totalProperties: (activeRes.data?.count || 0) + (archivedRes.data?.count || 0),
        activeProperties: activeRes.data?.count || 0,
        archivedProperties: archivedRes.data?.count || 0,
        totalImages: 0,
        loading: false,
        error: null,
      })
    } catch (error) {
      setStats(prev => ({ ...prev, loading: false, error: error.message }))
    }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  return { stats, refreshStats: loadStats }
}

export default useAdminDashboard
