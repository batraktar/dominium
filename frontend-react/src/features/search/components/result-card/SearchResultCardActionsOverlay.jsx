import SearchResultShareMenu from './SearchResultShareMenu.jsx'

function SearchResultCardActionsOverlay({
  property,
  isLiked = false,
  userIsStaff = false,
  isShareMenuOpen = false,
  onToggleLike,
  onToggleFeatured,
  onToggleShareMenu,
  onShare,
}) {
  return (
    <div className="absolute top-3 right-3 flex gap-2 z-10">
      <button
        type="button"
        className="like-button w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full transition"
        data-property-id={property.id}
        aria-label="Додати до обраного"
        onClick={() => onToggleLike?.(property.id)}
      >
        <i className={isLiked ? 'ri-heart-fill text-red-500' : 'ri-heart-line text-coolSage'}></i>
      </button>

      {userIsStaff ? (
        <button
          type="button"
          className="featured-toggle w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition"
          title="Керування блоком Топ-3"
          aria-label="Керувати блоком Топ-3"
          onClick={() => onToggleFeatured?.(property.id, Boolean(property.featured_homepage))}
        >
          <i
            className={
              property.featured_homepage ? 'ri-star-fill text-yellow-500' : 'ri-star-line text-coolSage'
            }
          ></i>
        </button>
      ) : null}

      <div className="relative" data-share-container>
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition"
          aria-label="Поділитися об'єктом"
          onClick={(event) => {
            event.stopPropagation()
            onToggleShareMenu?.(property.id)
          }}
        >
          <i className="ri-share-forward-line text-coolSage"></i>
        </button>

        <SearchResultShareMenu
          isShareMenuOpen={isShareMenuOpen}
          property={property}
          onShare={onShare}
        />
      </div>
    </div>
  )
}

export default SearchResultCardActionsOverlay
