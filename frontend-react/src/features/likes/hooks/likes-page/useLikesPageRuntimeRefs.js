import { useRef } from 'react'

export default function useLikesPageRuntimeRefs() {
  const toastTimerRef = useRef(null)

  return {
    toastTimerRef,
  }
}
