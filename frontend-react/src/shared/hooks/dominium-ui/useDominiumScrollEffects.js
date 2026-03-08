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

    const scrollContainer = document.getElementById('scroll-container')
    if (scrollContainer) {
      let startY = 0
      let isPulling = false

      const onTouchStart = (event) => {
        if (scrollContainer.scrollTop === 0) {
          startY = event.touches[0].clientY
          isPulling = true
        }
      }

      const onTouchMove = (event) => {
        if (!isPulling) return
        const currentY = event.touches[0].clientY
        const diff = currentY - startY
        if (diff > 80) {
          window.location.reload()
          isPulling = false
        }
      }

      const onTouchEnd = () => {
        isPulling = false
      }

      scrollContainer.addEventListener('touchstart', onTouchStart)
      scrollContainer.addEventListener('touchmove', onTouchMove)
      scrollContainer.addEventListener('touchend', onTouchEnd)

      cleanups.push(() => scrollContainer.removeEventListener('touchstart', onTouchStart))
      cleanups.push(() => scrollContainer.removeEventListener('touchmove', onTouchMove))
      cleanups.push(() => scrollContainer.removeEventListener('touchend', onTouchEnd))
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])
}
