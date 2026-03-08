function MobileNav({
  userIsStaff = false,
  userIsAuthenticated = false,
  onLogout,
  googleAuthUrl,
}) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white z-50">
      <div className="flex justify-around py-2">
        <a href="/" className="flex flex-col items-center text-deepOcean hover:text-coolSage">
          <i className="ri-home-5-line ri-lg text-deepOcean"></i>
          <span className="text-xs mt-1">Головна</span>
        </a>
        <a href="/search/" className="flex flex-col items-center text-deepOcean hover:text-coolSage">
          <i className="ri-search-line ri-lg text-deepOcean"></i>
          <span className="text-xs mt-1">Пошук</span>
        </a>
        <a href="/likes/" className="flex flex-col items-center text-deepOcean hover:text-coolSage">
          <i className="ri-heart-line ri-lg text-deepOcean"></i>
          <span className="text-xs mt-1">Обране</span>
        </a>
        {userIsStaff ? (
          <a href="/api/admin/" className="flex flex-col items-center text-deepOcean hover:text-coolSage">
            <i className="ri-dashboard-line ri-lg text-deepOcean"></i>
            <span className="text-xs mt-1">API</span>
          </a>
        ) : null}
        {userIsAuthenticated ? (
          <button
            type="button"
            onClick={onLogout}
            className="flex flex-col items-center text-deepOcean hover:text-coolSage"
          >
            <i className="ri-logout-box-r-line ri-lg text-deepOcean"></i>
            <span className="text-xs mt-1">Вийти</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              data-google-auth
              data-auth-url={googleAuthUrl}
              className="flex flex-col items-center text-deepOcean hover:text-coolSage"
            >
              <i className="ri-user-add-line ri-lg text-deepOcean"></i>
              <span className="text-xs mt-1">Реєстрація</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center text-deepOcean hover:text-coolSage"
              data-open-modal="login"
            >
              <i className="ri-login-circle-line ri-lg text-deepOcean"></i>
              <span className="text-xs mt-1">Вхід</span>
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

export default MobileNav
