(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("admin-edit-modal");
    if (!modal) return;

    const openBtn = document.getElementById("open-admin-modal");
    const closeBtn = document.getElementById("close-admin-modal");
    const cancelBtn = document.getElementById("admin-cancel");
    const form = document.getElementById("admin-edit-form");
    const statusNode = document.getElementById("admin-status");
    const featuresContainer = document.getElementById("admin-features");

    const propertyId = modal.dataset.propertyId;
    const apiBase = modal.dataset.apiBase;
    const propertyTypesUrl = modal.dataset.propertyTypesUrl;
    const dealTypesUrl = modal.dataset.dealTypesUrl;
    const featuresUrl = modal.dataset.featuresUrl;

    const field = (id) => document.getElementById(`admin-${id}`);

    const toggleModal = (show) => {
      modal.classList.toggle("hidden", !show);
      document.body.classList.toggle("overflow-hidden", show);
    };

    const setStatus = (message, type = "info") => {
      if (!statusNode) return;
      statusNode.textContent = message;
      statusNode.className = "mx-6 mt-4 px-4 py-2 rounded-[9px] text-sm font-fixel";
      const map = {
        success: ["bg-green-100", "text-green-800"],
        error: ["bg-red-100", "text-red-800"],
        info: ["bg-yellow-100", "text-yellow-800"],
      };
      (map[type] || map.info).forEach((cls) => statusNode.classList.add(cls));
      statusNode.classList.remove("hidden");
    };

    const clearStatus = () => {
      if (!statusNode) return;
      statusNode.textContent = "";
      statusNode.classList.add("hidden");
    };

    const fillSelect = (select, items, placeholder) => {
      select.innerHTML = `<option value="">${placeholder}</option>`;
      items.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.name;
        select.appendChild(option);
      });
    };

    const fetchJSON = async (url, options = {}) => {
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        ...options,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Помилка ${response.status}: ${text}`);
      }
      if (response.status === 204) {
        return null;
      }
      return response.json();
    };

    const loadDictionaries = async () => {
      const [propertyTypes, dealTypes, features] = await Promise.all([
        fetchJSON(propertyTypesUrl),
        fetchJSON(dealTypesUrl),
        fetchJSON(featuresUrl),
      ]);

      fillSelect(field("property-type"), propertyTypes.results || [], "Оберіть тип");
      fillSelect(field("deal-type"), dealTypes.results || [], "Оберіть угоду");

      featuresContainer.innerHTML = "";
      const featureItems = features.results || [];
      if (featureItems.length === 0) {
        featuresContainer.innerHTML =
          '<p class="text-sm text-gray-500">Характеристики не знайдено.</p>';
        return;
      }

      featureItems.forEach((feature) => {
        const label = document.createElement("label");
        label.className =
          "flex items-center gap-2 rounded-[9px] border border-gray-200 px-3 py-2 text-sm";
        label.innerHTML = `
          <input type="checkbox" value="${feature.id}" class="feature-checkbox accent-deepOcean" />
          <span>${feature.name}</span>
        `;
        featuresContainer.appendChild(label);
      });
    };

    const populateForm = (data) => {
      field("title").value = data.title || "";
      field("address").value = data.address || "";
      field("description").value = data.description || "";
      field("price").value = data.price ?? "";
      field("area").value = data.area ?? "";
      field("rooms").value = data.rooms ?? "";
      field("property-type").value = data.property_type?.id ?? "";
      field("deal-type").value = data.deal_type?.id ?? "";

      const selectedFeatureIds = new Set(
        (data.features || []).map((feature) => feature.id)
      );
      document
        .querySelectorAll("#admin-features .feature-checkbox")
        .forEach((checkbox) => {
          checkbox.checked = selectedFeatureIds.has(Number(checkbox.value));
        });
    };

    const loadProperty = async () => {
      const data = await fetchJSON(`${apiBase}${propertyId}/`);
      populateForm(data);
    };

    const collectPayload = () => ({
      title: field("title").value.trim(),
      address: field("address").value.trim(),
      description: field("description").value.trim(),
      price: field("price").value,
      area: field("area").value,
      rooms: field("rooms").value,
      property_type_id: Number(field("property-type").value) || null,
      deal_type_id: Number(field("deal-type").value) || null,
      feature_ids: Array.from(
        document.querySelectorAll("#admin-features .feature-checkbox:checked")
      ).map((checkbox) => Number(checkbox.value)),
    });

    const init = async () => {
      try {
        await loadDictionaries();
        await loadProperty();
      } catch (error) {
        setStatus(error.message, "error");
      }
    };

    openBtn?.addEventListener("click", async () => {
      clearStatus();
      toggleModal(true);
      try {
        await init();
      } catch (error) {
        setStatus(error.message, "error");
      }
    });

    [closeBtn, cancelBtn].forEach((btn) =>
      btn?.addEventListener("click", () => {
        toggleModal(false);
        clearStatus();
      })
    );

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        toggleModal(false);
        clearStatus();
      }
    });

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus();
      try {
        const payload = collectPayload();
        await fetchJSON(`${apiBase}${propertyId}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setStatus("Об’єкт успішно оновлено.", "success");
      } catch (error) {
        setStatus(error.message, "error");
      }
    });
  });
})();
