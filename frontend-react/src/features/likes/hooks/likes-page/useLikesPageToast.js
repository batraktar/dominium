import { useEffect } from 'react'

export default function useLikesPageToast({ toastTimerRef }) {
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [toastTimerRef])

  const showToast = (message, isError = false) => {
    const toast = document.getElementById('toast')
    if (!toast) return

    toast.textContent = message
    toast.classList.remove('hidden', 'bg-green-500', 'bg-red-500')
    toast.classList.add(isError ? 'bg-red-500' : 'bg-green-500')

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      toast.classList.add('hidden')
      toast.classList.remove('bg-green-500', 'bg-red-500')
    }, 2400)
  }

  return {
    showToast,
  }
}
