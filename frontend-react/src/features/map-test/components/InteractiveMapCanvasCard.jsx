function InteractiveMapCanvasCard({
  mapElementRef,
  totalCount,
  basemap,
  onBasemapChange,
}) {
  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
      <div id="interactive-map" ref={mapElementRef} className="w-full h-[62vh] min-h-[420px]"></div>
      <div className="border-t border-gray-100 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-deepOcean/70 font-fixel flex items-center justify-between gap-3 flex-wrap">
        <div id="map-total-count">Обʼєктів на карті: {totalCount}</div>
        <div
          id="interactive-map-controls"
          className="inline-flex items-center rounded-lg border border-gray-200 px-2 py-1 gap-3"
        >
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="basemap"
              value="map"
              checked={basemap === 'map'}
              onChange={() => onBasemapChange('map')}
            />
            <span>Map</span>
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="basemap"
              value="satellite"
              checked={basemap === 'satellite'}
              onChange={() => onBasemapChange('satellite')}
            />
            <span>Satellite</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default InteractiveMapCanvasCard
