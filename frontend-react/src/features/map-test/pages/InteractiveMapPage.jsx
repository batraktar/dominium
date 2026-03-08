import 'leaflet/dist/leaflet.css'
import '../map-test.css'
import useInteractiveMapController from '../hooks/useInteractiveMapController.js'
import InteractiveMapAttribution from '../components/InteractiveMapAttribution.jsx'
import InteractiveMapCanvasCard from '../components/InteractiveMapCanvasCard.jsx'
import InteractiveMapHeaderControls from '../components/InteractiveMapHeaderControls.jsx'
import InteractiveMapPropertySidebar from '../components/InteractiveMapPropertySidebar.jsx'

function InteractiveMapPage() {
  const {
    mapElementRef,
    themeId,
    themeOptions,
    basemap,
    query,
    setQuery,
    filteredProperties,
    totalCount,
    activePropertyId,
    isLoading,
    handleThemeChange,
    handleBasemapChange,
    handleSelectProperty,
  } = useInteractiveMapController()

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-deepOcean">
      <InteractiveMapHeaderControls
        themeId={themeId}
        themeOptions={themeOptions}
        onThemeChange={handleThemeChange}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 sm:gap-6">
        <InteractiveMapCanvasCard
          mapElementRef={mapElementRef}
          totalCount={totalCount}
          basemap={basemap}
          onBasemapChange={handleBasemapChange}
        />

        <InteractiveMapPropertySidebar
          query={query}
          onQueryChange={setQuery}
          filteredProperties={filteredProperties}
          activePropertyId={activePropertyId}
          isLoading={isLoading}
          onSelectProperty={handleSelectProperty}
        />
      </div>

      <InteractiveMapAttribution />
    </section>
  )
}

export default InteractiveMapPage
