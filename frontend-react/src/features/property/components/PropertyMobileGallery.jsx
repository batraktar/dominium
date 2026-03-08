import PropertyLikeToggleButton from './gallery-actions/PropertyLikeToggleButton.jsx'
import PropertyShareMenu from './gallery-actions/PropertyShareMenu.jsx'
import PropertyMobileGalleryCaption from './gallery-layout/PropertyMobileGalleryCaption.jsx'
import PropertyMobileGalleryViewport from './gallery-layout/PropertyMobileGalleryViewport.jsx'

function PropertyMobileGallery({
  property,
  galleryImages = [],
  activeMobileImage,
  fallbackImageUrl,
  liked = false,
  openShareMenu = false,
  mobileImageIndex = 0,
  onToggleLike,
  onToggleShareMenu,
  onShare,
  onMobileImageIndexChange,
  onModalOpenChange,
  onModalImageIndexChange,
}) {
  return (
    <div className="md:hidden relative h-[400px] mb-8 rounded-lg overflow-hidden group mobile-gallery">
      <PropertyMobileGalleryViewport
        property={property}
        galleryImages={galleryImages}
        activeMobileImage={activeMobileImage}
        fallbackImageUrl={fallbackImageUrl}
        mobileImageIndex={mobileImageIndex}
        onMobileImageIndexChange={onMobileImageIndexChange}
        onModalOpenChange={onModalOpenChange}
        onModalImageIndexChange={onModalImageIndexChange}
      />

      <PropertyMobileGalleryCaption title={property.title} address={property.address} />

      <div className="absolute top-3 right-3 flex space-x-2 z-10">
        <PropertyLikeToggleButton
          liked={liked}
          onToggleLike={onToggleLike}
          className="gallery-button like-button w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full"
        />

        <PropertyShareMenu
          openShareMenu={openShareMenu}
          onToggleShareMenu={onToggleShareMenu}
          onShare={onShare}
          triggerClassName="gallery-button w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition"
          triggerIconClassName="ri-share-line text-gray-700"
        />
      </div>
    </div>
  )
}

export default PropertyMobileGallery
