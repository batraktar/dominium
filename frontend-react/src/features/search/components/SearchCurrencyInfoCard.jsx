function SearchCurrencyInfoCard({ selectedCurrencyMeta, todayDate }) {
  return (
    <section id="property-info" className="w-full max-w-[480px] sm:max-w-full mx-auto px-4 py-6">
      <div className="container mx-auto">
        <div className="currency-info bg-creamBeige p-4 font-fixel rounded-[9px] shadow-sm flex items-start sm:items-center gap-2">
          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-primary">
            <i className="ri-information-line"></i>
          </div>

          <p className="text-sm text-deepOcean leading-snug hidden lg:block">
            Зараз ціни показані у {selectedCurrencyMeta.symbol} ({selectedCurrencyMeta.code}). Наведіть на
            ціну, щоб побачити альтернативні валюти. Курси на {todayDate}: 1 USD = — грн, 1 EUR = — грн.
          </p>

          <p className="text-sm text-deepOcean leading-snug hidden md:block lg:hidden">
            Натисніть на ціну, щоб переглянути інші валюти. Поточна валюта: {selectedCurrencyMeta.symbol}{' '}
            ({selectedCurrencyMeta.code}). Курси на {todayDate}: 1 USD = — грн, 1 EUR = — грн.
          </p>

          <p className="text-sm text-deepOcean leading-snug block md:hidden">
            Тапніть по ціні для перегляду інших валют. Курси на {todayDate}: 1 USD = — грн, 1 EUR = — грн.
          </p>
        </div>
      </div>
    </section>
  )
}

export default SearchCurrencyInfoCard
