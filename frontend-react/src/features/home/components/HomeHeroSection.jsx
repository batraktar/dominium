import heroVideo from '../../../../../static/base/assets/video/compressed/2.mp4'

function HomeHeroSection() {
  return (
    <section className="hero relative bg-cover bg-center py-[130px] md:py-[160px] xl:py-[250px] overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        data-lazy-video="hero"
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source data-src={heroVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black bg-opacity-40 z-10"></div>
      <div className="relative z-20 container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h1 className="text-3xl md:text-[38px] font-ermilov lg:mb-6 md:whitespace-nowrap overflow-hidden text-ellipsis">
            ЗНАЙДІТЬ СВІЙ ІДЕАЛЬНИЙ ДІМ
          </h1>
          <p className="text-[12px] lg:text-xl font-fixel text-creamBeige whitespace-nowrap mb-4 lg:mb-8">
            професійний підхід до пошуку нерухомості
          </p>
          <form action="/search/" method="get" className="bg-white rounded-button shadow-lg p-4">
            <div className="flex-center">
              <div className="flex-1 mx-4">
                <div className="relative">
                  <i className="ri-search-line input-icon text-coolSage"></i>
                  <input
                    type="text"
                    name="q"
                    placeholder="Введіть місто або ключове слово..."
                    className="input text-coolSage placeholder:text-coolSage placeholder:font-ermilov"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="button button-primary font-ermilov bg-deepOcean whitespace-nowrap"
              >
                <i className="ri-search-line mr-2"></i> Пошук
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export default HomeHeroSection
