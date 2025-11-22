(() => {
  const AUTO_LAYOUT_CLASSES = {
    grid: ["md:grid-cols-2", "lg:grid-cols-3"],
    listRemove: ["md:grid-cols-2", "lg:grid-cols-3"],
    listAdd: ["md:grid-cols-1", "lg:grid-cols-1"],
  };

  const SORT_LABELS = {
    date: "За датою додавання",
    price_asc: "За ціною (від дешевих)",
    price_desc: "За ціною (від дорогих)",
    area_asc: "За площею (від менших)",
    area_desc: "За площею (від більших)",
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatPrice = (value) =>
    value == null
      ? "Ціна за запитом"
      : new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(value);

  function closeAllDropdowns() {
    document
      .querySelectorAll("[data-dropdown] [data-dropdown-menu]")
      .forEach((menu) => menu.classList.add("hidden"));
  }

  function initDropdowns(scope = document) {
    scope.querySelectorAll("[data-dropdown]").forEach((wrapper) => {
      const trigger = wrapper.querySelector(".dropdown-trigger");
      const menu = wrapper.querySelector("[data-dropdown-menu]");
      if (!trigger || !menu) return;
      if (trigger.dataset.dropdownBound !== "1") {
        trigger.dataset.dropdownBound = "1";
        trigger.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const willOpen = menu.classList.contains("hidden");
          closeAllDropdowns();
          if (willOpen) {
            menu.classList.remove("hidden");
          }
        });
      }
      if (menu.dataset.dropdownBound !== "1") {
        menu.dataset.dropdownBound = "1";
        menu.addEventListener("click", (event) => event.stopPropagation());
      }
    });

    if (!document.__dominiumDropdownListenerAttached) {
      document.__dominiumDropdownListenerAttached = true;
      document.addEventListener("click", closeAllDropdowns);
    }
  }

  function initHeartToggle(root = document) {
    root.querySelectorAll(".ri-heart-line, .ri-heart-fill").forEach((icon) => {
      if (icon.dataset.bound === "1") return;
      icon.dataset.bound = "1";
      icon.addEventListener("click", () => {
        const isActive = icon.classList.contains("ri-heart-fill");
        icon.classList.toggle("ri-heart-line", isActive);
        icon.classList.toggle("ri-heart-fill", !isActive);
        icon.classList.toggle("text-red-500", !isActive);
      });
    });
  }

  function initLayoutToggle(force = false) {
    const gridIcon = document.querySelector(".ri-layout-grid-line");
    const listIcon = document.querySelector(".ri-list-check-2");
    if (!gridIcon || !listIcon) return;

    const gridButton = gridIcon.parentElement;
    const listButton = listIcon.parentElement;
    const resultsGrid = document.querySelector(".grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3");
    if (!gridButton || !listButton || !resultsGrid) return;

    const cards = () => document.querySelectorAll(".grid-cols-1 > div");

    function activateGrid() {
      gridButton.classList.add("bg-blue-50", "text-primary");
      gridButton.classList.remove("bg-white", "text-gray-500");
      listButton.classList.remove("bg-blue-50", "text-primary");
      listButton.classList.add("bg-white", "text-gray-500");
      resultsGrid.classList.add(...AUTO_LAYOUT_CLASSES.grid);
      resultsGrid.classList.remove(...AUTO_LAYOUT_CLASSES.listAdd);
      cards().forEach((card) => {
        card.classList.remove("flex", "flex-row");
        const img = card.querySelector(".relative");
        const content = card.querySelector(".p-4");
        if (img) img.classList.remove("w-1/3");
        if (content) content.classList.remove("w-2/3");
      });
    }

    function activateList() {
      listButton.classList.add("bg-blue-50", "text-primary");
      listButton.classList.remove("bg-white", "text-gray-500");
      gridButton.classList.remove("bg-blue-50", "text-primary");
      gridButton.classList.add("bg-white", "text-gray-500");
      resultsGrid.classList.add(...AUTO_LAYOUT_CLASSES.listAdd);
      resultsGrid.classList.remove(...AUTO_LAYOUT_CLASSES.grid);
      cards().forEach((card) => {
        card.classList.add("flex", "flex-row");
        const img = card.querySelector(".relative");
        const content = card.querySelector(".p-4");
        if (img) img.classList.add("w-1/3");
        if (content) content.classList.add("w-2/3");
      });
    }

    if (force) {
      gridButton.replaceWith(gridButton.cloneNode(true));
      listButton.replaceWith(listButton.cloneNode(true));
    }

    gridButton.addEventListener("click", activateGrid);
    listButton.addEventListener("click", activateList);
  }

  function buildPropertyCard(property, { likedIds, csrfToken, userIsStaff }) {
    const absoluteUrl =
      property.absolute_url || `${window.location.origin}/property/${property.slug}/`;
    const imageUrl =
      (property.main_image && property.main_image.url) ||
      (property.images && property.images[0] && property.images[0].url) ||
      "https://via.placeholder.com/400x300";
    const priceText = formatPrice(property.price);
    const dealName = (property.deal_type && property.deal_type.name) || "Угода";
    const dealKey = (dealName || "").toLowerCase().replace(/\s+/g, "");
    const dealClass =
      dealKey === "оренда"
        ? "bg-creamBeige"
        : dealKey === "продаж"
        ? "bg-coolSage"
        : "bg-red-200";
    const propertyTypeName =
      (property.property_type && property.property_type.name) || "Тип не вказано";
    const areaLabel = property.area ? `${property.area} м²` : "";
    const roomsLabel = property.rooms ? `${property.rooms} кімнати` : "";
    const liked = likedIds.includes(property.id);
    const likeIconClass = liked ? "ri-heart-fill text-red-500" : "ri-heart-line text-coolSage";
    const featuredButton = userIsStaff
      ? `<button type="button" class="featured-toggle w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition" data-featured-toggle data-property-id="${property.id}" data-featured="${property.featured_homepage ? "true" : "false"}" title="Керування блоком Топ-3">
          <i class="${property.featured_homepage ? "ri-star-fill text-yellow-500" : "ri-star-line text-coolSage"}"></i>
        </button>`
      : "";

    return `
      <div class="w-full max-w-[480px] mx-auto">
        <div class="bg-white rounded-[8px] shadow-lg overflow-hidden flex flex-col h-full">
          <div class="relative h-56">
            <a href="${escapeHtml(absoluteUrl)}">
              <img src="${escapeHtml(imageUrl)}" loading="lazy" decoding="async" class="w-full h-56 object-cover" alt="${escapeHtml(property.title)}" />
            </a>
            <div class="absolute top-3 right-3 flex gap-2 z-10">
              <input type="hidden" id="csrf-token" value="${escapeHtml(csrfToken)}" />
              <button class="like-button w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full transition" data-property-id="${property.id}">
                <i class="${likeIconClass}"></i>
              </button>
              ${featuredButton}
              <div class="relative" data-share-container>
                <button type="button" class="w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition" data-share-toggle data-share-url="${escapeHtml(absoluteUrl)}" data-share-title="${escapeHtml(property.title)}">
                  <i class="ri-share-forward-line text-coolSage"></i>
                </button>
                <div class="share-menu absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg py-2 hidden z-20" data-share-menu>
                  <button type="button" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-share-action="copy">
                    <i class="ri-file-copy-line text-base"></i> Скопіювати
                  </button>
                  <button type="button" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-share-action="telegram">
                    <i class="ri-send-plane-line text-base"></i> Telegram
                  </button>
                  <button type="button" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-share-action="viber">
                    <i class="ri-message-2-line text-base"></i> Viber
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="p-6 flex flex-col flex-grow group relative">
            <h3 class="text-xl font-ermilov text-primary transition duration-200">
              ${escapeHtml(priceText)}${dealKey === "оренда" ? " /міс" : ""}
            </h3>
            <p class="text-coolSage font-fixel">${escapeHtml(property.address)}</p>
            <div class="flex items-center space-x-4 mt-3 text-gray-600">
              <span class="flex text-coolSage font-fixel items-center">
                <i class="ri-ruler-line mr-1"></i> ${escapeHtml(propertyTypeName)}
              </span>
              <span class="flex text-coolSage font-fixel items-center">
                <i class="ri-ruler-line mr-1"></i> ${escapeHtml(areaLabel)}
              </span>
              ${
                roomsLabel
                  ? `<span class="flex text-coolSage font-fixel items-center"><i class="ri-home-line mr-1"></i> ${escapeHtml(roomsLabel)}</span>`
                  : ""
              }
            </div>
            <div class="mt-auto pt-4 flex items-center gap-x-3">
              <a href="${escapeHtml(absoluteUrl)}" class="bg-white text-deepOcean font-fixel text-sm px-4 py-2 rounded-full h-10 shadow-[inset_0_0_0_1px] shadow-deepOcean/20 flex items-center justify-center">
                Докладніше
              </a>
              <span class="text-white px-8 py-2 rounded-full text-sm h-10 font-fixel ${dealClass}">
                ${escapeHtml(dealName)}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPagination(payload, params) {
    if (!payload.total_pages || payload.total_pages <= 1) return "";
    const baseParams = new URLSearchParams(params.toString());
    baseParams.delete("page");
    const basePath = window.location.pathname;

    const buildHref = (page) => {
      const clone = new URLSearchParams(baseParams.toString());
      clone.set("page", page);
      const query = clone.toString();
      return `${basePath}${query ? `?${query}` : ""}`;
    };

    const pieces = [];
    const prevDisabled = payload.page <= 1;
    if (prevDisabled) {
      pieces.push(
        '<span class="py-2 px-3 border border-gray-200 bg-gray-100 text-gray-400 rounded-l-md"><i class="ri-arrow-left-s-line"></i></span>'
      );
    } else {
      pieces.push(
        `<a href="${escapeHtml(
          buildHref(payload.page - 1)
        )}" class="py-2 px-3 border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 rounded-l-md" data-search-link="1"><i class="ri-arrow-left-s-line"></i></a>`
      );
    }

    const start = Math.max(1, payload.page - 2);
    const end = Math.min(payload.total_pages, payload.page + 2);
    for (let num = start; num <= end; num += 1) {
      if (num === payload.page) {
        pieces.push(
          `<span class="py-2 px-4 border-t border-b border-gray-300 bg-primary text-white">${num}</span>`
        );
      } else {
        pieces.push(
          `<a href="${escapeHtml(
            buildHref(num)
          )}" class="py-2 px-4 border-t border-b border-gray-300 bg-white text-gray-700 hover:bg-gray-50" data-search-link="1">${num}</a>`
        );
      }
    }

    if (payload.page >= payload.total_pages) {
      pieces.push(
        '<span class="py-2 px-3 border border-gray-200 bg-gray-100 text-gray-400 rounded-r-md"><i class="ri-arrow-right-s-line"></i></span>'
      );
    } else {
      pieces.push(
        `<a href="${escapeHtml(
          buildHref(payload.page + 1)
        )}" class="py-2 px-3 border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 rounded-r-md" data-search-link="1"><i class="ri-arrow-right-s-line"></i></a>`
      );
    }

    return `<div class="flex justify-center mt-8"><nav class="inline-flex rounded-md shadow" aria-label="Пагінація">${pieces.join(
      ""
    )}</nav></div>`;
  }

  function renderSummary(payload) {
    const countNode = document.querySelector("#property-sort-wrapper .font-ermilov");
    if (countNode) {
      const shownCount = payload.count || 0;
      countNode.textContent = `Знайдено ${shownCount} об'єктів`;
    }
  }

  function updateSortLabel(params) {
    const sortKey = params.get("sort") || "date";
    const sortNode = document.getElementById("sort-selected");
    if (sortNode) {
      sortNode.textContent = SORT_LABELS[sortKey] || "За замовчуванням";
    }
    const hiddenSort = document.getElementById("sort-hidden");
    if (hiddenSort) {
      hiddenSort.value = sortKey;
    }
  }

  function updatePerPageDisplay(params) {
    const perPageValue = params.get("per_page") || params.get("page_size") || "";
    const perPageNode = document.querySelector("[data-per-page-display]");
    if (perPageNode && perPageValue) {
      perPageNode.textContent = perPageValue;
    }
    const hiddenPerPage = document.getElementById("per-page-hidden");
    if (hiddenPerPage && perPageValue) {
      hiddenPerPage.value = perPageValue;
    }
  }

  function renderResults(payload, params, opts) {
    const { resultsSection, likedIds, csrfToken, userIsStaff } = opts;
    if (!resultsSection) return;

    if (!payload.results || !payload.results.length) {
      resultsSection.innerHTML = `
        <div class="container mx-auto px-4 py-6">
          <p class="text-center text-white">Об'єкти не знайдено за вказаними параметрами.</p>
        </div>
      `;
      return;
    }

    const cardsHtml = payload.results
      .map((property) => buildPropertyCard(property, { likedIds, csrfToken, userIsStaff }))
      .join("");
    const gridHtml = `
      <div class="container mx-auto px-4 py-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
          ${cardsHtml}
        </div>
      </div>
    `;
    const paginationHtml = renderPagination(payload, params);
    resultsSection.innerHTML = `${gridHtml}${paginationHtml}`;
    initLayoutToggle(true);
    initHeartToggle(resultsSection);
    if (window.initShareContainers) {
      window.initShareContainers(resultsSection);
    }
    if (window.initLikeButtons) {
      window.initLikeButtons(resultsSection);
    }
    if (window.initFeaturedToggles) {
      window.initFeaturedToggles(resultsSection);
    }
  }

  window.DominiumSearchUI = {
    initDropdowns,
    initLayoutToggle,
    initHeartToggle,
    renderResults,
    renderSummary,
    updateSortLabel,
    updatePerPageDisplay,
  };
})();
