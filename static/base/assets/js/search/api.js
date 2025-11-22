(() => {
  const getCsrfToken = () =>
    document.getElementById("form-csrf-token")?.value ||
    document.querySelector("input[name='csrfmiddlewaretoken']")?.value ||
    "";

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...options.headers,
      },
      ...options,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text || "error"}`);
    }
    return response.json();
  }

  function buildSearchUrl(baseUrl, params) {
    const query = params.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  }

  async function search(apiBaseUrl, params, signal) {
    const url = buildSearchUrl(apiBaseUrl, params);
    return fetchJson(url, { signal });
  }

  async function toggleLike(propertyId) {
    const csrf = getCsrfToken();
    return fetchJson(`/like/${propertyId}/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrf,
      },
    });
  }

  async function toggleFeatured(propertyId, desired) {
    const csrf = getCsrfToken();
    const formData = new URLSearchParams();
    if (typeof desired !== "undefined") {
      formData.append("featured", desired ? "true" : "false");
    }
    return fetchJson(`/properties/${propertyId}/toggle-featured/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrf,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
  }

  window.DominiumSearchAPI = {
    search,
    toggleLike,
    toggleFeatured,
    getCsrfToken,
  };
})();
