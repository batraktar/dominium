import { useEffect } from 'react'

export default function useDominiumPreloaderEffect() {
  useEffect(() => {
    const preloader = document.getElementById('preloader')
    if (!preloader) return undefined

    const timeouts = []
    let onLoad

    const hidePreloader = () => {
      preloader.classList.add('opacity-0', 'pointer-events-none')
      const removeTimeout = window.setTimeout(() => {
        preloader.remove()
        document.body.classList.remove('overflow-hidden')
      }, 700)
      timeouts.push(removeTimeout)
    }

    if (document.readyState === 'complete') {
      const loadTimeout = window.setTimeout(hidePreloader, 1000)
      timeouts.push(loadTimeout)
    } else {
      onLoad = () => {
        const loadTimeout = window.setTimeout(hidePreloader, 1000)
        timeouts.push(loadTimeout)
      }
      window.addEventListener('load', onLoad, { once: true })
    }

    return () => {
      if (onLoad) {
        window.removeEventListener('load', onLoad)
      }
      timeouts.forEach((id) => window.clearTimeout(id))
    }
  }, [])
}
