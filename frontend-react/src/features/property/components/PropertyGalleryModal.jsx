import { createPortal } from 'react-dom'

function PropertyGalleryModal({
  property,
  galleryImages = [],
  activeModalImage,
  fallbackImageUrl,
  modalImageIndex = 0,
  onModalOpenChange,
  onModalImageIndexChange,
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col items-center justify-center overflow-hidden bg-black/90 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Галерея фотографій"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onModalOpenChange?.(false)
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onModalOpenChange?.(false)
      }}
    >
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <img
          src={activeModalImage?.url || fallbackImageUrl}
          className="block h-auto w-auto max-h-full max-w-full object-contain"
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

      <div className="z-10 flex w-full max-w-full shrink-0 justify-center">
        <div className="flex max-w-full gap-2 overflow-x-auto px-2 py-2">
          {galleryImages.map((image, index) => (
            <button
              key={`thumb-${image.id}`}
              type="button"
              aria-label={`Показати фото ${index + 1}`}
              aria-current={index === modalImageIndex ? 'true' : undefined}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg transition-opacity sm:h-16 sm:w-16 ${index === modalImageIndex ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
              onClick={() => onModalImageIndexChange?.(index)}
            >
              <img
                src={image.url}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                alt=""
              />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default PropertyGalleryModal
