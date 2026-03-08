import { useRef, useState } from 'react'
import useAuthActions from '../../features/auth/hooks/useAuthActions.js'
import useConsultationForm from '../../features/home/hooks/useConsultationForm.js'
import useHomeFeaturedProperties from '../../features/home/hooks/useHomeFeaturedProperties.js'
import { apiEndpoints } from '../../shared/api/endpoints.js'
import useDominiumUiEffects from '../../shared/hooks/useDominiumUiEffects.js'
import { readBodyBoolDataset, readBodyStringDataset } from '../../shared/utils/bodyDataset.js'
import { getCurrentPathWithQuery } from '../../shared/utils/navigation.js'
import { getRouteFlags } from '../routing.js'

const GOOGLE_AUTH_URL = apiEndpoints.googleAuth

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
    isNotFoundRoute,
  } = getRouteFlags(currentPathname)

  const [userIsStaff] = useState(() => readBodyBoolDataset('userIsStaff'))
  const [userIsAuthenticated] = useState(() => readBodyBoolDataset('userIsAuthenticated'))
  const [userDisplayName] = useState(() => readBodyStringDataset('userDisplayName'))
  const [userEmail] = useState(() => readBodyStringDataset('userEmail'))
  const [userPhone] = useState(() => readBodyStringDataset('userPhone'))

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
    useAuthActions()

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
    googleAuthUrl: GOOGLE_AUTH_URL,
  }
}
