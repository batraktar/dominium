function PropertyContactBrand({ logoSrc }) {
  return (
    <div className="flex justify-center space-x-4 mb-4 sm:mb-6">
      <img
        src={logoSrc}
        className="w-[220px] h-auto object-contain"
        alt="DOMINIUM Realty"
        width="200"
        height="67"
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

export default PropertyContactBrand
