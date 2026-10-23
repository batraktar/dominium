import GoogleIdentityButton from './GoogleIdentityButton.jsx'

function RegisterModal({ googleAuthUrl, onGoogleAuthenticated, onGoogleError }) {
  const headerGradientStyle = {
    backgroundImage: 'linear-gradient(to right, rgba(19, 62, 68, 0.9), #133E44)',
  }

  return (
    <div
      id="register-modal"
      data-modal="register"
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
          <h2 className="text-lg font-semibold">Реєстрація на DOMINIUM</h2>
          <button type="button" data-close-modal className="text-white hover:text-creamBeige transition">
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>
        <div className="px-6 py-6 space-y-5">
          <p className="text-sm text-gray-600">
            На цей момент реєстрація доступна лише через Google. Після авторизації ви зможете
            керувати збереженими об&apos;єктами та швидше залишати заявки.
          </p>
          <div className="flex flex-col gap-3">
            <GoogleIdentityButton
              fallbackUrl={googleAuthUrl}
              onAuthenticated={onGoogleAuthenticated}
              onError={onGoogleError}
            />
            <p className="text-center text-sm text-gray-600">
              Вже маєте акаунт?
              <button
                type="button"
                className="text-primary hover:underline font-medium ml-1"
                data-switch-modal="login"
              >
                Увійти
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterModal
