import { useCallback, useEffect } from 'react'

function clearToastTimer(toastTimerRef) {
  if (toastTimerRef.current) {
    window.clearTimeout(toastTimerRef.current)
  }
}

export default function usePropertyDetailToast({ toastTimerRef }) {
  useEffect(() => {
    return () => {
      clearToastTimer(toastTimerRef)
    }
  }, [toastTimerRef])

  const showToast = useCallback(
    (message, isError = false) => {
      const toast = document.getElementById('toast')
      if (!toast) return

      toast.textContent = message
      toast.classList.remove('hidden', 'bg-green-500', 'bg-red-500')
      toast.classList.add(isError ? 'bg-red-500' : 'bg-green-500')

      clearToastTimer(toastTimerRef)

      toastTimerRef.current = window.setTimeout(() => {
        toast.classList.add('hidden')
        toast.classList.remove('bg-green-500', 'bg-red-500')
      }, 2600)
    },
    [toastTimerRef],
  )

  return {
    showToast,
  }
}
