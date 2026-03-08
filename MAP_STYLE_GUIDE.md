# Map Style Guide

## Where to configure map style

All map style settings are centralized in:

- `static/base/assets/js/map_config.js`

Map scripts for pages:

- `static/base/assets/js/interactive_map_test.js`
- `static/base/assets/js/property_map.js`

## Built-in presets

- `premium_light` (satellite default + clean light map)
- `dark_contrast` (dark map style)
- `minimal_classic` (classic OSM style)

All presets keep satellite mode with labels overlay.

## How switching works

- Style selector is available on `/test/map/interactive/`.
- Chosen style is saved in `localStorage` key: `dominium-map-theme`.
- The same style is reused on property detail map.

## Config structure

```js
window.DOMINIUM_MAP_CONFIG = {
  storageKey: "dominium-map-theme",
  defaultTheme: "premium_light",
  themes: {
    premium_light: {
      label: "Premium Light",
      defaultBasemap: "satellite", // "map" or "satellite"
      baseLayers: {
        map: { url: "...", attribution: "...", subdomains: "abcd", maxZoom: 20 },
        satellite: { url: "...", attribution: "...", maxZoom: 19 },
        satelliteLabels: {
          url: "...",
          attribution: "...",
          subdomains: "abcd",
          maxZoom: 20,
          opacity: 0.92,
          zIndex: 650,
        },
      },
    },
  },
};
```

## Satellite labels

`satelliteLabels` is a transparent tile layer drawn over satellite imagery.
It adds city/street/place names while keeping photo tiles.

## Recommended safe tile sources (no API key)

- CARTO Light: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`
- CARTO Dark: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- CARTO Labels: `https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png`
- Esri Satellite: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- OSM Classic: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

## Local Leaflet assets

Leaflet library is served locally:

- `static/vendor/leaflet/leaflet.css`
- `static/vendor/leaflet/leaflet.js`
- `static/vendor/leaflet/images/*`

This removes runtime dependency on external CDN for core Leaflet JS/CSS.
