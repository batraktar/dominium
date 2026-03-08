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
  onToggleLike,
  onToggleFeatured,
  onToggleShareMenu,
  onShare,
}) {
  return (
    <div className="w-full max-w-[480px] mx-auto">
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
          <h3 className="text-xl font-ermilov text-primary transition duration-200">
            {formattedPrice}
            {showRentSuffix ? ' /міс' : ''}
          </h3>

          <p className="text-coolSage font-fixel">{property.address || 'Адресу уточнюйте'}</p>

          <div className="flex items-center space-x-4 mt-3 text-gray-600">
            <span className="flex text-coolSage font-fixel items-center">
              <i className="ri-ruler-line mr-1"></i> {property.property_type?.name || 'Тип не вказано'}
            </span>
            <span className="flex text-coolSage font-fixel items-center">
              <i className="ri-ruler-line mr-1"></i> {property.area || '—'} м²
            </span>
            {property.rooms ? (
              <span className="flex text-coolSage font-fixel items-center">
                <i className="ri-home-line mr-1"></i> {property.rooms} кімнати
              </span>
            ) : null}
          </div>

          <div className="mt-auto pt-4 flex items-center gap-x-3">
            <a
              href={absoluteUrl}
              className="bg-white text-deepOcean font-fixel text-sm px-4 py-2 rounded-full h-10 shadow-[inset_0_0_0_1px] shadow-deepOcean flex items-center justify-center"
            >
              Докладніше
            </a>

            <span className={`px-8 py-2 rounded-full text-sm h-10 font-fixel ${dealTagClassName}`}>
              {dealName}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchResultCard
