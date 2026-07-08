export function getRouteFlags(pathname = '') {
  const currentPathname = String(pathname || '')
  const isSignupRoute = currentPathname === '/signup' || currentPathname === '/signup/'
  const isMapTestRoute =
    currentPathname === '/test/map/interactive' || currentPathname === '/test/map/interactive/'
  const isApiDemoRoute = currentPathname === '/api/demo' || currentPathname === '/api/demo/'
  const isApiAdminRoute = currentPathname === '/api/admin' || currentPathname === '/api/admin/'
  const isSearchRoute = currentPathname.startsWith('/search')
  const isLikesRoute = currentPathname.startsWith('/likes')
  const isPropertyDetailRoute = currentPathname.startsWith('/property/')
  const isHomeRoute = currentPathname === '/' || currentPathname === ''
  const isKnownRoute =
    isHomeRoute ||
    isSignupRoute ||
    isSearchRoute ||
    isLikesRoute ||
    isPropertyDetailRoute ||
    isMapTestRoute ||
    isApiDemoRoute ||
    isApiAdminRoute

  return {
    isHomeRoute,
    isSignupRoute,
    isSearchRoute,
    isLikesRoute,
    isPropertyDetailRoute,
    isMapTestRoute,
    isApiDemoRoute,
    isApiAdminRoute,
    isNotFoundRoute: !isKnownRoute,
  }
}

export function getMainContentClassName({
  isHomeRoute = false,
  isSearchRoute = false,
  isLikesRoute = false,
  isPropertyDetailRoute = false,
  isSignupRoute = false,
  isMapTestRoute = false,
  isApiDemoRoute = false,
  isApiAdminRoute = false,
  isNotFoundRoute = false,
} = {}) {
  if (isHomeRoute) return 'dominium-main--home'
  if (isSearchRoute) return 'dominium-main--search'
  if (isSignupRoute) return 'dominium-main--with-header'
  if (isLikesRoute) return 'dominium-main--with-header'
  if (isPropertyDetailRoute) return 'dominium-main--with-header'
  if (isMapTestRoute) return 'dominium-main--with-header'
  if (isApiDemoRoute) return 'dominium-main--with-header'
  if (isApiAdminRoute) return 'dominium-main--with-header'
  if (isNotFoundRoute) return 'dominium-main--with-header'
  return 'dominium-main--with-header'
}
