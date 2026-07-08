import PropertyApiDemoPage from '../../features/admin/pages/PropertyApiDemoPage.jsx'
import AdminApiAdminPage from '../../features/admin/pages/AdminApiAdminPage.jsx'
import SignupRedirectPage from '../../features/auth/pages/SignupRedirectPage.jsx'
import HomeLandingContent from '../../features/home/components/HomeLandingContent.jsx'
import LikesPage from '../../features/likes/pages/LikesPage.jsx'
import InteractiveMapPage from '../../features/map-test/pages/InteractiveMapPage.jsx'
import PropertyDetailPage from '../../features/property/pages/PropertyDetailPage.jsx'
import SearchPage from '../../features/search/pages/SearchPage.jsx'
import NotFoundPage from '../../features/system/pages/NotFoundPage.jsx'

function AppMainContent({
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
  featuredProperties = [],
  onContactSubmit,
  isSendingConsultation = false,
  consultationMessage = '',
  consultationError = false,
}) {
  if (isHomeRoute) {
    return (
      <HomeLandingContent
        featuredProperties={featuredProperties}
        onContactSubmit={onContactSubmit}
        isSendingConsultation={isSendingConsultation}
        consultationMessage={consultationMessage}
        consultationError={consultationError}
      />
    )
  }

  if (isSignupRoute) {
    return <SignupRedirectPage />
  }

  if (isSearchRoute) {
    return <SearchPage userIsStaff={userIsStaff} userIsAuthenticated={userIsAuthenticated} />
  }

  if (isLikesRoute) {
    return <LikesPage userIsStaff={userIsStaff} userIsAuthenticated={userIsAuthenticated} />
  }

  if (isMapTestRoute) {
    return <InteractiveMapPage />
  }

  if (isApiDemoRoute) {
    return <PropertyApiDemoPage />
  }

  if (isApiAdminRoute) {
    return <AdminApiAdminPage />
  }

  if (isNotFoundRoute) {
    return <NotFoundPage />
  }

  if (isPropertyDetailRoute) {
    return (
      <PropertyDetailPage
        userIsStaff={userIsStaff}
        userIsAuthenticated={userIsAuthenticated}
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        userPhone={userPhone}
      />
    )
  }

  return <NotFoundPage />
}

export default AppMainContent
