import { useCallback, useEffect, useRef, useState } from 'react'
import { loadPropertyApiDemoPayload } from '../services/propertyApiDemoApi.js'

export default function usePropertyApiDemoController() {
  const abortRef = useRef(null)
  const [output, setOutput] = useState('Завантаження...')
  const [isLoading, setIsLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller
    setIsLoading(true)
    setOutput('Завантаження...')

    try {
      const payload = await loadPropertyApiDemoPayload({ signal: controller.signal })
      setOutput(JSON.stringify(payload, null, 2))
    } catch (error) {
      if (error?.name === 'AbortError') return
      setOutput(`Помилка: ${error?.message || 'Не вдалося отримати дані.'}`)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [loadData])

  return {
    output,
    isLoading,
    reload: loadData,
  }
}
