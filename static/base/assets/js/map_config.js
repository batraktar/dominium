(() => {
  // Central map settings shared by all map pages.
  // Style is selected via localStorage key and can be changed from the map test page.
  window.DOMINIUM_MAP_CONFIG = {
    storageKey: "dominium-map-theme",
    defaultTheme: "premium_light",
    themes: {
      premium_light: {
        label: "Premium Light",
        defaultBasemap: "satellite",
        baseLayers: {
          map: {
            url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
            subdomains: "abcd",
            maxZoom: 20,
          },
          satellite: {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution: "Tiles &copy; Esri",
            maxZoom: 19,
          },
          satelliteLabels: {
            // Transparent labels over satellite imagery (cities/streets/POI).
            url: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
            attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
            subdomains: "abcd",
            maxZoom: 20,
            opacity: 0.92,
            zIndex: 650,
          },
        },
      },
      dark_contrast: {
        label: "Dark Contrast",
        defaultBasemap: "map",
        baseLayers: {
          map: {
            url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
            subdomains: "abcd",
            maxZoom: 20,
          },
          satellite: {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution: "Tiles &copy; Esri",
            maxZoom: 19,
          },
          satelliteLabels: {
            url: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
            attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
            subdomains: "abcd",
            maxZoom: 20,
            opacity: 0.98,
            zIndex: 650,
          },
        },
      },
      minimal_classic: {
        label: "Minimal Classic",
        defaultBasemap: "map",
        baseLayers: {
          map: {
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          },
          satellite: {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution: "Tiles &copy; Esri",
            maxZoom: 19,
          },
          satelliteLabels: {
            url: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
            attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
            subdomains: "abcd",
            maxZoom: 20,
            opacity: 0.9,
            zIndex: 650,
          },
        },
      },
    },
  };
})();
