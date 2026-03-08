import { useCallback, useState } from 'react'
import {
  isBasemapName,
  mergeBaseLayers,
  readMapThemeSettings,
  writeStoredThemeId,
} from '../../model/mapThemeModel.js'

export default function useInteractiveMapTheme() {
  const [themeSettings, setThemeSettings] = useState(() => readMapThemeSettings())
  const [themeId, setThemeId] = useState(() => themeSettings.themeId)
  const [basemap, setBasemap] = useState(() =>
    isBasemapName(themeSettings.defaultBasemap) ? themeSettings.defaultBasemap : 'satellite',
  )

  const handleThemeChange = useCallback(
    (nextThemeId) => {
      if (!themeSettings.themes[nextThemeId]) return

      writeStoredThemeId(nextThemeId, themeSettings.storageKey)
      const nextSettings = readMapThemeSettings()
      const effectiveThemeId = nextSettings.themes[nextThemeId] ? nextThemeId : nextSettings.themeId
      const effectiveTheme = nextSettings.themes[effectiveThemeId]

      setThemeSettings({
        ...nextSettings,
        themeId: effectiveThemeId,
        baseLayers: mergeBaseLayers(nextSettings.baseLayers, effectiveTheme.baseLayers),
      })
      setThemeId(effectiveThemeId)
      setBasemap(isBasemapName(effectiveTheme.defaultBasemap) ? effectiveTheme.defaultBasemap : 'satellite')
    },
    [themeSettings.storageKey, themeSettings.themes],
  )

  const handleBasemapChange = useCallback((nextBasemap) => {
    setBasemap(nextBasemap === 'satellite' ? 'satellite' : 'map')
  }, [])

  return {
    themeSettings,
    themeId,
    themeOptions: Object.entries(themeSettings.themes),
    basemap,
    handleThemeChange,
    handleBasemapChange,
  }
}
