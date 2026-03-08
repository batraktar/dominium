import { useEffect } from 'react'

export default function useDominiumHeroVideoEffect() {
  useEffect(() => {
    const heroVideoEl = document.querySelector("video[data-lazy-video='hero']")
    if (!heroVideoEl) return undefined

    let heroVideoObserver

    const shouldDisableBackgroundVideo = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const saveData = Boolean(navigator.connection && navigator.connection.saveData)
      return prefersReducedMotion || saveData
    }

    const loadAndPlayVideo = () => {
      if (heroVideoEl.dataset.loaded === '1') return
      const source = heroVideoEl.querySelector('source[data-src]')
      if (!source || !source.dataset.src) return

      source.src = source.dataset.src
      heroVideoEl.dataset.loaded = '1'
      heroVideoEl.load()

      const playPromise = heroVideoEl.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {})
      }
    }

    if (!shouldDisableBackgroundVideo()) {
      if ('IntersectionObserver' in window) {
        heroVideoObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return
              loadAndPlayVideo()
              heroVideoObserver.disconnect()
            })
          },
          { rootMargin: '200px 0px' },
        )
        heroVideoObserver.observe(heroVideoEl)
      } else {
        loadAndPlayVideo()
      }
    }

    return () => {
      if (heroVideoObserver) {
        heroVideoObserver.disconnect()
      }
    }
  }, [])
}
