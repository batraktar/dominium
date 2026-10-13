import { useEffect } from 'react'
import { apiEndpoints } from '../../api/endpoints.js'
import { submitGoogleAuthInCurrentTab } from '../../../features/auth/utils/googleAuth.js'
import { ensureCsrfToken } from '../../utils/csrf.js'
import { getCurrentPathWithQuery, normalizeNextPath } from '../../utils/navigation.js'

export default function useDominiumModalEffects({
  setLoginError = () => {},
  authQueryHandledRef,
  googleAuthUrl = apiEndpoints.googleAuth,
}) {
  useEffect(() => {
    const modalMap = {}
    const cleanups = []
    const timeouts = []

    const setLoginNextValue = (rawNext) => {
      const fallbackPath = getCurrentPathWithQuery()
      const loginForm = document.getElementById('login-form')
      const nextInput = loginForm?.querySelector("input[name='next']")
      if (!nextInput) return
      nextInput.value = normalizeNextPath(rawNext, fallbackPath)
    }

    const closeModal = (key) => {
      const modal = modalMap[key]
      if (!modal) return
      if (modal.container.classList.contains('hidden')) return

      modal.panel.classList.remove('opacity-100', 'scale-100')
      modal.panel.classList.add('opacity-0', 'scale-95')

      const timeoutId = window.setTimeout(() => {
        modal.container.classList.remove('flex')
        modal.container.classList.add('hidden')
      }, 200)
      timeouts.push(timeoutId)
    }

    const openModal = (key, options = {}) => {
      const modal = modalMap[key]
      if (!modal) return

      if (key === 'login') {
        setLoginError('')
        setLoginNextValue(options.next)
      }

      Object.keys(modalMap).forEach((other) => {
        if (other !== key) {
          closeModal(other)
        }
      })

      modal.container.classList.remove('hidden')
      modal.container.classList.add('flex')
      requestAnimationFrame(() => {
        modal.panel.classList.remove('opacity-0', 'scale-95')
        modal.panel.classList.add('opacity-100', 'scale-100')
      })
    }

    window.dominiumCloseModal = closeModal
    window.dominiumOpenModal = (key, options = {}) => openModal(key, options)

    document.querySelectorAll('[data-modal]').forEach((container) => {
      const key = container.dataset.modal
      const panel = container.querySelector('[data-modal-panel]')
      const overlay = container.querySelector('[data-modal-overlay]')
      const closers = container.querySelectorAll('[data-close-modal]')
      if (!key || !panel) return

      modalMap[key] = { container, panel }

      if (overlay) {
        const onOverlayClick = () => closeModal(key)
        overlay.addEventListener('click', onOverlayClick)
        cleanups.push(() => overlay.removeEventListener('click', onOverlayClick))
      }

      closers.forEach((btn) => {
        const onCloseClick = () => closeModal(key)
        btn.addEventListener('click', onCloseClick)
        cleanups.push(() => btn.removeEventListener('click', onCloseClick))
      })
    })

    document.querySelectorAll('[data-open-modal]').forEach((btn) => {
      const onOpenClick = () => openModal(btn.dataset.openModal)
      btn.addEventListener('click', onOpenClick)
      cleanups.push(() => btn.removeEventListener('click', onOpenClick))
    })

    document.querySelectorAll('[data-switch-modal]').forEach((btn) => {
      const onSwitchClick = () => openModal(btn.dataset.switchModal)
      btn.addEventListener('click', onSwitchClick)
      cleanups.push(() => btn.removeEventListener('click', onSwitchClick))
    })

    const onAuthRequired = (event) => {
      const next = event?.detail?.next
      openModal('login', { next })
    }
    window.addEventListener('dominium:auth-required', onAuthRequired)
    cleanups.push(() => window.removeEventListener('dominium:auth-required', onAuthRequired))

    if (!authQueryHandledRef.current) {
      const searchParams = new URLSearchParams(window.location.search)
      const shouldOpenLogin = searchParams.has('login')
      const shouldOpenRegister = searchParams.has('register')
      const nextFromQuery = searchParams.get('next') || getCurrentPathWithQuery()

      if (shouldOpenLogin) {
        openModal('login', { next: nextFromQuery })
      } else if (shouldOpenRegister) {
        openModal('register')
      }

      authQueryHandledRef.current = true
    }

    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      const onToggleClick = () => {
        const targetId = btn.dataset.togglePassword
        const input = document.getElementById(targetId)
        const icon = btn.querySelector('i')
        if (!input) return

        const isPassword = input.type === 'password'
        input.type = isPassword ? 'text' : 'password'
        if (icon) {
          icon.classList.toggle('ri-eye-line', !isPassword)
          icon.classList.toggle('ri-eye-off-line', isPassword)
        }
      }
      btn.addEventListener('click', onToggleClick)
      cleanups.push(() => btn.removeEventListener('click', onToggleClick))
    })

    document.querySelectorAll('[data-google-auth]').forEach((btn) => {
      const onGoogleClick = async (event) => {
        event.preventDefault()
        const authUrl = btn.dataset.authUrl || googleAuthUrl
        try {
          const csrfToken = await ensureCsrfToken()
          submitGoogleAuthInCurrentTab({
            authUrl,
            nextPath: getCurrentPathWithQuery(),
            csrfToken,
            origin: window.location.origin,
            documentObject: document,
          })
        } catch {
          setLoginError('Не вдалося підготувати безпечний вхід через Google. Спробуйте ще раз.')
          openModal('login', { next: getCurrentPathWithQuery() })
        }
      }
      btn.addEventListener('click', onGoogleClick)
      cleanups.push(() => btn.removeEventListener('click', onGoogleClick))
    })

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id))
      cleanups.forEach((cleanup) => cleanup())
      delete window.dominiumCloseModal
      delete window.dominiumOpenModal
    }
  }, [authQueryHandledRef, googleAuthUrl, setLoginError])
}
