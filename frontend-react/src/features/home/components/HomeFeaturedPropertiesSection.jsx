function dealTypeClass(dealType) {
  const dealName = String(dealType || '').toLowerCase()
  if (dealName === 'оренда') return 'bg-creamBeige text-deepOcean'
  if (dealName === 'продаж') return 'bg-coolSage text-white'
  return 'bg-red-200 text-white'
}

function HomeFeaturedPropertiesSection({ featuredProperties = [] }) {
  return (
    <section className="bg-primary py-16 pb-28">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2-5xl font-ermilov text-white text-center mt-2 mb-4">
            ПРОПОНОВАНІ ПРОПОЗИЦІЇ
          </h2>
        </div>

        <div className="relative block md:hidden">
          <div className="swiper property-swiper px-1">
            <div className="swiper-wrapper">
              {featuredProperties.map((property) => (
                <div key={property.id} className="swiper-slide px-2">
                  <div className="bg-white rounded-[8px] shadow-lg overflow-hidden flex flex-col">
                    <div className="relative h-56">
                      <img
                        src={property.image}
                        loading="lazy"
                        decoding="async"
                        width="1200"
                        height="900"
                        sizes="(max-width: 767px) 100vw, 33vw"
                        className="w-full h-56 object-cover"
                        alt={property.title}
                      />
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-ermilov text-primary">{property.price}</h3>
                      <p className="text-coolSage font-fixel">{property.address}</p>
                      <div className="flex items-center space-x-4 mt-3 text-gray-600">
                        <span className="flex text-coolSage font-fixel items-center">
                          <i className="ri-home-line mr-1"></i> {property.rooms} кімнати
                        </span>
                        <span className="flex text-coolSage font-fixel items-center">
                          <i className="ri-ruler-line mr-1"></i> {property.area} м²
                        </span>
                      </div>
                      <div className="mt-auto pt-4 flex items-center gap-x-3">
                        <a
                          href={property.detailUrl}
                          className="bg-white text-deepOcean font-fixel text-sm px-4 py-2 rounded-full h-10 shadow-[inset_0_0_0_1px] shadow-deepOcean flex items-center justify-center"
                        >
                          Докладніше
                        </a>
                        <span
                          className={`px-8 py-2 text-sm h-10 font-fixel rounded-full flex items-center justify-center ${dealTypeClass(
                            property.dealType,
                          )}`}
                        >
                          {property.dealType}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="custom-swiper-prev !left-2 top-1/2 -translate-y-1/2 z-10 text-coolSage text-2xl absolute"
              role="button"
              tabIndex="0"
              aria-label="Попередній слайд"
            >
              <i className="ri-arrow-left-s-line"></i>
            </div>
            <div
              className="custom-swiper-next !right-2 top-1/2 -translate-y-1/2 z-10 text-coolSage text-2xl absolute"
              role="button"
              tabIndex="0"
              aria-label="Наступний слайд"
            >
              <i className="ri-arrow-right-s-line"></i>
            </div>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProperties.map((property) => (
            <div
              key={`desktop-${property.id}`}
              className="bg-white rounded-[8px] shadow-lg overflow-hidden flex flex-col"
            >
              <div className="relative h-56">
                <img
                  src={property.image}
                  loading="lazy"
                  decoding="async"
                  width="1200"
                  height="900"
                  sizes="(max-width: 1023px) 50vw, 33vw"
                  className="w-full h-56 object-cover"
                  alt={property.title}
                />
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-ermilov text-primary">{property.price}</h3>
                <p className="text-coolSage font-fixel">{property.address}</p>
                <div className="flex items-center space-x-4 mt-3 text-gray-600">
                  <span className="flex text-coolSage font-fixel items-center">
                    <i className="ri-home-line mr-1"></i> {property.rooms} кімнати
                  </span>
                  <span className="flex text-coolSage font-fixel items-center">
                    <i className="ri-ruler-line mr-1"></i> {property.area} м²
                  </span>
                </div>
                <div className="mt-auto pt-4 flex items-center gap-x-3">
                  <a
                    href={property.detailUrl}
                    className="bg-white text-deepOcean font-fixel text-sm px-4 py-2 rounded-full h-10 shadow-[inset_0_0_0_1px] shadow-deepOcean flex items-center justify-center"
                  >
                    Докладніше
                  </a>
                  <span
                    className={`px-8 py-2 rounded-full text-sm h-10 font-fixel ${dealTypeClass(
                      property.dealType,
                    )}`}
                  >
                    {property.dealType}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HomeFeaturedPropertiesSection
