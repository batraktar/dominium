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

  const writeStoredThemeId = (storageKey, themeId) => {
    try {
      window.localStorage.setItem(storageKey, themeId);
    } catch (_error) {
      // Storage might be blocked in private mode. Ignore safely.
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
      storageKey,
      themeId: activeThemeId,
      themes,
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

  const formatPrice = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "Ціна не вказана";
    }

    const formatted = new Intl.NumberFormat("uk-UA", {
      maximumFractionDigits: 0,
    }).format(value);
    return `${formatted} $`;
  };

  const normalize = (value) => String(value || "").toLowerCase().trim();

  const parseNumber = (value) => {
    const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sanitizeProperties = (input) => {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((item) => {
        const lat = parseNumber(item?.lat);
        const lon = parseNumber(item?.lon);

        if (lat === null || lon === null) {
          return null;
        }
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          return null;
        }

        const price = parseNumber(item?.price);

        return {
          id: Number.parseInt(item?.id ?? 0, 10) || 0,
          title: String(item?.title || ""),
          address: String(item?.address || ""),
          lat,
          lon,
          price,
          url: String(item?.url || "#"),
          image: item?.image ? String(item.image) : "",
          property_type: String(item?.property_type || ""),
          deal_type: String(item?.deal_type || ""),
        };
      })
      .filter(Boolean);
  };

  const buildPopup = (item) => {
    const imageHtml = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="map-popup-image" loading="lazy" />`
      : "";

    const typeRow = [item.property_type, item.deal_type]
      .filter(Boolean)
      .map((value) => escapeHtml(value))
      .join(" • ");

    return `
      <div class="map-popup">
        ${imageHtml}
        <div class="map-popup-body">
          <h4>${escapeHtml(item.title || "Об'єкт")}</h4>
          <p>${escapeHtml(item.address || "Адреса не вказана")}</p>
          ${typeRow ? `<div class="map-popup-meta">${typeRow}</div>` : ""}
          <div class="map-popup-price">${formatPrice(item.price)}</div>
          <a href="${escapeHtml(item.url || "#")}" class="map-popup-link">Перейти до обʼєкта</a>
        </div>
      </div>
    `;
  };

  const extractInlineProperties = (element) => {
    if (!element) {
      return [];
    }

    try {
      return sanitizeProperties(JSON.parse(element.textContent || "[]"));
    } catch (_error) {
      return [];
    }
  };

  const fetchProperties = async (url) => {
    if (!url) {
      return [];
    }

    try {
      const response = await window.fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        return [];
      }

      const payload = await response.json();
      return sanitizeProperties(payload?.results || []);
    } catch (_error) {
      return [];
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    if (typeof window.L === "undefined") {
      return;
    }

    const mapElement = document.getElementById("interactive-map");
    const sourceElement = document.getElementById("map-properties-data");
    const listElement = document.getElementById("map-property-list");
    const filterElement = document.getElementById("map-property-filter");
    const emptyStateElement = document.getElementById("map-empty-state");
    const totalCountElement = document.getElementById("map-total-count");
    const styleSelectElement = document.getElementById("map-style-select");

    if (!mapElement || !listElement) {
      return;
    }

    const defaultLat = Number.parseFloat(mapElement.dataset.defaultLat || "48.6208");
    const defaultLon = Number.parseFloat(mapElement.dataset.defaultLon || "22.2879");
    const defaultZoom = Number.parseInt(mapElement.dataset.defaultZoom || "8", 10);
    const sourceUrl = mapElement.dataset.sourceUrl || "";

    const settings = readMapSettings();

    if (styleSelectElement) {
      styleSelectElement.innerHTML = "";
      Object.entries(settings.themes).forEach(([themeId, theme]) => {
        const option = document.createElement("option");
        option.value = themeId;
        option.textContent = theme.label || themeId;
        styleSelectElement.append(option);
      });
      styleSelectElement.value = settings.themeId;

      styleSelectElement.addEventListener("change", () => {
        writeStoredThemeId(settings.storageKey, styleSelectElement.value);
        window.location.reload();
      });
    }

    const map = window.L.map("interactive-map", {
      attributionControl: false,
      zoomControl: true,
    }).setView(
      [
        Number.isFinite(defaultLat) ? defaultLat : 48.6208,
        Number.isFinite(defaultLon) ? defaultLon : 22.2879,
      ],
      Number.isFinite(defaultZoom) ? defaultZoom : 8
    );

    const layers = {
      map: buildLayer(settings.baseLayers.map),
      satellite: buildLayer(settings.baseLayers.satellite),
      satelliteLabels: buildLayer(settings.baseLayers.satelliteLabels),
      osmFallback: buildLayer(OSM_FALLBACK_LAYER),
    };

    const layerErrors = { map: 0, satellite: 0 };

    const radios = document.querySelectorAll(
      "#interactive-map-controls input[name='basemap']"
    );

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

    const markerLayer = window.L.layerGroup().addTo(map);
    const markerById = new Map();

    const setTotalCount = (count) => {
      if (!totalCountElement) {
        return;
      }
      totalCountElement.textContent = `Обʼєктів на карті: ${count}`;
    };

    const setActiveListItem = (propertyId) => {
      const buttons = listElement.querySelectorAll("button[data-property-id]");
      buttons.forEach((button) => {
        const id = Number.parseInt(button.dataset.propertyId || "0", 10);
        button.classList.toggle("is-active", id === propertyId);
      });
    };

    const renderList = (items) => {
      listElement.innerHTML = "";

      items.forEach((item) => {
        const listItem = document.createElement("li");
        listItem.className = "map-list-item";

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.propertyId = String(item.id);
        button.className = "map-list-button";
        button.innerHTML = `
          <div class="map-list-title">${escapeHtml(item.title || "Об'єкт")}</div>
          <div class="map-list-address">${escapeHtml(item.address || "Адреса не вказана")}</div>
          <div class="map-list-price">${formatPrice(item.price)}</div>
        `;

        button.addEventListener("click", () => {
          const marker = markerById.get(item.id);
          if (!marker) {
            return;
          }

          map.flyTo([item.lat, item.lon], 16, { duration: 0.45 });
          marker.openPopup();
          setActiveListItem(item.id);
        });

        listItem.append(button);
        listElement.append(listItem);
      });
    };

    const renderMap = (items) => {
      markerLayer.clearLayers();
      markerById.clear();

      const bounds = window.L.latLngBounds([]);
      let markerCount = 0;

      items.forEach((item) => {
        try {
          const marker = window.L.marker([item.lat, item.lon]);
          marker.bindPopup(buildPopup(item), { maxWidth: 320 });
          marker.on("click", () => setActiveListItem(item.id));
          marker.addTo(markerLayer);
          markerById.set(item.id, marker);
          bounds.extend([item.lat, item.lon]);
          markerCount += 1;
        } catch (_error) {
          // Ignore malformed points and continue rendering remaining markers.
        }
      });

      if (markerCount > 0 && bounds.isValid()) {
        map.fitBounds(bounds.pad(0.18));
      } else {
        map.setView(
          [
            Number.isFinite(defaultLat) ? defaultLat : 48.6208,
            Number.isFinite(defaultLon) ? defaultLon : 22.2879,
          ],
          Number.isFinite(defaultZoom) ? defaultZoom : 8
        );
      }

      setTotalCount(markerCount);
      if (emptyStateElement) {
        emptyStateElement.classList.toggle("hidden", markerCount > 0);
      }
    };

    let properties = extractInlineProperties(sourceElement);
    if (properties.length === 0) {
      const remote = await fetchProperties(sourceUrl);
      if (remote.length > 0) {
        properties = remote;
      }
    }

    const applyFilter = () => {
      const query = normalize(filterElement ? filterElement.value : "");

      const filtered = properties.filter((item) => {
        if (!query) {
          return true;
        }

        const haystack = `${normalize(item.title)} ${normalize(item.address)}`;
        return haystack.includes(query);
      });

      renderMap(filtered);
      renderList(filtered);

      if (emptyStateElement) {
        emptyStateElement.classList.toggle("hidden", filtered.length > 0);
      }
    };

    applyFilter();

    if (filterElement) {
      filterElement.addEventListener("input", applyFilter);
    }

    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        setActiveChoice(radio.value === "satellite" ? "satellite" : "map");
      });
    });

    window.setTimeout(() => map.invalidateSize(), 350);
  });
})();
