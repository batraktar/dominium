import SearchResultCardActionsOverlay from './result-card/SearchResultCardActionsOverlay.jsx'

function SearchResultCard({
  property,
  absoluteUrl,
  mainImageUrl,
  isLiked = false,
  userIsStaff = false,
  isShareMenuOpen = false,
  formattedPrice,
  showRentSuffix = false,
  dealName = 'Угода',
  dealTagClassName = 'bg-red-200 text-white',
  displayAddress = '',
  onToggleLike,
  onToggleFeatured,
  onToggleShareMenu,
  onShare,
}) {
  const propertyTypeName = property.property_type?.name || 'Тип не вказано'
  const propertyTypeSlug = String(property.property_type?.slug || '').toLowerCase()
  const isLandProperty =
    propertyTypeSlug.includes('land') ||
    propertyTypeSlug.includes('zeml') ||
    /земл|ділян/i.test(propertyTypeName)
  const otherCurrencies = Array.isArray(property.other_currency_values)
    ? property.other_currency_values
    : []

  return (
    <div className="w-full max-w-[480px] mx-auto h-full">
      <div className="bg-white rounded-[8px] shadow-lg overflow-hidden flex flex-col h-full">
        <div className="relative h-56">
          <a href={absoluteUrl}>
            <img
              src={mainImageUrl}
              loading="lazy"
              decoding="async"
              width="1200"
              height="900"
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
              className="w-full h-56 object-cover"
              alt={property.title || 'Обʼєкт нерухомості'}
            />
          </a>

          <SearchResultCardActionsOverlay
            property={property}
            isLiked={isLiked}
            userIsStaff={userIsStaff}
            isShareMenuOpen={isShareMenuOpen}
            onToggleLike={onToggleLike}
            onToggleFeatured={onToggleFeatured}
            onToggleShareMenu={onToggleShareMenu}
            onShare={onShare}
          />
        </div>

        <div className="p-6 flex flex-col flex-grow group relative">
          <div className="price-converter relative self-start">
            <h3
              className="text-xl font-ermilov text-primary transition duration-200 outline-none"
              tabIndex={otherCurrencies.length && !showRentSuffix ? 0 : undefined}
              aria-label={
                otherCurrencies.length && !showRentSuffix
                  ? `${formattedPrice}. Альтернативні валюти доступні при наведенні або фокусі.`
                  : undefined
              }
            >
              {formattedPrice}
              {showRentSuffix ? ' /міс' : ''}
            </h3>

            {!showRentSuffix && otherCurrencies.length ? (
              <div className="currency-tooltip opacity-0 invisible absolute bottom-full left-0 mb-2 bg-white shadow-xl rounded-[8px] px-4 py-2 transition-all duration-200 z-20 text-sm text-coolSage font-fixel">
                <div className="flex flex-col text-left">
                  {otherCurrencies.map((item) => (
                    <span key={`${property.id}-${item.code}`} className="whitespace-nowrap">
                      {item.symbol} {Number(item.value).toLocaleString('uk-UA')} {item.code}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <p className="text-coolSage font-fixel">{displayAddress || 'Адресу уточнюйте'}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-gray-600 min-w-0">
            <span className="flex text-coolSage font-fixel items-center min-w-0">
              <i className="ri-ruler-line mr-1 shrink-0"></i>
              <span className="break-words">{propertyTypeName}</span>
            </span>
            <span className="flex text-coolSage font-fixel items-center whitespace-nowrap">
              <i className="ri-ruler-line mr-1"></i> {property.area ?? '—'} м²
            </span>
            {!isLandProperty && property.rooms ? (
              <span className="flex text-coolSage font-fixel items-center whitespace-nowrap">
                <i className="ri-home-line mr-1"></i> {property.rooms} кімнати
              </span>
            ) : null}
          </div>

          <div className="mt-auto pt-4 flex flex-wrap items-center gap-3">
            <a
              href={absoluteUrl}
              className="bg-white text-deepOcean font-fixel text-sm px-4 py-2 rounded-full h-10 shadow-[inset_0_0_0_1px] shadow-deepOcean flex items-center justify-center"
            >
              Докладніше
            </a>

            <span className={`px-6 py-2 rounded-full text-sm h-10 font-fixel inline-flex items-center justify-center ${dealTagClassName}`}>
              {dealName}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchResultCard
