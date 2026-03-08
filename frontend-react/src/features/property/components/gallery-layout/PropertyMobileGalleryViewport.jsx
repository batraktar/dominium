function PropertyMobileGalleryViewport({
  property,
  galleryImages = [],
  activeMobileImage,
  fallbackImageUrl,
  mobileImageIndex = 0,
  onMobileImageIndexChange,
  onModalOpenChange,
  onModalImageIndexChange,
}) {
  return (
    <div className="relative w-full h-full" id="gallery">
      <img
        src={activeMobileImage?.url || fallbackImageUrl}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        width="1200"
        height="900"
        sizes="100vw"
        className="w-full h-full object-cover cursor-pointer"
        alt={`${property.title} — фото`}
        onClick={() => {
          onModalImageIndexChange?.(mobileImageIndex)
          onModalOpenChange?.(true)
        }}
      />
      {mobileImageIndex > 0 ? (
        <button
          type="button"
          className="btn-prev absolute left-3 top-1/2 -translate-y-1/2 gallery-button"
          aria-label="Попереднє фото"
          onClick={() => onMobileImageIndexChange?.(Math.max(mobileImageIndex - 1, 0))}
        >
          <i className="ri-arrow-left-s-line text-gray-700 text-xl"></i>
        </button>
      ) : null}
      {mobileImageIndex < galleryImages.length - 1 ? (
        <button
          type="button"
          className="btn-next absolute right-3 top-1/2 -translate-y-1/2 gallery-button"
          aria-label="Наступне фото"
          onClick={() =>
            onMobileImageIndexChange?.(Math.min(mobileImageIndex + 1, galleryImages.length - 1))
          }
        >
          <i className="ri-arrow-right-s-line text-gray-700 text-xl"></i>
        </button>
      ) : null}
      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {galleryImages.map((image, index) => (
          <div
            key={`dot-${image.id}`}
            className={`w-2 h-2 rounded-full ${index === mobileImageIndex ? 'bg-white/90' : 'bg-white/50'}`}
          ></div>
        ))}
      </div>
    </div>
  )
}

export default PropertyMobileGalleryViewport
