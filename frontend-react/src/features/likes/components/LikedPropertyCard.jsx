import {
  FALLBACK_IMAGE_URL,
  buildAbsoluteUrl,
  buildMediaUrl,
  formatDealTagClass,
  formatNumber,
  isRentalDeal,
} from '../utils/likesPageUtils.js'
import LikedPropertyCardActionsOverlay from './card/LikedPropertyCardActionsOverlay.jsx'

function LikedPropertyCard({
  property,
  isLiked = false,
  userIsStaff = false,
  isShareMenuOpen = false,
  onToggleLike,
  onToggleFeatured,
  onToggleShareMenu,
  onShare,
}) {
  const absoluteUrl = buildAbsoluteUrl(
    property.absolute_url || (property.slug ? `/property/${property.slug}/` : '/search/'),
  )
  const rawImageUrl = property.main_image?.url || property.images?.[0]?.url
  const mainImageUrl = rawImageUrl ? buildMediaUrl(rawImageUrl) : FALLBACK_IMAGE_URL
  const dealName = property.deal_type?.name || 'Угода'
  const rentalDeal = isRentalDeal(dealName)
  const formattedPrice = property.price == null ? 'Ціна за запитом' : `$ ${formatNumber(property.price)}`
  const otherCurrencies = Array.isArray(property.other_currency_values)
    ? property.other_currency_values
    : []

  return (
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

        <LikedPropertyCardActionsOverlay
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
          {rentalDeal && property.price != null ? ' /міс' : ''}
        </h3>

        {!rentalDeal && otherCurrencies.length ? (
          <div className="currency-tooltip opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute -top-11 left-7 bg-white shadow-xl rounded-[8px] px-4 py-2 transition-all duration-200 z-10 text-sm text-coolSage font-fixel">
            <div className="flex flex-col text-left">
              {otherCurrencies.map((item) => (
                <span key={`${property.id}-${item.code}`} className="whitespace-nowrap">
                  {item.symbol} {formatNumber(item.value)} {item.code}
                </span>
              ))}
            </div>
            <div className="absolute -bottom-2 left-5 w-4 h-4 bg-white transform rotate-45 shadow-md"></div>
          </div>
        ) : null}

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

          <span className={`px-8 py-2 rounded-full text-sm h-10 font-fixel ${formatDealTagClass(dealName)}`}>
            {dealName}
          </span>
        </div>
      </div>
    </div>
  )
}

export default LikedPropertyCard
