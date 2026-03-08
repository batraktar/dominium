function PropertyDesktopGalleryGrid({
  property,
  galleryImages = [],
  onModalOpenChange,
  onModalImageIndexChange,
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-2 relative rounded-lg overflow-hidden aspect-[4/3]">
        <img
          src={galleryImages[0].url}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          width="1200"
          height="900"
          sizes="(max-width: 1023px) 100vw, 66vw"
          className="w-full h-full object-cover cursor-pointer"
          alt={`${property.title} — головне фото`}
          onClick={() => {
            onModalImageIndexChange?.(0)
            onModalOpenChange?.(true)
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        {galleryImages.slice(1, 3).map((image, index) => (
          <div key={image.id} className="relative rounded-lg overflow-hidden flex-1 aspect-[4/3]">
            <img
              src={image.url}
              loading="lazy"
              decoding="async"
              width="1200"
              height="900"
              sizes="(max-width: 1023px) 100vw, 33vw"
              className="w-full h-full object-cover cursor-pointer"
              alt={`${property.title} — фото ${index + 2}`}
              onClick={() => {
                onModalImageIndexChange?.(index + 1)
                onModalOpenChange?.(true)
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default PropertyDesktopGalleryGrid
