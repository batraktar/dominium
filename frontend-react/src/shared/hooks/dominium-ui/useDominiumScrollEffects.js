import { useEffect } from 'react'

export default function useDominiumScrollEffects() {
  useEffect(() => {
    const cleanups = []

    const scrollBtn = document.getElementById('scrollToTop')
    if (scrollBtn) {
      const onScroll = () => {
        if (window.scrollY > 300) {
          scrollBtn.classList.remove('hidden')
        } else {
          scrollBtn.classList.add('hidden')
        }
      }

      const onClick = (event) => {
        event.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }

      window.addEventListener('scroll', onScroll)
      scrollBtn.addEventListener('click', onClick)
      onScroll()

      cleanups.push(() => window.removeEventListener('scroll', onScroll))
      cleanups.push(() => scrollBtn.removeEventListener('click', onClick))
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])
}
