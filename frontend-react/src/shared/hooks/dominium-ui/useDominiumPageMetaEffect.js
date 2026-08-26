import { useEffect } from 'react'

function resolvePageTitle({
  isHomeRoute = false,
  isSignupRoute = false,
  isSearchRoute = false,
  isLikesRoute = false,
  isPropertyDetailRoute = false,
  isMapTestRoute = false,
  isApiDemoRoute = false,
  isApiAdminRoute = false,
  isNotFoundRoute = false,
} = {}) {
  if (isMapTestRoute) return 'Інтерактивна карта обʼєктів (тест) - DOMINIUM'
  if (isApiDemoRoute) return 'API Demo - DOMINIUM'
  if (isApiAdminRoute) return 'API Admin - DOMINIUM'
  if (isSignupRoute) return 'Реєстрація - DOMINIUM'
  if (isNotFoundRoute) return 'Сторінку не знайдено - DOMINIUM'
  if (isSearchRoute) return 'Пошук нерухомості - DOMINIUM'
  if (isLikesRoute) return 'Обране - DOMINIUM'
  if (isPropertyDetailRoute) return 'Обʼєкт нерухомості - DOMINIUM'
  if (isHomeRoute) return 'Головна - DOMINIUM'
  return 'Головна - DOMINIUM'
}

export default function useDominiumPageMetaEffect({
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
}) {
  useEffect(() => {
    document.title = resolvePageTitle({
      isHomeRoute,
      isSignupRoute,
      isSearchRoute,
      isLikesRoute,
      isPropertyDetailRoute,
      isMapTestRoute,
      isApiDemoRoute,
      isApiAdminRoute,
      isNotFoundRoute,
    })

    document.body.classList.add('bg-primary')
    document.body.dataset.registerOpen = 'false'
    document.body.dataset.loginOpen = 'false'
    document.body.dataset.userIsStaff = userIsStaff ? '1' : '0'
    document.body.dataset.userIsAuthenticated = userIsAuthenticated ? '1' : '0'
    document.body.dataset.userDisplayName = userDisplayName
    document.body.dataset.userEmail = userEmail
    document.body.dataset.userPhone = userPhone

    return () => {
      document.body.classList.remove('bg-primary')
      delete document.body.dataset.registerOpen
      delete document.body.dataset.loginOpen
      delete document.body.dataset.userIsStaff
      delete document.body.dataset.userIsAuthenticated
      delete document.body.dataset.userDisplayName
      delete document.body.dataset.userEmail
      delete document.body.dataset.userPhone
    }
  }, [
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
  ])
}
