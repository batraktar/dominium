import { useRef } from 'react'

export default function useSearchRuntimeRefs() {
  const requestRef = useRef(null)
  const toastTimerRef = useRef(null)

  return {
    requestRef,
    toastTimerRef,
  }
}
