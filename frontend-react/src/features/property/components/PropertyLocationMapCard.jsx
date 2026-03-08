function PropertyLocationMapCard({
  hasCoords = false,
  mapElementRef,
  basemap = 'satellite',
  onBasemapChange,
}) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-4 sm:mb-10">
      <h3 className="text-xl text-deepOcean font-ermilov mb-4">Location</h3>
      {hasCoords ? (
        <>
          <div className="h-[320px] rounded-lg overflow-hidden relative bg-white/10">
            <div ref={mapElementRef} className="w-full h-full z-0"></div>
            <div
              id="map-controls"
              className="absolute top-2 right-2 z-10 bg-white rounded shadow px-2 py-1 text-sm font-fixel"
            >
              <label className="mr-2">
                <input
                  type="radio"
                  name="basemap"
                  value="map"
                  checked={basemap === 'map'}
                  onChange={() => onBasemapChange?.('map')}
                />
                Map
              </label>
              <label>
                <input
                  type="radio"
                  name="basemap"
                  value="satellite"
                  checked={basemap === 'satellite'}
                  onChange={() => onBasemapChange?.('satellite')}
                />
                Satellite
              </label>
            </div>
          </div>

          <div className="text-xs text-gray-400 font-fixel text-right mt-2">
            Дані карти:{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              © OpenStreetMap contributors
            </a>
            , Tiles: © Esri
          </div>
        </>
      ) : (
        <div className="h-[320px] rounded-lg border border-white/30 bg-white/5 flex flex-col items-center justify-center text-sm font-fixel text-deepOcean/80 px-6 text-center">
          <i className="ri-map-pin-off-line text-2xl mb-2"></i>
          Координати цього обʼєкта ще не додані. Звʼяжіться з менеджером, щоб отримати точну адресну
          точку.
        </div>
      )}
    </div>
  )
}

export default PropertyLocationMapCard
