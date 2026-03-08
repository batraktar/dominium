import googleLogo from '../../../../../static/base/assets/img/google-logo.svg'

function LoginModal({
  onSubmit,
  currentPathWithQuery,
  isLoggingIn = false,
  loginError = '',
  googleAuthUrl,
}) {
  const headerGradientStyle = {
    backgroundImage: 'linear-gradient(to right, rgba(19, 62, 68, 0.9), #133E44)',
  }
  const submitGradientStyle = {
    backgroundImage: 'linear-gradient(to right, #133E44, #758F8E, #E7E0CE)',
  }

  return (
    <div
      id="login-modal"
      data-modal="login"
      className="fixed inset-0 z-50 hidden items-center justify-center px-4 py-6 backdrop-blur-sm transition"
    >
      <div data-modal-overlay className="absolute inset-0 bg-black/60"></div>
      <div
        data-modal-panel
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transform transition duration-300 scale-95 opacity-0"
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary/90 to-primary text-white"
          style={headerGradientStyle}
        >
          <h2 className="text-lg font-semibold">Вхід до DOMINIUM</h2>
          <button type="button" data-close-modal className="text-white hover:text-creamBeige transition">
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">
          <form id="login-form" method="post" action="/login/" className="space-y-4" onSubmit={onSubmit}>
            <input type="hidden" name="next" defaultValue={currentPathWithQuery} />
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                Email, username або Telegram
              </label>
              <input
                type="text"
                name="email"
                id="login-email"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="name@example.com / username / @telegram"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                Пароль
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  id="login-password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-primary transition"
                  data-toggle-password="login-password"
                >
                  <i className="ri-eye-line text-xl"></i>
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-full bg-gradient-to-r from-primary via-coolSage to-creamBeige text-white font-semibold hover:from-primary/90 hover:via-coolSage/90 hover:to-creamBeige/90 transition shadow-lg shadow-primary/20"
              style={submitGradientStyle}
            >
              {isLoggingIn ? 'Вхід...' : 'Увійти'}
            </button>
            {loginError ? <p className="text-sm text-red-500 text-center font-fixel">{loginError}</p> : null}
          </form>

          <div className="border-t border-gray-100 pt-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-gray-400 text-center">Або увійдіть через</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  data-google-auth
                  data-auth-url={googleAuthUrl}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full border border-gray-300 bg-white hover:border-primary hover:shadow transition"
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-white">
                    <img src={googleLogo} alt="Google" className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-medium text-gray-700">Увійти через Google</span>
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Немає акаунта?
              <button
                type="button"
                className="text-primary hover:underline font-medium ml-1"
                data-switch-modal="register"
              >
                Зареєструватися
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
