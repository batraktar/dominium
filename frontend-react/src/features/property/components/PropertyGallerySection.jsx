import PropertyDesktopGallery from './PropertyDesktopGallery.jsx'
import PropertyGalleryModal from './PropertyGalleryModal.jsx'
import PropertyMobileGallery from './PropertyMobileGallery.jsx'

function PropertyGallerySection({
  property,
  galleryImages = [],
  activeMobileImage,
  activeModalImage,
  fallbackImageUrl,
  liked = false,
  openShareMenu = false,
  mobileImageIndex = 0,
  modalOpen = false,
  modalImageIndex = 0,
  onToggleLike,
  onToggleShareMenu,
  onShare,
  onMobileImageIndexChange,
  onModalOpenChange,
  onModalImageIndexChange,
}) {
  return (
    <section className="gallery-section mb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PropertyDesktopGallery
          property={property}
          galleryImages={galleryImages}
          liked={liked}
          openShareMenu={openShareMenu}
          onToggleLike={onToggleLike}
          onToggleShareMenu={onToggleShareMenu}
          onShare={onShare}
          onModalOpenChange={onModalOpenChange}
          onModalImageIndexChange={onModalImageIndexChange}
        />

        <PropertyMobileGallery
          property={property}
          galleryImages={galleryImages}
          activeMobileImage={activeMobileImage}
          fallbackImageUrl={fallbackImageUrl}
          liked={liked}
          openShareMenu={openShareMenu}
          mobileImageIndex={mobileImageIndex}
          onToggleLike={onToggleLike}
          onToggleShareMenu={onToggleShareMenu}
          onShare={onShare}
          onMobileImageIndexChange={onMobileImageIndexChange}
          onModalOpenChange={onModalOpenChange}
          onModalImageIndexChange={onModalImageIndexChange}
        />

        {modalOpen ? (
          <PropertyGalleryModal
            property={property}
            galleryImages={galleryImages}
            activeModalImage={activeModalImage}
            fallbackImageUrl={fallbackImageUrl}
            modalImageIndex={modalImageIndex}
            onModalOpenChange={onModalOpenChange}
            onModalImageIndexChange={onModalImageIndexChange}
          />
        ) : null}
      </div>
    </section>
  )
}

export default PropertyGallerySection
