import { useState } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import { getCurrentPathWithQuery, normalizeNextPath } from '../../../shared/utils/navigation.js'

function useAuthActions() {
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    if (isLoggingIn) return

    const form = event.currentTarget
    const formData = new FormData(form)
    const identifier = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')
    const nextPath = normalizeNextPath(
      String(formData.get('next') || ''),
      getCurrentPathWithQuery(),
    )

    if (!identifier || !password) {
      setLoginError('Вкажіть логін та пароль.')
      return
    }

    const payload = new URLSearchParams()
    payload.set('email', identifier)
    payload.set('password', password)
    payload.set('next', nextPath)

    setIsLoggingIn(true)
    setLoginError('')

    try {
      await apiClient.postForm(apiEndpoints.login, payload)

      if (typeof window.dominiumCloseModal === 'function') {
        window.dominiumCloseModal('login')
      }
      form.reset()
      window.location.assign(nextPath || '/')
    } catch (error) {
      const fallbackMessage = 'Не вдалося виконати вхід. Спробуйте ще раз.'
      const message =
        error?.code && error.code !== 'network_error'
          ? error?.message || fallbackMessage
          : fallbackMessage
      setLoginError(message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async (event) => {
    event.preventDefault()

    try {
      const { response } = await apiClient.post(apiEndpoints.logout, {
        parseAs: 'raw',
        withJsonAccept: false,
      })

      if (response.redirected) {
        window.location.href = response.url
        return
      }

      window.location.reload()
    } catch {
      window.location.reload()
    }
  }

  return {
    handleLoginSubmit,
    handleLogout,
    isLoggingIn,
    loginError,
    setLoginError,
  }
}

export default useAuthActions
