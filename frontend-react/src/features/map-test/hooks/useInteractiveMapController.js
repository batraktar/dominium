import useInteractiveMapData from './interactive-map/useInteractiveMapData.js'
import useInteractiveMapLeaflet from './interactive-map/useInteractiveMapLeaflet.js'
import useInteractiveMapTheme from './interactive-map/useInteractiveMapTheme.js'

export default function useInteractiveMapController() {
  const {
    themeSettings,
    themeId,
    themeOptions,
    basemap,
    handleThemeChange,
    handleBasemapChange,
  } = useInteractiveMapTheme()

  const {
    query,
    setQuery,
    filteredProperties,
    totalCount,
    activePropertyId,
    setActivePropertyId,
    isLoading,
    hasLoadError,
  } = useInteractiveMapData()

  const { mapElementRef, handleSelectProperty } = useInteractiveMapLeaflet({
    basemap,
    baseLayers: themeSettings.baseLayers,
    filteredProperties,
    setActivePropertyId,
  })

  return {
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
    hasLoadError,
    handleThemeChange,
    handleBasemapChange,
    handleSelectProperty,
  }
}
