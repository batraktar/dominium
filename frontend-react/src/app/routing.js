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
  isLikesRoute = false,
  isPropertyDetailRoute = false,
  isSignupRoute = false,
  isMapTestRoute = false,
  isApiDemoRoute = false,
  isApiAdminRoute = false,
} = {}) {
  if (isLikesRoute) return 'pt-[80px] pb-0'
  if (isPropertyDetailRoute) return 'pt-[60px] pb-0'
  if (isSignupRoute) return 'pt-0 pb-0'
  if (isMapTestRoute) return 'pt-[84px] pb-0'
  if (isApiDemoRoute) return 'pt-[80px] pb-0'
  if (isApiAdminRoute) return 'pt-[80px] pb-0'
  return 'pt-0 pb-0'
}
