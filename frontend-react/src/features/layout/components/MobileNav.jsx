function MobileNav({
  userIsStaff = false,
  userIsAuthenticated = false,
  onLogout,
  googleAuthUrl,
}) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
  const isHomeRoute = pathname === '/'
  const isSearchRoute = pathname.startsWith('/search')
  const isLikesRoute = pathname.startsWith('/likes')
  const isApiAdminRoute = pathname.startsWith('/api/admin')

  const itemClassName = (isActive) =>
    [
      'flex flex-col items-center justify-center gap-1 text-[11px] font-fixel transition-colors duration-200',
      isActive ? 'text-coolSage' : 'text-deepOcean hover:text-coolSage',
    ].join(' ')

  return (
    <nav
      className="dominium-mobile-nav fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/70 bg-white/95 shadow-[0_-12px_30px_rgba(19,62,68,0.12)] backdrop-blur-md md:hidden"
      aria-label="Нижня навігація"
    >
      <div className="grid min-h-[76px] grid-flow-col auto-cols-fr px-2 py-2">
        <a
          href="/"
          className={itemClassName(isHomeRoute)}
          aria-current={isHomeRoute ? 'page' : undefined}
        >
          <i className="ri-home-5-line ri-lg"></i>
          <span className="text-xs mt-1">Головна</span>
        </a>
        <a
          href="/search/"
          className={itemClassName(isSearchRoute)}
          aria-current={isSearchRoute ? 'page' : undefined}
        >
          <i className="ri-search-line ri-lg"></i>
          <span className="text-xs mt-1">Пошук</span>
        </a>
        <a
          href="/likes/"
          className={itemClassName(isLikesRoute)}
          aria-current={isLikesRoute ? 'page' : undefined}
        >
          <i className="ri-heart-line ri-lg"></i>
          <span className="text-xs mt-1">Обране</span>
        </a>
        {userIsStaff ? (
          <a
            href="/api/admin/"
            className={itemClassName(isApiAdminRoute)}
            aria-current={isApiAdminRoute ? 'page' : undefined}
          >
            <i className="ri-dashboard-line ri-lg"></i>
            <span className="text-xs mt-1">API</span>
          </a>
        ) : null}
        {userIsAuthenticated ? (
          <button
            type="button"
            onClick={onLogout}
            className={itemClassName(false)}
          >
            <i className="ri-logout-box-r-line ri-lg"></i>
            <span className="text-xs mt-1">Вийти</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              data-google-auth
              data-auth-url={googleAuthUrl}
              className={itemClassName(false)}
            >
              <i className="ri-user-add-line ri-lg"></i>
              <span className="text-xs mt-1">Кабінет</span>
            </button>
            <button
              type="button"
              className={itemClassName(false)}
              data-open-modal="login"
            >
              <i className="ri-login-circle-line ri-lg"></i>
              <span className="text-xs mt-1">Вхід</span>
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

export default MobileNav
