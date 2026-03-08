import { useEffect } from 'react'

export default function useDominiumFeaturedSwiperEffect({ isHomeRoute = false } = {}) {
  useEffect(() => {
    if (!isHomeRoute) return undefined

    let swiperInstance
    let pollerId
    const cleanups = []

    const initFeaturedSwiper = () => {
      const slider = document.querySelector('.property-swiper')
      if (!slider || typeof window.Swiper === 'undefined') return false
      if (slider.dataset.swiperInited === '1') return true

      swiperInstance = new window.Swiper('.property-swiper', {
        navigation: {
          nextEl: '.custom-swiper-next',
          prevEl: '.custom-swiper-prev',
        },
        slidesPerView: 1,
        spaceBetween: 16,
        grabCursor: true,
        loop: true,
        breakpoints: {
          480: { slidesPerView: 1 },
        },
      })
      slider.dataset.swiperInited = '1'

      ;['.custom-swiper-prev', '.custom-swiper-next'].forEach((selector) => {
        const control = document.querySelector(selector)
        if (!control) return

        const onKeyDown = (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          control.click()
        }

        control.addEventListener('keydown', onKeyDown)
        cleanups.push(() => control.removeEventListener('keydown', onKeyDown))
      })

      return true
    }

    if (!initFeaturedSwiper()) {
      let attempts = 0
      pollerId = window.setInterval(() => {
        attempts += 1
        if (initFeaturedSwiper()) {
          window.clearInterval(pollerId)
        }
        if (attempts >= 50) {
          window.clearInterval(pollerId)
        }
      }, 150)
    }

    return () => {
      if (pollerId) {
        window.clearInterval(pollerId)
      }

      const slider = document.querySelector('.property-swiper')
      if (slider) {
        delete slider.dataset.swiperInited
      }

      if (swiperInstance && typeof swiperInstance.destroy === 'function') {
        swiperInstance.destroy(true, true)
      }

      cleanups.forEach((cleanup) => cleanup())
    }
  }, [isHomeRoute])
}
