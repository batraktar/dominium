import logoBlack from '../../../../../static/base/assets/img/Logoblack.png'

function MainHeader({
  userIsStaff = false,
  userIsAuthenticated = false,
  userDisplayName = '',
  onLogout,
  googleAuthUrl,
}) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="relative h-5 md:h-10 overflow-visible flex items-center justify-center md:justify-start w-full md:w-auto">
            <a href="/" aria-label="DOMINIUM - головна сторінка">
              <img
                src={logoBlack}
                alt="DOMINIUM Logo"
                className="h-[50px] md:h-[60px]"
                width="180"
                height="60"
                decoding="async"
              />
            </a>
          </div>

          <nav className="hidden md:flex items-center space-x-8" aria-label="Основна навігація">
            <a href="/" className="text-deepOcean font-fixel font-normal hover:text-coolSage">
              Головна
            </a>
            <a href="/search/" className="text-deepOcean font-fixel font-normal hover:text-coolSage">
              Пошук
            </a>
            <a href="/likes/" className="text-deepOcean font-fixel font-normal hover:text-coolSage">
              Обране
            </a>
            {userIsStaff ? (
              <a
                href="/api/admin/"
                className="text-deepOcean font-fixel font-normal hover:text-coolSage flex items-center gap-1"
              >
                <i className="ri-dashboard-line text-base"></i>
                API адмінка
              </a>
            ) : null}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <a
              href="https://www.facebook.com/61573653220530/"
              aria-label="Facebook DOMINIUM"
              className="w-10 h-10 flex items-center justify-center text-deepOcean hover:text-coolSage"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-facebook-fill ri-lg"></i>
            </a>
            <a
              href="https://www.instagram.com/dominium_realty_agency"
              aria-label="Instagram DOMINIUM"
              className="w-10 h-10 flex items-center justify-center text-deepOcean hover:text-coolSage"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-instagram-fill ri-lg"></i>
            </a>
            <a
              href="https://www.tiktok.com/@dominium_realty_agency"
              aria-label="TikTok DOMINIUM"
              className="w-10 h-10 flex items-center justify-center text-deepOcean hover:text-coolSage"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-tiktok-fill ri-lg"></i>
            </a>
            {userIsAuthenticated ? (
              <div className="flex items-center space-x-2 ml-4">
                <span className="text-sm text-deepOcean">
                  Привіт, {userDisplayName || 'користувач'}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-sm text-red-600 hover:underline"
                >
                  Вийти
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  data-google-auth
                  data-auth-url={googleAuthUrl}
                  className="ml-2 text-sm text-primary border border-primary px-4 py-1.5 rounded-button hover:bg-primary hover:text-white transition"
                >
                  Зареєструватися
                </button>
                <button
                  type="button"
                  className="ml-2 text-sm text-white bg-primary hover:bg-primary/90 px-4 py-1.5 rounded-button transition"
                  data-open-modal="login"
                >
                  Увійти
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default MainHeader
