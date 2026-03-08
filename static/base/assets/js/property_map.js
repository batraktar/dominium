(() => {
  const DEFAULT_THEME_ID = "premium_light";
  const DEFAULT_STORAGE_KEY = "dominium-map-theme";

  const FALLBACK_THEMES = {
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
  };

  const OSM_FALLBACK_LAYER = {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const isObject = (value) => typeof value === "object" && value !== null;

  const isBasemapName = (value) => value === "map" || value === "satellite";

  const mergeBaseLayers = (baseLayers, overrideLayers) => {
    const base = isObject(baseLayers) ? baseLayers : {};
    const override = isObject(overrideLayers) ? overrideLayers : {};
    const keys = new Set([...Object.keys(base), ...Object.keys(override)]);
    const merged = {};

    keys.forEach((key) => {
      merged[key] = {
        ...(isObject(base[key]) ? base[key] : {}),
        ...(isObject(override[key]) ? override[key] : {}),
      };
    });

    return merged;
  };

  const readStoredThemeId = (storageKey) => {
    try {
      return window.localStorage.getItem(storageKey) || "";
    } catch (_error) {
      return "";
    }
  };

  const readMapSettings = () => {
    const config = isObject(window.DOMINIUM_MAP_CONFIG) ? window.DOMINIUM_MAP_CONFIG : {};
    const storageKey =
      typeof config.storageKey === "string" && config.storageKey.trim()
        ? config.storageKey.trim()
        : DEFAULT_STORAGE_KEY;

    const configuredThemes = isObject(config.themes) ? config.themes : {};
    const themeIds = new Set([
      ...Object.keys(FALLBACK_THEMES),
      ...Object.keys(configuredThemes),
    ]);

    const themes = {};
    themeIds.forEach((themeId) => {
      const fallbackTheme =
        FALLBACK_THEMES[themeId] || FALLBACK_THEMES[DEFAULT_THEME_ID];
      const configuredTheme = isObject(configuredThemes[themeId])
        ? configuredThemes[themeId]
        : {};

      themes[themeId] = {
        label:
          typeof configuredTheme.label === "string" && configuredTheme.label.trim()
            ? configuredTheme.label.trim()
            : fallbackTheme.label,
        defaultBasemap: isBasemapName(configuredTheme.defaultBasemap)
          ? configuredTheme.defaultBasemap
          : fallbackTheme.defaultBasemap,
        baseLayers: mergeBaseLayers(
          fallbackTheme.baseLayers,
          configuredTheme.baseLayers
        ),
      };
    });

    const configuredDefaultTheme =
      typeof config.defaultTheme === "string" ? config.defaultTheme : "";
    const defaultThemeId = themes[configuredDefaultTheme]
      ? configuredDefaultTheme
      : themes[DEFAULT_THEME_ID]
        ? DEFAULT_THEME_ID
        : Object.keys(themes)[0];

    const storedThemeId = readStoredThemeId(storageKey);
    const activeThemeId = themes[storedThemeId] ? storedThemeId : defaultThemeId;
    const activeTheme = themes[activeThemeId] || themes[defaultThemeId];

    const baseLayersWithLegacyOverrides = mergeBaseLayers(
      activeTheme.baseLayers,
      config.baseLayers
    );

    const baseLayers = mergeBaseLayers(
      FALLBACK_THEMES[DEFAULT_THEME_ID].baseLayers,
      baseLayersWithLegacyOverrides
    );

    const defaultBasemap = isBasemapName(config.defaultBasemap)
      ? config.defaultBasemap
      : activeTheme.defaultBasemap;

    return {
      defaultBasemap: isBasemapName(defaultBasemap)
        ? defaultBasemap
        : FALLBACK_THEMES[DEFAULT_THEME_ID].defaultBasemap,
      baseLayers,
    };
  };

  const buildLayer = (definition) => {
    const options = {
      attribution: definition.attribution || "",
      maxZoom: definition.maxZoom || 19,
    };

    if (definition.subdomains) {
      options.subdomains = definition.subdomains;
    }
    if (typeof definition.opacity === "number") {
      options.opacity = definition.opacity;
    }
    if (typeof definition.zIndex === "number") {
      options.zIndex = definition.zIndex;
    }

    return window.L.tileLayer(definition.url, options);
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof window.L === "undefined") {
      return;
    }

    const mapElement = document.getElementById("map");
    if (!mapElement) {
      return;
    }

    const lat = Number.parseFloat(
      String(mapElement.dataset.lat || "").replace(",", ".")
    );
    const lon = Number.parseFloat(
      String(mapElement.dataset.lon || "").replace(",", ".")
    );

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }

    const settings = readMapSettings();
    const map = window.L.map("map", { attributionControl: false }).setView([lat, lon], 15);

    const layers = {
      map: buildLayer(settings.baseLayers.map),
      satellite: buildLayer(settings.baseLayers.satellite),
      satelliteLabels: buildLayer(settings.baseLayers.satelliteLabels),
      osmFallback: buildLayer(OSM_FALLBACK_LAYER),
    };

    const layerErrors = { map: 0, satellite: 0 };

    const radios = document.querySelectorAll("#map-controls input[name='basemap']");
    let activeChoice = settings.defaultBasemap;
    let activeLayerName = null;

    const selectRenderedLayerName = (choice) => {
      if (choice === "satellite") {
        return layerErrors.satellite >= 8 ? "osmFallback" : "satellite";
      }
      return layerErrors.map >= 8 ? "osmFallback" : "map";
    };

    const applyVisibleLayer = () => {
      const renderedBase = selectRenderedLayerName(activeChoice);
      const shouldShowSatelliteLabels =
        activeChoice === "satellite" && renderedBase === "satellite";

      Object.entries(layers).forEach(([name, layer]) => {
        const isBaseLayer = name === renderedBase;
        const isSatelliteLabelsLayer =
          name === "satelliteLabels" && shouldShowSatelliteLabels;
        if (!isBaseLayer && !isSatelliteLabelsLayer && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });

      if (!map.hasLayer(layers[renderedBase])) {
        map.addLayer(layers[renderedBase]);
      }
      if (shouldShowSatelliteLabels && !map.hasLayer(layers.satelliteLabels)) {
        map.addLayer(layers.satelliteLabels);
      }

      activeLayerName = renderedBase;

      radios.forEach((radio) => {
        radio.checked = radio.value === activeChoice;
      });
    };

    const setActiveChoice = (choice) => {
      activeChoice = choice === "satellite" ? "satellite" : "map";
      applyVisibleLayer();
    };

    layers.map.on("tileerror", () => {
      layerErrors.map += 1;
      if (activeChoice === "map" && activeLayerName === "map" && layerErrors.map >= 8) {
        applyVisibleLayer();
      }
    });

    layers.satellite.on("tileerror", () => {
      layerErrors.satellite += 1;
      if (
        activeChoice === "satellite" &&
        activeLayerName === "satellite" &&
        layerErrors.satellite >= 8
      ) {
        applyVisibleLayer();
      }
    });

    setActiveChoice(settings.defaultBasemap);

    const popupContent = `<div class="font-fixel text-deepOcean"><b>${escapeHtml(
      mapElement.dataset.title || ""
    )}</b><br>${escapeHtml(mapElement.dataset.address || "")}</div>`;

    window.L.marker([lat, lon]).addTo(map).bindPopup(popupContent).openPopup();

    window.setTimeout(() => map.invalidateSize(), 500);

    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        setActiveChoice(radio.value === "satellite" ? "satellite" : "map");
      });
    });
  });
})();
