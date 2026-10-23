import { useCallback, useEffect, useRef, useState } from 'react'
import useAuthActions from '../../features/auth/hooks/useAuthActions.js'
import useConsultationForm from '../../features/home/hooks/useConsultationForm.js'
import useHomeFeaturedProperties from '../../features/home/hooks/useHomeFeaturedProperties.js'
import { apiEndpoints } from '../../shared/api/endpoints.js'
import useDominiumUiEffects from '../../shared/hooks/useDominiumUiEffects.js'
import { readBodyBoolDataset, readBodyStringDataset } from '../../shared/utils/bodyDataset.js'
import { getCurrentPathWithQuery } from '../../shared/utils/navigation.js'
import { getRouteFlags } from '../routing.js'

const GOOGLE_AUTH_URL = apiEndpoints.googleAuthFallback

export default function useAppController() {
  const currentPathname = window.location.pathname
  const currentPathWithQuery = getCurrentPathWithQuery()
  const {
    isHomeRoute,
    isSignupRoute,
    isSearchRoute,
    isLikesRoute,
    isPropertyDetailRoute,
    isMapTestRoute,
    isApiDemoRoute,
    isApiAdminRoute,
    isArticlesRoute,
    isArticleDetailRoute,
    isNotFoundRoute,
  } = getRouteFlags(currentPathname)

  const [userIsStaff, setUserIsStaff] = useState(() => readBodyBoolDataset('userIsStaff'))
  const [userIsAuthenticated, setUserIsAuthenticated] = useState(() => readBodyBoolDataset('userIsAuthenticated'))
  const [userDisplayName, setUserDisplayName] = useState(() => readBodyStringDataset('userDisplayName'))
  const [userEmail, setUserEmail] = useState(() => readBodyStringDataset('userEmail'))
  const [userPhone, setUserPhone] = useState(() => readBodyStringDataset('userPhone'))

  const applyAuthSession = useCallback((session = {}) => {
    setUserIsAuthenticated(Boolean(session.is_authenticated))
    setUserIsStaff(Boolean(session.is_staff))
    setUserDisplayName(session.display_name || '')
    setUserEmail(session.email || '')
    setUserPhone(session.phone || '')
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    fetch(apiEndpoints.authSession, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Auth session request failed: ${response.status}`)
        return response.json()
      })
      .then(applyAuthSession)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Could not load authentication session', error)
        }
      })

    return () => controller.abort()
  }, [applyAuthSession])

  const featuredProperties = useHomeFeaturedProperties({
    enabled: isHomeRoute,
  })

  const {
    handleContactSubmit,
    isSendingConsultation,
    consultationMessage,
    consultationError,
  } = useConsultationForm()

  const { handleLoginSubmit, handleLogout, isLoggingIn, loginError, setLoginError } =
    useAuthActions({ onSession: applyAuthSession })

  const handleGoogleAuthenticated = useCallback((session) => {
    applyAuthSession(session)
    setLoginError('')
    window.dominiumCloseModal?.('login')
    window.dominiumCloseModal?.('register')
  }, [applyAuthSession, setLoginError])

  const authQueryHandledRef = useRef(false)

  useDominiumUiEffects({
    isHomeRoute,
    isSignupRoute,
    isSearchRoute,
    isLikesRoute,
    isPropertyDetailRoute,
    isMapTestRoute,
    isApiDemoRoute,
    isApiAdminRoute,
    isArticlesRoute,
    isArticleDetailRoute,
    isNotFoundRoute,
    userIsStaff,
    userIsAuthenticated,
    userDisplayName,
    userEmail,
    userPhone,
    setLoginError,
    authQueryHandledRef,
    googleAuthUrl: GOOGLE_AUTH_URL,
  })

  return {
    currentPathWithQuery,
    isHomeRoute,
    isSignupRoute,
    isSearchRoute,
    isLikesRoute,
    isPropertyDetailRoute,
    isMapTestRoute,
    isApiDemoRoute,
    isApiAdminRoute,
    isArticlesRoute,
    isArticleDetailRoute,
    isNotFoundRoute,
    userIsStaff,
    userIsAuthenticated,
    userDisplayName,
    userEmail,
    userPhone,
    featuredProperties,
    handleContactSubmit,
    isSendingConsultation,
    consultationMessage,
    consultationError,
    handleLoginSubmit,
    handleLogout,
    isLoggingIn,
    loginError,
    setLoginError,
    handleGoogleAuthenticated,
    googleAuthUrl: GOOGLE_AUTH_URL,
  }
}
