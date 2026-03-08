import { apiEndpoints } from '../api/endpoints.js'
import useDominiumFeaturedSwiperEffect from './dominium-ui/useDominiumFeaturedSwiperEffect.js'
import useDominiumHeroVideoEffect from './dominium-ui/useDominiumHeroVideoEffect.js'
import useDominiumModalEffects from './dominium-ui/useDominiumModalEffects.js'
import useDominiumPageMetaEffect from './dominium-ui/useDominiumPageMetaEffect.js'
import useDominiumPreloaderEffect from './dominium-ui/useDominiumPreloaderEffect.js'
import useDominiumScrollEffects from './dominium-ui/useDominiumScrollEffects.js'

function useDominiumUiEffects({
  isHomeRoute = false,
  isSignupRoute = false,
  isSearchRoute = false,
  isLikesRoute = false,
  isPropertyDetailRoute = false,
  isMapTestRoute = false,
  isApiDemoRoute = false,
  isApiAdminRoute = false,
  isNotFoundRoute = false,
  userIsStaff = false,
  userIsAuthenticated = false,
  userDisplayName = '',
  userEmail = '',
  userPhone = '',
  setLoginError,
  authQueryHandledRef,
  googleAuthUrl = apiEndpoints.googleAuth,
}) {
  useDominiumPageMetaEffect({
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
  })

  useDominiumPreloaderEffect()
  useDominiumScrollEffects()
  useDominiumHeroVideoEffect()

  useDominiumModalEffects({
    setLoginError,
    authQueryHandledRef,
    googleAuthUrl,
  })

  useDominiumFeaturedSwiperEffect({
    isHomeRoute,
  })
}

export default useDominiumUiEffects
