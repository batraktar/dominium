import PropertyLikeToggleButton from './gallery-actions/PropertyLikeToggleButton.jsx'
import PropertyShareMenu from './gallery-actions/PropertyShareMenu.jsx'
import PropertyDesktopGalleryGrid from './gallery-layout/PropertyDesktopGalleryGrid.jsx'

function PropertyDesktopGallery({
  property,
  galleryImages = [],
  liked = false,
  openShareMenu = false,
  onToggleLike,
  onToggleShareMenu,
  onShare,
  onModalOpenChange,
  onModalImageIndexChange,
}) {
  if (!galleryImages.length) return null

  return (
    <div id="desktopGallery" className="hidden overflow-hidden md:block mx-auto mb-8">
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        <PropertyLikeToggleButton
          liked={liked}
          onToggleLike={onToggleLike}
          className="like-button w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full"
          dataPropertyId={property.id}
        />

        <PropertyShareMenu
          openShareMenu={openShareMenu}
          onToggleShareMenu={onToggleShareMenu}
          onShare={onShare}
          triggerClassName="w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition"
          triggerIconClassName="ri-share-forward-line text-gray-700"
        />
      </div>

      <PropertyDesktopGalleryGrid
        property={property}
        galleryImages={galleryImages}
        onModalOpenChange={onModalOpenChange}
        onModalImageIndexChange={onModalImageIndexChange}
      />
    </div>
  )
}

export default PropertyDesktopGallery
