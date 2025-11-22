(() => {
  const API_SEARCH_URL = window.SEARCH_API_URL || "/api/properties/";
  const AUTO_DELAY = 600;

  const { search } = window.DominiumSearchAPI;
  const {
    initDropdowns,
    initLayoutToggle,
    initHeartToggle,
    renderResults,
    renderSummary,
    updateSortLabel,
    updatePerPageDisplay,
  } = window.DominiumSearchUI;

  const userIsStaff = document.body.dataset.userIsStaff === "1";
  const csrfToken = window.DominiumSearchAPI.getCsrfToken();

  let mainForm;
  let headerForm;
  let headerInput;
  let hiddenQueryInput;
  let resultsSection;
  let loader;
  let debounceTimer = null;
  let activeController = null;
  let currentParams = new URLSearchParams(window.location.search || "");
  let currentUrl = `${window.location.pathname}${window.location.search}`;

  if (!currentParams.has("sort")) {
    currentParams.set("sort", "date");
  }

  const likedIds = (() => {
    const node = document.getElementById("liked-ids-data");
    if (!node) return [];
    try {
      return JSON.parse(node.textContent || "[]");
    } catch (error) {
      console.error("Не вдалося розпарсити лайки", error);
      return [];
    }
  })();

  function collectFormParams() {
    const params = new URLSearchParams();
    const targetForm = mainForm || document.querySelector("form[data-search-form]");
    if (targetForm) {
      new FormData(targetForm).forEach((value, key) => {
        if (value !== null && value !== "") {
          params.append(key, value);
        }
      });
    }
    const sortHidden = document.getElementById("sort-hidden");
    if (sortHidden && sortHidden.value) {
      params.set("sort", sortHidden.value);
    }
    const perPageHidden = document.getElementById("per-page-hidden");
    if (perPageHidden && perPageHidden.value) {
      params.set("per_page", perPageHidden.value);
    }
    const rawRooms = params.get("rooms");
    if (rawRooms) {
      params.delete("rooms");
      params.set("rooms", rawRooms.replace(/\s+/g, ""));
    }
    params.set("page", params.get("page") || "1");
    return params;
  }

  function buildSearchMeta(params, path = window.location.pathname) {
    const query = params.toString();
    const searchUrl = `${path}${query ? `?${query}` : ""}`;
    const apiUrl = `${API_SEARCH_URL}${query ? `?${query}` : ""}`;
    return { apiUrl, searchUrl, params };
  }

  async function executeSearch(meta, { replaceHistory = true } = {}) {
    if (!resultsSection) return;
    const controller = new AbortController();
    try {
      if (activeController) {
        activeController.abort();
      }
      activeController = controller;
      resultsSection.classList.add("opacity-50", "pointer-events-none");
      if (loader) loader.classList.remove("hidden");

      const payload = await search(meta.apiUrl, meta.params, controller.signal);

      renderSummary(payload);
      renderResults(payload, meta.params, {
        resultsSection,
        likedIds,
        csrfToken,
        userIsStaff,
      });
      updateSortLabel(meta.params);
      updatePerPageDisplay(meta.params);
      if (replaceHistory) {
        history.replaceState({}, "", meta.searchUrl);
      }
      currentParams = new URLSearchParams(meta.params.toString());
      currentUrl = meta.searchUrl;
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("Search update failed:", error);
      alert("Не вдалося оновити результати. Спробуйте ще раз.");
    } finally {
      if (activeController === controller) {
        activeController = null;
      }
      if (loader) loader.classList.add("hidden");
      resultsSection.classList.remove("opacity-50", "pointer-events-none");
    }
  }

  function queueSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const params = collectFormParams();
      const meta = buildSearchMeta(params);
      executeSearch(meta);
    }, AUTO_DELAY);
  }

  function handleSearchLink(link) {
    const parsed = new URL(link.href, window.location.origin);
    const params = new URLSearchParams(parsed.search);
    if (!params.has("sort")) {
      const hiddenSort = document.getElementById("sort-hidden");
      params.set("sort", hiddenSort?.value || "date");
    }
    const meta = buildSearchMeta(params, parsed.pathname);
    executeSearch(meta);
  }

  function refreshCurrentSearch({ replaceHistory = true } = {}) {
    const params = currentParams || new URLSearchParams(window.location.search);
    const meta = buildSearchMeta(params);
    executeSearch(meta, { replaceHistory });
  }

  function bindForms() {
    mainForm = document.getElementById("main-search-form");
    headerForm = document.getElementById("header-search-form");
    headerInput = document.getElementById("q-main");
    hiddenQueryInput = document.getElementById("q-hidden");

    if (mainForm) {
      mainForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const params = collectFormParams();
        params.set("page", "1");
        executeSearch(buildSearchMeta(params));
      });
    }

    if (headerForm) {
      headerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const query = (headerInput?.value || "").trim();
        if (hiddenQueryInput) hiddenQueryInput.value = query;
        if (mainForm) {
          const mainInput = mainForm.querySelector("input[name='q']");
          if (mainInput) mainInput.value = query;
        }
        const params = collectFormParams();
        params.set("page", "1");
        executeSearch(buildSearchMeta(params));
      });
    }

    document.querySelectorAll("[data-search-link]").forEach((link) => {
      if (link.dataset.bound === "1") return;
      link.dataset.bound = "1";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        handleSearchLink(link);
      });
    });

    document.querySelectorAll("[data-search-trigger]").forEach((node) => {
      if (node.dataset.bound === "1") return;
      node.dataset.bound = "1";
      node.addEventListener("change", () => queueSearch());
      node.addEventListener("input", () => queueSearch());
    });

    const resetBtn = document.getElementById("reset-filters-btn");
    if (resetBtn && mainForm) {
      resetBtn.addEventListener("click", (event) => {
        event.preventDefault();
        mainForm.reset();
        const params = collectFormParams();
        params.delete("property_type");
        params.set("page", "1");
        executeSearch(buildSearchMeta(params));
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    resultsSection = document.getElementById("property-results");
    loader = document.getElementById("search-loading-indicator");
    initDropdowns(document);
    initLayoutToggle();
    initHeartToggle(document);
    bindForms();

    const params = collectFormParams();
    updateSortLabel(params);
    updatePerPageDisplay(params);
  });

  window.DominiumSearch = {
    refresh: refreshCurrentSearch,
    queueSearch,
  };
})();
