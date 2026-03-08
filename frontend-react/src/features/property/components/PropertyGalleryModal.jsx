function PropertyGalleryModal({
  property,
  galleryImages = [],
  activeModalImage,
  fallbackImageUrl,
  modalImageIndex = 0,
  onModalOpenChange,
  onModalImageIndexChange,
}) {
  return (
    <div
      id="galleryModal"
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-0 overflow-auto"
      onClick={(event) => {
        if (event.target.id === 'galleryModal') onModalOpenChange?.(false)
      }}
    >
      <div className="modal-content w-full h-full m-0 p-0 flex items-center justify-center">
        <img
          id="modalImage"
          src={activeModalImage?.url || fallbackImageUrl}
          className="w-full h-auto object-contain"
          alt={`${property.title} — фото галереї`}
        />
        {modalImageIndex > 0 ? (
          <button
            type="button"
            className="btn-prev absolute left-4 top-1/2 -translate-y-1/2 gallery-button"
            aria-label="Попереднє фото"
            onClick={() => onModalImageIndexChange?.(Math.max(modalImageIndex - 1, 0))}
          >
            <i className="ri-arrow-left-s-line text-gray-700"></i>
          </button>
        ) : null}
        {modalImageIndex < galleryImages.length - 1 ? (
          <button
            type="button"
            className="btn-next absolute right-4 top-1/2 -translate-y-1/2 gallery-button"
            aria-label="Наступне фото"
            onClick={() =>
              onModalImageIndexChange?.(Math.min(modalImageIndex + 1, galleryImages.length - 1))
            }
          >
            <i className="ri-arrow-right-s-line text-gray-700"></i>
          </button>
        ) : null}
        <button
          type="button"
          className="absolute top-4 right-4 gallery-button"
          aria-label="Закрити галерею"
          onClick={() => onModalOpenChange?.(false)}
        >
          <i className="ri-close-line text-gray-700"></i>
        </button>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-4 overflow-x-auto p-2">
          <div className="flex space-x-2">
            {galleryImages.map((image, index) => (
              <img
                key={`thumb-${image.id}`}
                src={image.url}
                loading="lazy"
                decoding="async"
                className="thumbnail-img lazy-image"
                alt={`${property.title} — мініатюра ${index + 1}`}
                style={{ opacity: index === modalImageIndex ? 1 : 0.5 }}
                onClick={() => onModalImageIndexChange?.(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyGalleryModal
