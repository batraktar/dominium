import MainFooter from '../../features/layout/components/MainFooter.jsx'
import MainHeader from '../../features/layout/components/MainHeader.jsx'
import Preloader from '../../features/layout/components/Preloader.jsx'
import { getMainContentClassName } from '../routing.js'

function AppFrame({
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
  onLogout,
  googleAuthUrl,
  children,
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Перейти до основного контенту
      </a>
      <input type="hidden" id="csrf-token" value="" />

      <Preloader />

      <div className="fade-in dominium-shell">
        <div id="scroll-container" className="dominium-scroll-container">
          <MainHeader
            userIsStaff={userIsStaff}
            userIsAuthenticated={userIsAuthenticated}
            userDisplayName={userDisplayName}
            onLogout={onLogout}
            googleAuthUrl={googleAuthUrl}
            className={isSearchRoute ? 'hidden lg:block' : ''}
          />

          <main
            id="main-content"
            tabIndex="-1"
            className={`dominium-main dominium-main--with-mobile-nav ${getMainContentClassName({
              isSearchRoute,
              isHomeRoute,
              isSignupRoute,
              isLikesRoute,
              isPropertyDetailRoute,
              isMapTestRoute,
              isApiDemoRoute,
              isApiAdminRoute,
              isNotFoundRoute,
            })}`}
          >
            {children}
          </main>

          <MainFooter />

          <div
            id="toast"
            className="dominium-floating-toast hidden fixed left-1/2 -translate-x-1/2 bg-green-500 text-white py-2 px-4 rounded-xl text-sm shadow-lg z-50"
          >
            Повідомлення
          </div>
          <a
            href="#"
            id="scrollToTop"
            className="dominium-scroll-top hidden fixed right-6 bg-accent text-white p-3 rounded-full shadow-lg hover:bg-opacity-90 z-50 transition-opacity duration-300"
            aria-label="Повернутися нагору"
          >
            <i className="ri-arrow-up-line"></i>
          </a>
        </div>
      </div>
    </>
  )
}

export default AppFrame
