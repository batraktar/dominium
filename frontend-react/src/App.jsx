import AppFrame from './app/components/AppFrame.jsx'
import AppMainContent from './app/components/AppMainContent.jsx'
import useAppController from './app/hooks/useAppController.js'
import MobileNav from './features/layout/components/MobileNav.jsx'
import RegisterModal from './features/auth/components/RegisterModal.jsx'
import LoginModal from './features/auth/components/LoginModal.jsx'

function App() {
  const {
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
    googleAuthUrl,
  } = useAppController()

  return (
    <>
      <AppFrame
        isHomeRoute={isHomeRoute}
        isSignupRoute={isSignupRoute}
        isSearchRoute={isSearchRoute}
        isLikesRoute={isLikesRoute}
        isPropertyDetailRoute={isPropertyDetailRoute}
        isMapTestRoute={isMapTestRoute}
        isApiDemoRoute={isApiDemoRoute}
        isApiAdminRoute={isApiAdminRoute}
        isNotFoundRoute={isNotFoundRoute}
        userIsStaff={userIsStaff}
        userIsAuthenticated={userIsAuthenticated}
        userDisplayName={userDisplayName}
        onLogout={handleLogout}
        googleAuthUrl={googleAuthUrl}
      >
        <AppMainContent
          isHomeRoute={isHomeRoute}
          isSignupRoute={isSignupRoute}
          isSearchRoute={isSearchRoute}
          isLikesRoute={isLikesRoute}
          isPropertyDetailRoute={isPropertyDetailRoute}
          isMapTestRoute={isMapTestRoute}
          isApiDemoRoute={isApiDemoRoute}
          isApiAdminRoute={isApiAdminRoute}
          isArticlesRoute={isArticlesRoute}
          isArticleDetailRoute={isArticleDetailRoute}
          isNotFoundRoute={isNotFoundRoute}
          userIsStaff={userIsStaff}
          userIsAuthenticated={userIsAuthenticated}
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          userPhone={userPhone}
          featuredProperties={featuredProperties}
          onContactSubmit={handleContactSubmit}
          isSendingConsultation={isSendingConsultation}
          consultationMessage={consultationMessage}
          consultationError={consultationError}
        />
      </AppFrame>

      <RegisterModal
        googleAuthUrl={googleAuthUrl}
        onGoogleAuthenticated={handleGoogleAuthenticated}
        onGoogleError={setLoginError}
        loginError={loginError}
      />
      <LoginModal
        onSubmit={handleLoginSubmit}
        currentPathWithQuery={currentPathWithQuery}
        isLoggingIn={isLoggingIn}
        loginError={loginError}
        googleAuthUrl={googleAuthUrl}
        onGoogleAuthenticated={handleGoogleAuthenticated}
        onGoogleError={setLoginError}
      />
      <MobileNav
        userIsStaff={userIsStaff}
        userIsAuthenticated={userIsAuthenticated}
        onLogout={handleLogout}
        googleAuthUrl={googleAuthUrl}
      />
    </>
  )
}

export default App
