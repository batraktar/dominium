function PropertyMobileGalleryCaption({ title = '', address = '' }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="text-xl sm:text-3xl font-bold text-white mb-2">{title}</h1>
      <p className="text-xs sm:text-lg text-white leading-tight">{address}</p>
    </div>
  )
}

export default PropertyMobileGalleryCaption
