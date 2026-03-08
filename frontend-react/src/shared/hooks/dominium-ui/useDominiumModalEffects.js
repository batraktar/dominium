import { useEffect } from 'react'
import { apiEndpoints } from '../../api/endpoints.js'
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
    let googleAuthPopup = null
    let googleAuthMonitor = null
    let googleAuthReloaded = false
    let googleAuthState = ''

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

    const createPopupState = () => {
      try {
        const bytes = new Uint8Array(16)
        window.crypto.getRandomValues(bytes)
        return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
      } catch {
        return `${Date.now()}_${Math.random().toString(16).slice(2)}`
      }
    }

    const buildGoogleAuthUrl = (rawAuthUrl, popupState = '') => {
      const fallbackPath = normalizeNextPath(getCurrentPathWithQuery(), '/')
      let popupCompletePath = `/auth/popup-complete/?next=${encodeURIComponent(fallbackPath)}&parent_origin=${encodeURIComponent(window.location.origin)}`
      if (popupState) {
        popupCompletePath += `&popup_state=${encodeURIComponent(popupState)}`
      }
      const source = String(rawAuthUrl || googleAuthUrl || '').trim()
      if (!source) return ''

      try {
        const url = new URL(source, window.location.origin)
        url.searchParams.set('next', popupCompletePath)
        return url.toString()
      } catch {
        return source
      }
    }

    const clearGoogleMonitor = () => {
      if (googleAuthMonitor) {
        window.clearInterval(googleAuthMonitor)
        googleAuthMonitor = null
      }
    }

    const closeGooglePopup = () => {
      if (googleAuthPopup && !googleAuthPopup.closed) {
        googleAuthPopup.close()
      }
      googleAuthPopup = null
      googleAuthState = ''
    }

    const openGooglePopup = (authUrl) => {
      const popupState = createPopupState()
      googleAuthState = popupState
      const resolvedAuthUrl = buildGoogleAuthUrl(authUrl, popupState)
      if (!resolvedAuthUrl) {
        googleAuthState = ''
        return
      }

      const width = 520
      const height = 640
      const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2)
      const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2)
      const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`

      const popup = window.open(resolvedAuthUrl, 'dominium-google-auth', features)
      googleAuthPopup = popup
      googleAuthReloaded = false
      clearGoogleMonitor()

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = resolvedAuthUrl
        return
      }

      popup.focus()
      googleAuthMonitor = window.setInterval(() => {
        if (!popup.closed) return
        clearGoogleMonitor()
        if (!googleAuthReloaded) {
          window.location.reload()
        }
      }, 400)
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

    const onAuthPopupMessage = (event) => {
      if (!googleAuthPopup || event.source !== googleAuthPopup) return
      const payload = event.data
      if (
        payload &&
        typeof payload === 'object' &&
        payload.state &&
        googleAuthState &&
        payload.state !== googleAuthState
      ) {
        return
      }
      const isSuccess =
        payload === 'dominium-auth-success' ||
        (payload && typeof payload === 'object' && payload.type === 'dominium-auth-success')
      const isFailure = payload && typeof payload === 'object' && payload.type === 'dominium-auth-failed'

      if (isFailure) {
        googleAuthReloaded = true
        const nextFromPayload = payload && typeof payload === 'object' ? payload.next : ''
        const nextPath = normalizeNextPath(nextFromPayload, getCurrentPathWithQuery())
        closeGooglePopup()
        setLoginError('Не вдалося завершити вхід через Google. Спробуйте ще раз.')
        openModal('login', { next: nextPath })
        return
      }
      if (!isSuccess) return

      const nextFromPayload = payload && typeof payload === 'object' ? payload.next : ''
      const nextPath = normalizeNextPath(nextFromPayload, getCurrentPathWithQuery())
      googleAuthReloaded = true
      closeModal('login')
      closeModal('register')
      closeGooglePopup()
      if (nextPath && nextPath !== getCurrentPathWithQuery()) {
        window.location.assign(nextPath)
      } else {
        window.location.reload()
      }
    }
    window.addEventListener('message', onAuthPopupMessage)
    cleanups.push(() => window.removeEventListener('message', onAuthPopupMessage))

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
      const onGoogleClick = (event) => {
        event.preventDefault()
        const authUrl = btn.dataset.authUrl || googleAuthUrl
        openGooglePopup(authUrl)
      }
      btn.addEventListener('click', onGoogleClick)
      cleanups.push(() => btn.removeEventListener('click', onGoogleClick))
    })

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id))
      clearGoogleMonitor()
      cleanups.forEach((cleanup) => cleanup())
      closeGooglePopup()
      delete window.dominiumCloseModal
      delete window.dominiumOpenModal
    }
  }, [authQueryHandledRef, googleAuthUrl, setLoginError])
}
