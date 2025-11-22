(() => {
  const getCsrfToken =
    (window.DominiumSearchAPI && window.DominiumSearchAPI.getCsrfToken) ||
    (() =>
      document.getElementById("csrf-token")?.value ||
      document.querySelector("input[name='csrfmiddlewaretoken']")?.value ||
      "");

  async function apiToggle(url, bodyParams = undefined) {
    const csrf = getCsrfToken();
    const headers = {
      "X-CSRFToken": csrf,
      "X-Requested-With": "XMLHttpRequest",
    };
    let body;
    if (bodyParams) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams(bodyParams).toString();
    }
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed: ${response.status}`);
    }
    return response.json();
  }

  async function toggleLike(propertyId) {
    if (window.DominiumSearchAPI?.toggleLike) {
      return window.DominiumSearchAPI.toggleLike(propertyId);
    }
    return apiToggle(`/like/${propertyId}/`);
  }

  async function toggleFeatured(propertyId, desired) {
    if (window.DominiumSearchAPI?.toggleFeatured) {
      return window.DominiumSearchAPI.toggleFeatured(propertyId, desired);
    }
    const payload = {};
    if (typeof desired !== "undefined") {
      payload.featured = desired ? "true" : "false";
    }
    return apiToggle(`/properties/${propertyId}/toggle-featured/`, payload);
  }

  function showLikeNotification(message, isError = false) {
    const note = document.createElement("div");
    note.textContent = message;
    note.className = `fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-white text-sm z-50 ${
      isError ? "bg-red-500" : "bg-green-500"
    }`;
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 2500);
  }

  async function handleLikeClick(button) {
    if (!window.userIsAuthenticated) {
      window.location.href = "/login/";
      return;
    }
    const propertyId = button.getAttribute("data-property-id");
    if (!propertyId) return;
    try {
      const data = await toggleLike(propertyId);
      const icon = button.querySelector("i");
      if (!icon) return;
      if (data.status === "liked") {
        icon.classList.remove("ri-heart-line", "text-coolSage");
        icon.classList.add("ri-heart-fill", "text-deepOcean");
        showLikeNotification("Додано до обраного");
      } else if (data.status === "unliked") {
        icon.classList.remove("ri-heart-fill", "text-deepOcean");
        icon.classList.add("ri-heart-line", "text-coolSage");
        showLikeNotification("Видалено з обраного");
      }
    } catch (error) {
      console.error(error);
      showLikeNotification("Помилка лайку", true);
    }
  }

  function initLikeButtons(scope = document) {
    const buttons = scope.querySelectorAll(".like-button");
    if (!buttons.length) return;
    buttons.forEach((button) => {
      if (button.dataset.likeBound === "1") return;
      button.dataset.likeBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        handleLikeClick(button);
      });
    });
  }

  async function handleFeaturedClick(button) {
    const propertyId = button.dataset.propertyId;
    if (!propertyId) return;
    const currentlyFeatured = button.getAttribute("data-featured") === "true";
    const nextValue = !currentlyFeatured;
    try {
      const data = await toggleFeatured(propertyId, nextValue);
      const isFeatured = Boolean(data.featured);
      button.setAttribute("data-featured", isFeatured ? "true" : "false");
      const icon = button.querySelector("i");
      if (icon) {
        icon.classList.remove("ri-star-line", "ri-star-fill", "text-coolSage", "text-yellow-500");
        icon.classList.add(isFeatured ? "ri-star-fill" : "ri-star-line");
        icon.classList.add(isFeatured ? "text-yellow-500" : "text-coolSage");
      }
      const label = button.querySelector("[data-featured-label]");
      if (label) label.textContent = isFeatured ? "У Топ-3" : "В Топ-3";
      showLikeNotification(
        isFeatured ? "Об’єкт додано до блоку «Топ 3»" : "Об’єкт вилучено з блоку «Топ 3»",
        false
      );
    } catch (error) {
      console.error(error);
      showLikeNotification("Не вдалося оновити статус «Топ 3». Спробуйте пізніше.", true);
    }
  }

  function initFeaturedToggles(scope = document) {
    if (!window.userIsStaff) return;
    const csrfToken = getCsrfToken();
    if (!csrfToken) return;
    scope.querySelectorAll("[data-featured-toggle]").forEach((button) => {
      if (button.dataset.featuredBound === "1") return;
      button.dataset.featuredBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        handleFeaturedClick(button);
      });
    });
  }

  window.initLikeButtons = initLikeButtons;
  window.initFeaturedToggles = initFeaturedToggles;
  window.showLikeNotification = showLikeNotification;

  document.addEventListener("DOMContentLoaded", () => {
    initLikeButtons(document);
    initFeaturedToggles(document);
  });
})();
