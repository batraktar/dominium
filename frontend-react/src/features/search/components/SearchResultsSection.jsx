import SearchResultCard from './SearchResultCard.jsx'
import {
  buildAbsoluteUrl,
  buildMediaUrl,
  formatDealTagClass,
  formatNumber,
  isRentalDeal,
} from '../utils/searchPageUtils.js'
import { FALLBACK_IMAGE_URL } from '../constants/searchConfig.js'

function SearchResultsSection({
  results = [],
  isLoading = false,
  likedIds = [],
  userIsStaff = false,
  openShareMenuId,
  onToggleShareMenu,
  selectedCurrencyMeta,
  onToggleLike,
  onToggleFeatured,
  onShare,
  page = 1,
  totalPages = 1,
  visiblePages = [],
  onPageChange,
}) {
  return (
    <section id="property-results" className="w-full max-w-[480px] sm:max-w-full mx-auto px-4 py-6">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
          {results.map((property) => {
            const absoluteUrl = buildAbsoluteUrl(
              property.absolute_url || (property.slug ? `/property/${property.slug}/` : '/search/'),
            )
            const rawImageUrl = property.main_image?.url || property.images?.[0]?.url
            const mainImageUrl = rawImageUrl ? buildMediaUrl(rawImageUrl) : FALLBACK_IMAGE_URL
            const dealName = property.deal_type?.name || 'Угода'
            const rentalDeal = isRentalDeal(dealName)
            const formattedPrice =
              property.price == null
                ? 'Ціна за запитом'
                : `${selectedCurrencyMeta.symbol} ${formatNumber(property.price)}`

            return (
              <SearchResultCard
                key={property.id}
                property={property}
                absoluteUrl={absoluteUrl}
                mainImageUrl={mainImageUrl}
                isLiked={likedIds.includes(property.id)}
                userIsStaff={userIsStaff}
                isShareMenuOpen={openShareMenuId === property.id}
                formattedPrice={formattedPrice}
                showRentSuffix={rentalDeal && property.price != null}
                dealName={dealName}
                dealTagClassName={formatDealTagClass(dealName)}
                onToggleLike={onToggleLike}
                onToggleFeatured={onToggleFeatured}
                onToggleShareMenu={onToggleShareMenu}
                onShare={onShare}
              />
            )
          })}

          {!isLoading && !results.length ? (
            <p className="col-span-full text-center text-white">Об&apos;єкти не знайдено.</p>
          ) : null}
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex justify-center mt-8">
          <nav className="inline-flex rounded-md shadow" aria-label="Пагінація">
            {page > 1 ? (
              <button
                type="button"
                className="py-2 px-3 border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 rounded-l-md"
                onClick={() => onPageChange?.(Math.max(page - 1, 1))}
              >
                <i className="ri-arrow-left-s-line"></i>
              </button>
            ) : (
              <span className="py-2 px-3 border border-gray-200 bg-gray-100 text-gray-400 rounded-l-md">
                <i className="ri-arrow-left-s-line"></i>
              </span>
            )}

            {visiblePages.map((pageNumber) =>
              pageNumber === page ? (
                <span
                  key={pageNumber}
                  className="py-2 px-4 border-t border-b border-gray-300 bg-primary text-white"
                >
                  {pageNumber}
                </span>
              ) : (
                <button
                  key={pageNumber}
                  type="button"
                  className="py-2 px-4 border-t border-b border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  onClick={() => onPageChange?.(pageNumber)}
                >
                  {pageNumber}
                </button>
              ),
            )}

            {page < totalPages ? (
              <button
                type="button"
                className="py-2 px-3 border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 rounded-r-md"
                onClick={() => onPageChange?.(Math.min(page + 1, totalPages))}
              >
                <i className="ri-arrow-right-s-line"></i>
              </button>
            ) : (
              <span className="py-2 px-3 border border-gray-200 bg-gray-100 text-gray-400 rounded-r-md">
                <i className="ri-arrow-right-s-line"></i>
              </span>
            )}
          </nav>
        </div>
      ) : null}
    </section>
  )
}

export default SearchResultsSection
