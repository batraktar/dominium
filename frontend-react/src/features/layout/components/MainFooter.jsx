import logoDominium from '../../../../../static/base/assets/img/Logo_dominium.png'

function MainFooter() {
  return (
    <footer className="bg-coolSage py-6 text-center">
      <div className="container mx-auto px-4 space-y-4">
        <div className="flex justify-center">
          <img
            src={logoDominium}
            alt="DOMINIUM"
            className="h-10"
            width="160"
            height="40"
            loading="lazy"
            decoding="async"
          />
        </div>

        <p className="text-white font-fixel">Ваш простір починається тут</p>

        <div className="flex justify-center space-x-6">
          <a
            href="https://www.facebook.com/61573653220530/"
            aria-label="Facebook DOMINIUM"
            className="text-deepOcean hover:text-accent transition"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="ri-facebook-fill ri-xl"></i>
          </a>
          <a
            href="https://www.instagram.com/dominium_realty_agency"
            aria-label="Instagram DOMINIUM"
            className="text-deepOcean hover:text-accent transition"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="ri-instagram-fill ri-xl"></i>
          </a>
          <a
            href="https://www.tiktok.com/@dominium_realty_agency"
            aria-label="TikTok DOMINIUM"
            className="text-deepOcean hover:text-accent transition"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="ri-tiktok-fill ri-xl"></i>
          </a>
        </div>

        <p className="text-sm font-fixel text-white/60">&copy; 2025 DOMINIUM. Усі права захищено.</p>
      </div>
    </footer>
  )
}

export default MainFooter
