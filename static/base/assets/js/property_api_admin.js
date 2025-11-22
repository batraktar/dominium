(function (window, document) {
  const cfg = window.DOMINIUM_ADMIN_CONFIG || {};
  const {
    API_URL,
    BULK_ACTION_URL,
    PROPERTY_TYPES_URL,
    DEAL_TYPES_URL,
    FEATURES_URL,
    HIGHLIGHT_SETTINGS_URL,
    IMPORT_HTML_URL,
    IMPORT_LINK_URL,
    PROPERTY_IMAGES_URL_TEMPLATE,
    PROPERTY_IMAGE_DETAIL_URL_TEMPLATE,
  } = cfg;

  if (!API_URL) {
    console.error('Admin API config is missing.');
    return;
  }

const tableBody = document.getElementById("properties-body");
    const refreshBtn = document.getElementById("refresh-properties");
    const startCreateBtn = document.getElementById("start-create");
    const formNode = document.getElementById("property-form");
    const formTitle = document.getElementById("form-title");
    const statusNode = document.getElementById("form-status");
    const deleteBtn = document.getElementById("delete-property");
    const submitBtn = document.getElementById("submit-button");
    const modal = document.getElementById("property-modal");
    const closeModalBtn = document.getElementById("close-modal");
    const cancelModalBtn = document.getElementById("cancel-modal");
    const importBtn = document.getElementById("open-import");
    const importModal = document.getElementById("import-modal");
    const importForm = document.getElementById("import-form");
    const importStatusNode = document.getElementById("import-status");
    const importProgressNode = document.getElementById("import-progress");
    const importFilesInput = document.getElementById("import-files");
    const importUrlsTextarea = document.getElementById("import-urls");
    const importGeocodeCheckbox = document.getElementById("import-geocode");
    const closeImportModalBtn = document.getElementById("close-import-modal");
    const cancelImportModalBtn = document.getElementById("cancel-import-modal");
    const imageGallery = document.getElementById("image-gallery");
    const imageUploadInput = document.getElementById("image-upload");
    const imageUploadStatus = document.getElementById("image-upload-status");
    if (imageUploadInput) {
      imageUploadInput.setAttribute("disabled", "true");
    }

    const filterSearchInput = document.getElementById("filter-search");
    const filterPropertyTypeSelect = document.getElementById("filter-property-type");
    const filterDealTypeSelect = document.getElementById("filter-deal-type");
    const filterFeaturedSelect = document.getElementById("filter-featured");
    const filterStatusSelect = document.getElementById("filter-status");
    const pageSizeSelect = document.getElementById("page-size");
    const resetFiltersBtn = document.getElementById("reset-filters");
    const paginationInfo = document.getElementById("pagination-info");
    const prevPageBtn = document.getElementById("prev-page");
    const nextPageBtn = document.getElementById("next-page");
    const tableStatusNode = document.getElementById("table-status");
    const bulkToolbar = document.getElementById("bulk-toolbar");
    const bulkCountNode = document.getElementById("bulk-count");
    const bulkArchiveBtn = document.getElementById("bulk-archive");
    const bulkRestoreBtn = document.getElementById("bulk-restore");
    const bulkDeleteBtn = document.getElementById("bulk-delete");
    const selectAllCheckbox = document.getElementById("select-all");
    let searchDebounce = null;
    let bulkInProgress = false;

    const highlightForm = document.getElementById("highlight-settings-form");
    const highlightStatusNode = document.getElementById("highlight-status");
    const highlightPropertyTypesContainer = document.getElementById("highlight-property-types");
    const highlightResetBtn = document.getElementById("highlight-reset");
    const openHighlightBtn = document.getElementById("open-highlight");
    const highlightModal = document.getElementById("highlight-modal");
    const closeHighlightModalBtn = document.getElementById("close-highlight-modal");
    const cancelHighlightModalBtn = document.getElementById("cancel-highlight-modal");

    const field = (id) => document.getElementById(id);

    const state = {
      propertyTypes: [],
      dealTypes: [],
      features: [],
      highlightSettings: null,
      editingId: null,
    };

    const tableState = {
      page: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 0,
      ordering: "-created_at",
      filters: {
        search: "",
        propertyType: "",
        dealType: "",
        featured: "",
        status: "active",
      },
    };

    const selectionState = {
      ids: new Set(),
    };

    const imageState = {
      propertyId: null,
      uploading: false,
    };

    const buildPropertyImagesUrl = (propertyId) =>
      PROPERTY_IMAGES_URL_TEMPLATE.replace("/0/", `/${propertyId}/`);

    const buildPropertyImageDetailUrl = (imageId) =>
      PROPERTY_IMAGE_DETAIL_URL_TEMPLATE.replace("/0/", `/${imageId}/`);

    clearImageGallery();

    function toggleModal(show) {
      if (!modal) return;
      modal.classList.toggle("hidden", !show);
      document.body.classList.toggle("overflow-hidden", show);
    }

    function toggleHighlightModal(show) {
      if (!highlightModal) return;
      highlightModal.classList.toggle("hidden", !show);
      document.body.classList.toggle("overflow-hidden", show);
      if (!show) {
        clearHighlightStatus();
      }
    }

    function toggleImportModal(show) {
      if (!importModal) return;
      importModal.classList.toggle("hidden", !show);
      document.body.classList.toggle("overflow-hidden", show);
      if (!show) {
        clearImportStatus();
      }
    }

    function setTableStatus(message, type = "info") {
      if (!tableStatusNode) return;
      tableStatusNode.textContent = message;
      tableStatusNode.classList.remove(
        "hidden",
        "bg-green-50",
        "bg-red-50",
        "bg-gray-50",
        "text-green-800",
        "text-red-800",
        "text-gray-700",
        "border-green-200",
        "border-red-200",
        "border-gray-200"
      );
      const variants = {
        success: ["bg-green-50", "text-green-800", "border-green-200"],
        error: ["bg-red-50", "text-red-800", "border-red-200"],
        info: ["bg-gray-50", "text-gray-700", "border-gray-200"],
      };
      const classes = variants[type] || variants.info;
      tableStatusNode.classList.add(...classes);
    }

    function clearTableStatus() {
      if (!tableStatusNode) return;
      tableStatusNode.classList.add("hidden");
      tableStatusNode.textContent = "";
      tableStatusNode.classList.remove(
        "bg-green-50",
        "bg-red-50",
        "bg-gray-50",
        "text-green-800",
        "text-red-800",
        "text-gray-700",
        "border-green-200",
        "border-red-200",
        "border-gray-200"
      );
    }

    function updateBulkToolbar() {
      if (!bulkToolbar) return;
      const count = selectionState.ids.size;
      if (bulkCountNode) {
        bulkCountNode.textContent = count;
      }
      bulkToolbar.classList.toggle("hidden", count === 0);
      if (count === 0) {
        return;
      }
      const isArchiveView = tableState.filters.status === "archived";
      if (bulkArchiveBtn) {
        bulkArchiveBtn.classList.toggle("hidden", isArchiveView);
        bulkArchiveBtn.disabled = false;
      }
      if (bulkRestoreBtn) {
        bulkRestoreBtn.classList.toggle("hidden", !isArchiveView);
        bulkRestoreBtn.disabled = false;
      }
      if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = false;
      }
    }

    function setBulkButtonsDisabled(disabled) {
      [bulkArchiveBtn, bulkRestoreBtn, bulkDeleteBtn].forEach((button) => {
        if (button) {
          button.disabled = disabled;
        }
      });
    }

    function clearSelection() {
      selectionState.ids.clear();
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      }
      updateBulkToolbar();
    }

    function syncSelectAllCheckbox() {
      if (!selectAllCheckbox) return;
      const checkboxes = tableBody.querySelectorAll(".row-select");
      const totalVisible = checkboxes.length;
      if (totalVisible === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
      }
      let selectedVisible = 0;
      checkboxes.forEach((checkbox) => {
        const id = Number(checkbox.dataset.id);
        if (selectionState.ids.has(id)) {
          selectedVisible += 1;
        }
      });
      selectAllCheckbox.checked =
        selectedVisible > 0 && selectedVisible === totalVisible;
      selectAllCheckbox.indeterminate =
        selectedVisible > 0 && selectedVisible < totalVisible;
    }

    function setStatus(message, type = "info") {
      if (!statusNode) return;
      statusNode.textContent = message;
      statusNode.classList.remove("hidden", "bg-green-100", "bg-red-100", "bg-yellow-100", "text-green-800", "text-red-800", "text-yellow-800");
      const map = {
        success: ["bg-green-100", "text-green-800"],
        error: ["bg-red-100", "text-red-800"],
        info: ["bg-yellow-100", "text-yellow-800"],
      };
      (map[type] || map.info).forEach((cls) => statusNode.classList.add(cls));
    }

    function clearStatus() {
      statusNode?.classList.add("hidden");
      statusNode.textContent = "";
    }

    function setImportStatus(message, type = "info") {
      if (!importStatusNode) return;
      importStatusNode.textContent = message;
      importStatusNode.classList.remove("hidden", "bg-green-100", "bg-red-100", "bg-yellow-100", "text-green-800", "text-red-800", "text-yellow-800");
      const map = {
        success: ["bg-green-100", "text-green-800"],
        error: ["bg-red-100", "text-red-800"],
        info: ["bg-yellow-100", "text-yellow-800"],
      };
      (map[type] || map.info).forEach((cls) => importStatusNode.classList.add(cls));
    }

    function clearImportStatus() {
      if (!importStatusNode) return;
      importStatusNode.classList.add("hidden");
      importStatusNode.textContent = "";
      if (importProgressNode) {
        importProgressNode.classList.add("hidden");
        importProgressNode.textContent = "";
      }
    }

    function showImportProgress(total) {
      if (!importProgressNode) return;
      importProgressNode.textContent = total ? `Завантаження (0/${total})` : "Працюємо…";
      importProgressNode.classList.remove("hidden");
    }

    function updateImportProgress(count, total, label = "") {
      if (!importProgressNode) return;
      const base = total ? `${count}/${total}` : `${count}`;
      importProgressNode.textContent = `Опрацьовано ${base}${label ? ` • ${label}` : ""}`;
    }

    function setHighlightStatus(message, type = "info") {
      if (!highlightStatusNode) return;
      highlightStatusNode.textContent = message;
      highlightStatusNode.classList.remove("hidden", "bg-green-100", "bg-red-100", "bg-yellow-100", "text-green-800", "text-red-800", "text-yellow-800");
      const map = {
        success: ["bg-green-100", "text-green-800"],
        error: ["bg-red-100", "text-red-800"],
        info: ["bg-yellow-100", "text-yellow-800"],
      };
      (map[type] || map.info).forEach((cls) => highlightStatusNode.classList.add(cls));
    }

    function clearHighlightStatus() {
      if (!highlightStatusNode) return;
      highlightStatusNode.classList.add("hidden");
      highlightStatusNode.textContent = "";
    }

    function resetForm() {
      formNode.reset();
      state.editingId = null;
      field("property-id").value = "";
      formTitle.textContent = "Створення нового об’єкта";
      deleteBtn.classList.add("hidden");
      submitBtn.innerHTML = '<i class="ri-save-line"></i> Створити';
      clearStatus();
      const featuredCheckbox = field("property-featured");
      if (featuredCheckbox) {
        featuredCheckbox.checked = false;
      }
      document.querySelectorAll("#features-list input[type='checkbox']").forEach((input) => {
        input.checked = false;
      });
      clearImageGallery();
    }

    function fillSelect(selectNode, items, placeholder) {
      if (!selectNode) return;
      selectNode.innerHTML = `<option value="">${placeholder}</option>`;
      items.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.name;
        selectNode.appendChild(option);
      });
    }

    function buildPropertyQuery() {
      const params = new URLSearchParams();
      params.set("page", tableState.page);
      params.set("page_size", tableState.pageSize);
      if (tableState.ordering) {
        params.set("ordering", tableState.ordering);
      }
      const { search, propertyType, dealType, featured, status } = tableState.filters;
      if (search) params.set("q", search);
      if (propertyType) params.set("property_type", propertyType);
      if (dealType) params.set("deal_type", dealType);
      if (featured) params.set("featured", featured);
      if (status) params.set("status", status);
      return params.toString();
    }

    function updatePaginationControls() {
      if (paginationInfo) {
        paginationInfo.textContent = `Сторінка ${tableState.page} із ${tableState.totalPages} • ${tableState.totalCount} об’єктів`;
      }
      if (prevPageBtn) {
        prevPageBtn.disabled = tableState.page <= 1;
      }
      if (nextPageBtn) {
        nextPageBtn.disabled = tableState.page >= tableState.totalPages;
      }
    }

    function renderHighlightPropertyTypes(selectedIds = []) {
      if (!highlightPropertyTypesContainer) return;
      const selectedSet = new Set(selectedIds || []);
      highlightPropertyTypesContainer.innerHTML = "";
      if (!state.propertyTypes.length) {
        highlightPropertyTypesContainer.innerHTML = '<p class="text-sm text-gray-500">Немає доступних типів нерухомості.</p>';
        return;
      }
      state.propertyTypes.forEach((item) => {
        const label = document.createElement("label");
        label.className = "flex items-center gap-2 rounded-[9px] border border-gray-200 px-3 py-2 text-sm";
        const isChecked = selectedSet.has(item.id);
        label.innerHTML = `
          <input type="checkbox" value="${item.id}" class="highlight-type-checkbox accent-deepOcean" ${isChecked ? "checked" : ""} />
          <span>${item.name}</span>
        `;
        highlightPropertyTypesContainer.appendChild(label);
      });
    }

    function populateHighlightForm(data) {
      if (!highlightForm || !data) return;
      field("highlight-limit").value = data.limit ?? 3;
      field("highlight-price-min").value = data.price_min ?? "";
      field("highlight-price-max").value = data.price_max ?? "";
      field("highlight-region").value = data.region_keyword || "";
      renderHighlightPropertyTypes(data.property_type_ids || []);
    }

    function collectHighlightPayload() {
      const payload = {
        limit: field("highlight-limit")?.value ?? null,
        price_min: field("highlight-price-min")?.value ?? null,
        price_max: field("highlight-price-max")?.value ?? null,
        region_keyword: field("highlight-region")?.value ?? "",
        property_type_ids: Array.from(document.querySelectorAll(".highlight-type-checkbox:checked")).map((input) => Number(input.value)),
      };
      if (payload.price_min === "" || payload.price_min === null) {
        payload.price_min = null;
      }
      if (payload.price_max === "" || payload.price_max === null) {
        payload.price_max = null;
      }
      return payload;
    }

    async function loadHighlightSettings() {
      if (!highlightForm) return;
      clearHighlightStatus();
      try {
        const response = await fetchJSON(HIGHLIGHT_SETTINGS_URL);
        state.highlightSettings = response.result || null;
        populateHighlightForm(state.highlightSettings || {});
      } catch (error) {
        setHighlightStatus(error.message, "error");
      }
    }

    async function fetchJSON(url, options = {}) {
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        ...options,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Помилка ${response.status}: ${text}`);
      }
      return response.status === 204 ? null : response.json();
    }

    async function loadDictionaries() {
      try {
        const [propertyTypes, dealTypes, features] = await Promise.all([
          fetchJSON(PROPERTY_TYPES_URL),
          fetchJSON(DEAL_TYPES_URL),
          fetchJSON(FEATURES_URL),
        ]);

        state.propertyTypes = propertyTypes.results || [];
        state.dealTypes = dealTypes.results || [];
        state.features = features.results || [];

        fillSelect(field("property-type"), state.propertyTypes, "Оберіть тип");
        fillSelect(field("deal-type"), state.dealTypes, "Оберіть угоду");
        fillSelect(filterPropertyTypeSelect, state.propertyTypes, "Усі типи");
        fillSelect(filterDealTypeSelect, state.dealTypes, "Усі угоди");
        renderHighlightPropertyTypes(state.highlightSettings?.property_type_ids || []);
        if (pageSizeSelect) {
          pageSizeSelect.value = String(tableState.pageSize);
        }
        if (filterStatusSelect) {
          filterStatusSelect.value = tableState.filters.status;
        }

        const featuresList = document.getElementById("features-list");
        featuresList.innerHTML = "";
        if (state.features.length === 0) {
          featuresList.innerHTML = '<p class="text-sm text-gray-500">Немає характеристик.</p>';
        } else {
          state.features.forEach((feature) => {
            const wrapper = document.createElement("label");
            wrapper.className = "flex items-center gap-2 rounded-[9px] border border-gray-200 px-3 py-2 text-sm";

            wrapper.innerHTML = `
              <input type="checkbox" value="${feature.id}" class="feature-checkbox accent-deepOcean" />
              <span>${feature.name}</span>
            `;
            featuresList.appendChild(wrapper);
          });
        }
      } catch (error) {
        setStatus(error.message, "error");
      }
    }

    function renderProperties(rows) {
      tableBody.innerHTML = "";
      if (!rows || rows.length === 0) {
        const tr = document.createElement("tr");
        const message =
          tableState.filters.status === "archived"
            ? "В архіві поки немає жодного об’єкта."
            : "Об’єктів не знайдено за вказаними параметрами.";
        tr.innerHTML = `<td colspan="9" class="px-4 py-6 text-center text-gray-500">${message}</td>`;
        tableBody.appendChild(tr);
        syncSelectAllCheckbox();
        if (selectAllCheckbox) {
          selectAllCheckbox.disabled = true;
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
        }
        return;
      }

      rows.forEach((item) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 transition";
        const formattedPrice = item.price != null ? new Intl.NumberFormat("uk-UA").format(item.price) : "—";
        const statusBadge = item.is_archived
          ? '<span class="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"><i class="ri-archive-stack-line"></i> Архів</span>'
          : "";
        const imagePreviewUrl = item.main_image?.url || item.images?.[0]?.url || "";
        tr.innerHTML = `
          <td class="px-4 py-3 text-center" data-label="Фото">
            <img class="table-thumb mx-auto" src="${imagePreviewUrl || 'https://via.placeholder.com/120x90?text=Фото'}" alt="Фото" />
          </td>
          <td class="px-4 py-3 align-top" data-label="Вибір">
            <span class="cell-label">Вибір</span>
            <input type="checkbox" class="row-select accent-deepOcean" data-id="${item.id}" />
          </td>
          <td class="px-4 py-3 font-medium text-gray-900" data-label="Назва">
            <span class="cell-label">Назва</span>
            ${item.title || "—"}${statusBadge}
          </td>
          <td class="px-4 py-3 text-gray-700" data-label="Адреса">
            <span class="cell-label">Адреса</span>
            ${item.address || "—"}
          </td>
          <td class="px-4 py-3 text-gray-700" data-label="Ціна">
            <span class="cell-label">Ціна</span>
            ${formattedPrice}
          </td>
          <td class="px-4 py-3 text-gray-700" data-label="Тип">
            <span class="cell-label">Тип</span>
            ${item.property_type?.name || "—"}
          </td>
          <td class="px-4 py-3 text-gray-700" data-label="Угода">
            <span class="cell-label">Угода</span>
            ${item.deal_type?.name || "—"}
          </td>
        <td class="px-4 py-3 text-center" data-label="Топ">
          <span class="cell-label">Топ</span>
          ${
            item.featured_homepage
                ? '<span class="inline-flex items-center gap-1 text-green-600"><i class="ri-star-smile-line"></i> Так</span>'
                : '<span class="text-gray-400">Ні</span>'
            }
          </td>
         <td class="px-4 py-3 text-right text-sm" data-label="Дії">
           <span class="cell-label">Дії</span>
            <button
              data-id="${item.id}"
              class="edit-property inline-flex items-center gap-2 px-3 py-1.5 bg-coolSage text-white rounded-[9px] hover:bg-coolSage/90 transition"
            >
              <i class="ri-edit-2-line"></i>
              Редагувати
            </button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
      syncSelectAllCheckbox();
      if (selectAllCheckbox) {
        selectAllCheckbox.disabled = false;
      }
    }

    async function handleImageGalleryClick(event) {
      const button = event.target.closest("[data-image-action]");
      if (!button) return;
      const action = button.dataset.imageAction;
      const imageId = button.dataset.imageId;
      if (!imageState.propertyId || !imageId) return;
      if (action === "set-main") {
        try {
          await fetchJSON(buildPropertyImageDetailUrl(imageId), {
            method: "PATCH",
            body: JSON.stringify({ is_main: true }),
          });
          await loadPropertyImages(imageState.propertyId);
        } catch (error) {
          setImageGalleryMessage("Не вдалося зробити фото головним.");
        }
      } else if (action === "delete") {
        try {
          await fetch(buildPropertyImageDetailUrl(imageId), {
            method: "DELETE",
          });
          await loadPropertyImages(imageState.propertyId);
        } catch (error) {
          setImageGalleryMessage("Не вдалося видалити фото.");
        }
      }
    }

    async function uploadPropertyImages(files) {
      if (!imageState.propertyId || !files.length) {
        return;
      }
      if (imageUploadStatus) {
        imageUploadStatus.textContent = "Завантаження фото...";
      }
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      try {
        const response = await fetch(buildPropertyImagesUrl(imageState.propertyId), {
          method: "POST",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "include",
          body: formData,
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "upload failed");
        }
        await loadPropertyImages(imageState.propertyId);
        if (imageUploadStatus) {
          imageUploadStatus.textContent = "Фото успішно додано.";
        }
      } catch (error) {
        console.error(error);
        if (imageUploadStatus) {
          imageUploadStatus.textContent = "Не вдалося додати фото.";
        }
      } finally {
        if (imageUploadInput) {
          imageUploadInput.value = "";
        }
      }
    }

    async function syncImageOrder() {
      if (!imageState.propertyId || !imageGallery) {
        return;
      }
      const ids = Array.from(imageGallery.querySelectorAll(".image-thumb")).map(
        (node) => Number(node.dataset.imageId)
      );
      if (!ids.length) return;
      try {
        const response = await fetch(buildPropertyImagesReorderUrl(imageState.propertyId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ order: ids }),
        });
        if (!response.ok) {
          throw new Error("Не вдалося зберегти порядок");
        }
      } catch (error) {
        console.error(error);
      }
    }

    function setImageGalleryMessage(message) {
      if (!imageGallery) return;
      imageGallery.innerHTML = `<p class="text-sm text-gray-500">${message}</p>`;
    }

    function renderImageGallery(images = []) {
      if (!imageGallery) return;
      if (!images.length) {
        setImageGalleryMessage("Фото не додано.");
        return;
      }
      imageGallery.innerHTML = "";
      images.forEach((image) => {
        const card = document.createElement("div");
        card.className = "image-thumb relative flex flex-col";
        card.innerHTML = `
          <img src="${image.url}" alt="Фото ${image.id}" />
          ${image.is_main ? '<span class="main-label">Головне</span>' : ""}
          <div class="thumb-buttons">
            <button
              type="button"
              class="inline-flex justify-center items-center text-xs text-white bg-deepOcean hover:bg-deepOcean/90"
              data-image-action="set-main"
              data-image-id="${image.id}"
            >
              Головне
            </button>
            <button
              type="button"
              class="inline-flex justify-center items-center text-xs text-white bg-red-500 hover:bg-red-500/90"
              data-image-action="delete"
              data-image-id="${image.id}"
            >
              Видалити
            </button>
          </div>
        `;
        imageGallery.appendChild(card);
      });
    }

    function clearImageGallery() {
      imageState.propertyId = null;
      imageUploadInput?.setAttribute("disabled", "true");
      if (imageUploadStatus) {
        imageUploadStatus.textContent = "Збережіть об’єкт, щоб додати фото.";
      }
      setImageGalleryMessage("Фото не додано.");
    }

    async function loadPropertyImages(propertyId) {
      if (!imageGallery) return;
      if (!propertyId) {
        clearImageGallery();
        return;
      }
      imageState.propertyId = propertyId;
      imageUploadInput?.removeAttribute("disabled");
      if (imageUploadStatus) {
        imageUploadStatus.textContent = "Завантаження фото...";
      }
      try {
        const payload = await fetchJSON(buildPropertyImagesUrl(propertyId));
        renderImageGallery(payload.results || []);
        if (imageUploadStatus) {
          imageUploadStatus.textContent = "Підтримуються PNG/JPG до 12 МБ.";
        }
      } catch (error) {
        setImageGalleryMessage("Не вдалося завантажити фото.");
        if (imageUploadStatus) {
          imageUploadStatus.textContent = "Помилка завантаження.";
        }
      }
    }

    async function loadProperties() {
      try {
        clearSelection();
        const query = buildPropertyQuery();
        const data = await fetchJSON(`${API_URL}?${query}`);
        tableState.totalPages = data.total_pages || 1;
        tableState.totalCount = data.count || 0;
        tableState.page = data.page || tableState.page;
        tableState.ordering = data.ordering || tableState.ordering;
        tableState.filters.status = data.status || tableState.filters.status;
        if (filterStatusSelect) {
          filterStatusSelect.value = tableState.filters.status;
        }
        renderProperties(data.results);
        updatePaginationControls();
        clearTableStatus();
      } catch (error) {
        renderProperties([]);
        setTableStatus(error.message, "error");
        tableState.totalPages = 1;
        tableState.totalCount = 0;
        updatePaginationControls();
      } finally {
        updateBulkToolbar();
        syncSelectAllCheckbox();
      }
    }

    function collectFormData() {
      const payload = {
        title: field("property-title").value.trim(),
        address: field("property-address").value.trim(),
        description: field("property-description").value.trim(),
        price: field("property-price").value,
        area: field("property-area").value,
        rooms: field("property-rooms").value,
        property_type_id: Number(field("property-type").value) || null,
        deal_type_id: Number(field("deal-type").value) || null,
        feature_ids: Array.from(document.querySelectorAll(".feature-checkbox:checked")).map((input) => Number(input.value)),
        featured_homepage: field("property-featured")?.checked ?? false,
      };
      return payload;
    }

    function populateForm(data) {
      state.editingId = data.id;
      field("property-id").value = data.id;
      field("property-title").value = data.title || "";
      field("property-address").value = data.address || "";
      field("property-description").value = data.description || "";
      field("property-price").value = data.price ?? "";
      field("property-area").value = data.area ?? "";
      field("property-rooms").value = data.rooms ?? "";
      field("property-type").value = data.property_type?.id ?? "";
      field("deal-type").value = data.deal_type?.id ?? "";
      const featuredCheckbox = field("property-featured");
      if (featuredCheckbox) {
        featuredCheckbox.checked = Boolean(data.featured_homepage);
      }

      const selectedFeatures = new Set((data.features || []).map((feature) => feature.id));
      document.querySelectorAll(".feature-checkbox").forEach((input) => {
        input.checked = selectedFeatures.has(Number(input.value));
      });

      formTitle.textContent = `Редагування: ${data.title}`;
      deleteBtn.classList.remove("hidden");
      submitBtn.innerHTML = '<i class="ri-save-line"></i> Оновити';
      toggleModal(true);
      loadPropertyImages(data.id);
    }

    async function handleEditClick(event) {
      const button = event.target.closest(".edit-property");
      if (!button) return;
      const id = Number(button.dataset.id);
      if (!id) return;

      toggleModal(true);
      setStatus("Завантаження даних...", "info");
      try {
        const detail = await fetchJSON(`${API_URL}${id}/`);
        populateForm(detail);
        clearStatus();
      } catch (error) {
        setStatus(error.message, "error");
      }
    }

    function handleRowSelectionChange(event) {
      const checkbox = event.target.closest(".row-select");
      if (!checkbox) return;
      const id = Number(checkbox.dataset.id);
      if (!id) return;
      if (checkbox.checked) {
        selectionState.ids.add(id);
      } else {
        selectionState.ids.delete(id);
      }
      syncSelectAllCheckbox();
      updateBulkToolbar();
    }

    function handleSelectAllChange(event) {
      const shouldSelectAll = Boolean(event.target.checked);
      selectionState.ids.clear();
      const checkboxes = tableBody.querySelectorAll(".row-select");
      checkboxes.forEach((checkbox) => {
        const id = Number(checkbox.dataset.id);
        if (!id) return;
        if (shouldSelectAll) {
          checkbox.checked = true;
          selectionState.ids.add(id);
        } else {
          checkbox.checked = false;
        }
      });
      if (!shouldSelectAll) {
        selectionState.ids.clear();
      }
      syncSelectAllCheckbox();
      updateBulkToolbar();
    }

    async function performBulkAction(action) {
      if (!selectionState.ids.size || bulkInProgress) {
        return;
      }
      if (action === "delete" && !confirm("Видалити вибрані об’єкти безповоротно?")) {
        return;
      }

      bulkInProgress = true;
      setBulkButtonsDisabled(true);
      const ids = Array.from(selectionState.ids);

      try {
        await fetchJSON(BULK_ACTION_URL, {
          method: "POST",
          body: JSON.stringify({ action, ids }),
        });
        clearSelection();
        await loadProperties();
        const messages = {
          archive: "Об’єкти переміщено до архіву.",
          restore: "Об’єкти повернуто з архіву.",
          delete: "Об’єкти видалено.",
        };
        setTableStatus(messages[action] || "Операція виконана.", "success");
      } catch (error) {
        setTableStatus(error.message, "error");
      } finally {
        bulkInProgress = false;
        setBulkButtonsDisabled(false);
      }
    }

    async function handleSubmit(event) {
      event.preventDefault();
      clearStatus();

      const payload = collectFormData();
      const isEditing = Boolean(state.editingId);
      const url = isEditing ? `${API_URL}${state.editingId}/` : API_URL;
      const method = isEditing ? "PATCH" : "POST";

      try {
        const result = await fetchJSON(url, {
          method,
          body: JSON.stringify(payload),
        });

        setStatus(isEditing ? "Об’єкт успішно оновлено." : "Об’єкт створено.", "success");
        await loadProperties();
        if (!isEditing && result?.id) {
          populateForm(result);
          loadPropertyImages(result.id);
        }
        if (!isEditing) {
          state.editingId = result?.id || null;
          formTitle.textContent = result?.title ? `Редагування: ${result.title}` : "Редагування";
          deleteBtn.classList.remove("hidden");
          submitBtn.innerHTML = '<i class="ri-save-line"></i> Оновити';
        }
      } catch (error) {
        setStatus(error.message, "error");
      }
    }

    importBtn?.addEventListener("click", () => {
      importForm?.reset();
      clearImportStatus();
      toggleImportModal(true);
    });

    closeImportModalBtn?.addEventListener("click", () => toggleImportModal(false));
    cancelImportModalBtn?.addEventListener("click", () => toggleImportModal(false));

    importForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearImportStatus();
      const urls = (importUrlsTextarea?.value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const files = importFilesInput?.files ? Array.from(importFilesInput.files) : [];

      const summary = {
        created: [],
        errors: [],
      };
      const totalTasks = urls.length + files.length;
      if (!totalTasks) {
        setImportStatus("Додайте посилання або HTML-файли для імпорту.", "error");
        return;
      }

      if (totalTasks > 0) {
        showImportProgress(totalTasks);
      }

      let completed = 0;

      for (const url of urls) {
        try {
          const response = await fetch(IMPORT_LINK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ url, geocode: importGeocodeCheckbox?.checked || false }),
          });
          let data;
          try {
            data = await response.json();
          } catch (parseError) {
            throw new Error(`Не вдалося прочитати відповідь для ${url}`);
          }
          if (!response.ok) {
            throw new Error(data?.error || JSON.stringify(data?.errors || {}));
          }
          if (data.created) {
            summary.created.push(data.created);
          }
          if (Array.isArray(data.errors)) {
            data.errors.forEach((err) => {
              const details = err.error || JSON.stringify(err.errors || {});
              summary.errors.push({ item: url, error: details });
            });
          }
        } catch (error) {
          summary.errors.push({ item: url, error: error.message });
        }
        completed += 1;
        updateImportProgress(completed, totalTasks, `URL`);
      }

      for (const file of files) {
        const formData = new FormData();
        formData.append("files", file);
        if (importGeocodeCheckbox?.checked) {
          formData.append("geocode", "1");
        }
        try {
          const response = await fetch(IMPORT_HTML_URL, {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          let data;
          try {
            data = await response.json();
          } catch (parseError) {
            throw new Error(`Не вдалося прочитати відповідь для файлу ${file.name}`);
          }
          if (!response.ok) {
            throw new Error(data?.error || `Не вдалося імпортувати ${file.name} (статус ${response.status}).`);
          }
          if (Array.isArray(data.created)) {
            summary.created.push(...data.created);
          } else if (data.created) {
            summary.created.push(data.created);
          }
          if (Array.isArray(data.errors)) {
            data.errors.forEach((err) => {
              const itemName = err.file || file.name;
              const details = err.error || JSON.stringify(err.errors || {});
              summary.errors.push({ item: itemName, error: details });
            });
          }
        } catch (error) {
          summary.errors.push({ item: file.name, error: error.message });
        }
        completed += 1;
        updateImportProgress(completed, totalTasks, `Файл`);
      }

      const createdCount = summary.created.length;
      const errorsCount = summary.errors.length;
      const warningItems = summary.created.flatMap((item) => (item.warnings || []).map((warning) => `• ${item.title || item.id}: ${warning}`));
      let message = `Створено ${createdCount} об’єкт(ів).`;
      if (warningItems.length) {
        const warningPreview = warningItems.slice(0, 5);
        if (warningItems.length > 5) {
          warningPreview.push(`… ще ${warningItems.length - 5} попереджень`);
        }
        message += `\nПопередження:\n${warningPreview.join("\n")}`;
      }
      if (errorsCount) {
        const preview = summary.errors.slice(0, 5).map((err) => `• ${err.item}: ${err.error}`);
        if (errorsCount > 5) {
          preview.push(`… ще ${errorsCount - 5} помилок`);
        }
        message += `\n${preview.join("\n")}`;
        setImportStatus(message, "error");
      } else {
        setImportStatus(message, "success");
        toggleImportModal(false);
        setStatus(message, "success");
      }

      if (importProgressNode) {
        importProgressNode.classList.add("hidden");
      }

      await loadProperties();
    });

    async function handleDelete() {
      if (!state.editingId) {
        setStatus("Спочатку оберіть об’єкт для видалення.", "info");
        return;
      }
      if (!confirm("Видалити поточний об’єкт?")) {
        return;
      }

      try {
        await fetchJSON(`${API_URL}${state.editingId}/`, { method: "DELETE" });
        setStatus("Об’єкт видалено.", "success");
        resetForm();
        await loadProperties();
        toggleModal(false);
      } catch (error) {
        setStatus(error.message, "error");
      }
    }

    document.addEventListener("DOMContentLoaded", async () => {
      await loadDictionaries();
      await loadHighlightSettings();
      await loadProperties();
    });

    tableBody.addEventListener("click", handleEditClick);
    tableBody.addEventListener("change", handleRowSelectionChange);
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", handleSelectAllChange);
    }
    if (bulkArchiveBtn) {
      bulkArchiveBtn.addEventListener("click", () => performBulkAction("archive"));
    }
    if (bulkRestoreBtn) {
      bulkRestoreBtn.addEventListener("click", () => performBulkAction("restore"));
    }
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener("click", () => performBulkAction("delete"));
    }
    refreshBtn.addEventListener("click", loadProperties);
    startCreateBtn.addEventListener("click", () => {
      resetForm();
      toggleModal(true);
    });
    formNode.addEventListener("submit", handleSubmit);
    deleteBtn.addEventListener("click", handleDelete);
    closeModalBtn.addEventListener("click", () => {
      toggleModal(false);
      clearStatus();
    });
    cancelModalBtn.addEventListener("click", () => {
      toggleModal(false);
      clearStatus();
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        toggleModal(false);
        clearStatus();
      }
    });

    imageGallery?.addEventListener("click", handleImageGalleryClick);
    if (imageUploadInput) {
      imageUploadInput.addEventListener("change", (event) => {
        const files = Array.from(event.target.files || []);
        uploadPropertyImages(files);
      });
    }

    if (openHighlightBtn) {
      openHighlightBtn.addEventListener("click", async () => {
        await loadHighlightSettings();
        toggleHighlightModal(true);
      });
    }

    if (closeHighlightModalBtn) {
      closeHighlightModalBtn.addEventListener("click", () => toggleHighlightModal(false));
    }

    if (cancelHighlightModalBtn) {
      cancelHighlightModalBtn.addEventListener("click", () => toggleHighlightModal(false));
    }

    if (highlightModal) {
      highlightModal.addEventListener("click", (event) => {
        if (event.target === highlightModal) {
          toggleHighlightModal(false);
        }
      });
    }

    if (filterSearchInput) {
      filterSearchInput.addEventListener("input", (event) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          tableState.filters.search = event.target.value.trim();
          tableState.page = 1;
          loadProperties();
        }, 300);
      });
    }

    if (filterPropertyTypeSelect) {
      filterPropertyTypeSelect.addEventListener("change", (event) => {
        tableState.filters.propertyType = event.target.value;
        tableState.page = 1;
        loadProperties();
      });
    }

    if (filterDealTypeSelect) {
      filterDealTypeSelect.addEventListener("change", (event) => {
        tableState.filters.dealType = event.target.value;
        tableState.page = 1;
        loadProperties();
      });
    }

    if (filterFeaturedSelect) {
      filterFeaturedSelect.addEventListener("change", (event) => {
        tableState.filters.featured = event.target.value;
        tableState.page = 1;
        loadProperties();
      });
    }

    if (filterStatusSelect) {
      filterStatusSelect.addEventListener("change", (event) => {
        tableState.filters.status = event.target.value || "active";
        tableState.page = 1;
        loadProperties();
      });
    }

    if (pageSizeSelect) {
      pageSizeSelect.addEventListener("change", (event) => {
        tableState.pageSize = Number(event.target.value) || 10;
        tableState.page = 1;
        loadProperties();
      });
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => {
        tableState.filters = { search: "", propertyType: "", dealType: "", featured: "", status: "active" };
        tableState.page = 1;
        tableState.pageSize = 10;
        if (filterSearchInput) filterSearchInput.value = "";
        if (filterPropertyTypeSelect) filterPropertyTypeSelect.value = "";
        if (filterDealTypeSelect) filterDealTypeSelect.value = "";
        if (filterFeaturedSelect) filterFeaturedSelect.value = "";
        if (filterStatusSelect) filterStatusSelect.value = "active";
        if (pageSizeSelect) {
          pageSizeSelect.value = "10";
        }
        loadProperties();
      });
    }

    if (prevPageBtn) {
      prevPageBtn.addEventListener("click", () => {
        if (tableState.page > 1) {
          tableState.page -= 1;
          loadProperties();
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener("click", () => {
        if (tableState.page < tableState.totalPages) {
          tableState.page += 1;
          loadProperties();
        }
      });
    }

    if (highlightForm) {
      highlightForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearHighlightStatus();
        try {
          const payload = collectHighlightPayload();
          const method = state.highlightSettings?.id ? "PATCH" : "POST";
          const response = await fetchJSON(HIGHLIGHT_SETTINGS_URL, {
            method,
            body: JSON.stringify(payload),
          });
          state.highlightSettings = response.result || null;
          populateHighlightForm(state.highlightSettings || {});
          setHighlightStatus("Налаштування збережено.", "success");
          await loadProperties();
        } catch (error) {
          setHighlightStatus(error.message, "error");
        }
      });
    }

    if (highlightResetBtn) {
      highlightResetBtn.addEventListener("click", (event) => {
        event.preventDefault();
        const defaults = {
          limit: 3,
          price_min: null,
          price_max: null,
          region_keyword: "",
          property_type_ids: [],
        };
        populateHighlightForm(defaults);
        setHighlightStatus("Поля скинуто. Натисніть «Зберегти», щоб застосувати зміни.", "info");
      });
    }
})(window, document);
