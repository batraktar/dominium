import logoBlack from '../../../../../static/base/assets/img/Logoblack.png'
import { getPrimaryNavKey } from '../model/siteShellModel.js'

function MainHeader({
  userIsStaff = false,
  userIsAuthenticated = false,
  userDisplayName = '',
  onLogout,
  googleAuthUrl,
}) {
  const activeKey = getPrimaryNavKey(typeof window !== 'undefined' ? window.location.pathname : '/')
  const navClass = (key) => `dominium-site-header__link${activeKey === key ? ' is-active' : ''}`

  return (
    <header className="dominium-site-header">
      <div className="dominium-site-header__inner container">
        <div className="dominium-site-header__row">
          <div className="dominium-site-header__brand">
            <a href="/" aria-label="DOMINIUM — головна сторінка" aria-current={activeKey === 'home' ? 'page' : undefined}>
              <img
                src={logoBlack}
                alt="DOMINIUM Logo"
                width="220"
                height="56"
                decoding="async"
              />
            </a>
          </div>

          <nav className="dominium-site-header__nav" aria-label="Основна навігація">
            <a href="/" className={navClass('home')} aria-current={activeKey === 'home' ? 'page' : undefined}>
              Головна
            </a>
            <a href="/search/" className={navClass('search')} aria-current={activeKey === 'search' ? 'page' : undefined}>
              Пошук
            </a>
            <a href="/likes/" className={navClass('likes')} aria-current={activeKey === 'likes' ? 'page' : undefined}>
              Обране
            </a>
            {userIsStaff ? (
              <a
                href="/api/admin/"
                className={`${navClass('admin')} dominium-site-header__admin-link`}
                aria-current={activeKey === 'admin' ? 'page' : undefined}
              >
                <i className="ri-dashboard-line" aria-hidden="true"></i>
                API адмінка
              </a>
            ) : null}
          </nav>

          <div className="dominium-site-header__actions">
            <div className="dominium-site-header__socials">
              <a
                href="https://www.facebook.com/61573653220530/"
                aria-label="Facebook DOMINIUM"
              >
                <i className="ri-facebook-fill ri-lg"></i>
              </a>
              <a
                href="https://www.instagram.com/dominium_realty_agency"
                aria-label="Instagram DOMINIUM"
              >
                <i className="ri-instagram-fill ri-lg"></i>
              </a>
              <a
                href="https://www.tiktok.com/@dominium_realty_agency"
                aria-label="TikTok DOMINIUM"
              >
                <i className="ri-tiktok-fill ri-lg"></i>
              </a>
            </div>

            {userIsAuthenticated ? (
              <div className="dominium-site-header__account">
                <span>
                  Привіт, {userDisplayName || 'користувач'}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="dominium-site-header__logout"
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
                  className="dominium-site-header__auth-button dominium-site-header__auth-button--secondary"
                >
                  Зареєструватися
                </button>
                <button
                  type="button"
                  className="dominium-site-header__auth-button dominium-site-header__auth-button--primary"
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
