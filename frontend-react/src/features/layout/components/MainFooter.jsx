import logoDominium from '../../../../../static/base/assets/img/Logo_dominium.png'
import { shouldShowArticlesFooterLink } from '../model/footerModel.js'

function MainFooter({ userIsStaff = false }) {
  return (
    <footer className="dominium-site-footer">
      <div className="dominium-site-footer__inner container">
        <div className="dominium-site-footer__brand">
          <img
            src={logoDominium}
            alt="DOMINIUM"
            width="160"
            height="40"
            loading="lazy"
            decoding="async"
          />
        </div>

        <p className="dominium-site-footer__tagline">Ваш простір починається тут</p>

        {shouldShowArticlesFooterLink(userIsStaff) ? <a href="/articles/" className="dominium-site-footer__articles">Статті</a> : null}

        <div className="dominium-site-footer__socials">
          <a
            href="https://www.facebook.com/61573653220530/"
            aria-label="Facebook DOMINIUM"
          >
            <i className="ri-facebook-fill ri-xl"></i>
          </a>
          <a
            href="https://www.instagram.com/dominium_realty_agency"
            aria-label="Instagram DOMINIUM"
          >
            <i className="ri-instagram-fill ri-xl"></i>
          </a>
          <a
            href="https://www.tiktok.com/@dominium_realty_agency"
            aria-label="TikTok DOMINIUM"
          >
            <i className="ri-tiktok-fill ri-xl"></i>
          </a>
        </div>

        <p className="dominium-site-footer__copyright">&copy; {new Date().getFullYear()} DOMINIUM. Усі права захищено.</p>
        <p className="dominium-site-footer__privacy">
          Сайт зберігає технічні дані відвідування для безпеки та покращення сервісу; IP анонімізується через 30 днів.
        </p>
      </div>
    </footer>
  )
}

export default MainFooter
