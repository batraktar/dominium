(() => {
  const modalMap = {};

  function closeModal(key) {
    const modal = modalMap[key];
    if (!modal) return;
    if (modal.container.classList.contains("hidden")) return;
    modal.panel.classList.remove("opacity-100", "scale-100");
    modal.panel.classList.add("opacity-0", "scale-95");
    setTimeout(() => {
      modal.container.classList.remove("flex");
      modal.container.classList.add("hidden");
    }, 200);
  }

  window.dominiumCloseModal = closeModal;

  function openModal(key) {
    const modal = modalMap[key];
    if (!modal) return;
    Object.keys(modalMap).forEach((other) => {
      if (other !== key) closeModal(other);
    });
    modal.container.classList.remove("hidden");
    modal.container.classList.add("flex");
    requestAnimationFrame(() => {
      modal.panel.classList.remove("opacity-0", "scale-95");
      modal.panel.classList.add("opacity-100", "scale-100");
    });
  }

  function initModals() {
    document.querySelectorAll("[data-modal]").forEach((container) => {
      const key = container.dataset.modal;
      const panel = container.querySelector("[data-modal-panel]");
      const overlay = container.querySelector("[data-modal-overlay]");
      const closers = container.querySelectorAll("[data-close-modal]");

      modalMap[key] = { container, panel };

      overlay?.addEventListener("click", () => closeModal(key));
      closers.forEach((btn) => btn.addEventListener("click", () => closeModal(key)));
    });

    document.querySelectorAll("[data-open-modal]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.openModal));
    });

    document.querySelectorAll("[data-switch-modal]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.switchModal));
    });

    const initial = [
      { key: "register", flag: document.body.dataset.registerOpen === "true" },
      { key: "login", flag: document.body.dataset.loginOpen === "true" },
    ].find((item) => item.flag);
    if (initial) openModal(initial.key);
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(";").shift();
    }
    return "";
  }

  function getCsrfTokenValue() {
    const tokenInput =
      document.getElementById("form-csrf-token") ||
      document.querySelector("input[name='csrfmiddlewaretoken']");
    return tokenInput?.value || getCookie("csrftoken") || "";
  }

  function attachLogoutHandlers() {
    document.querySelectorAll("[data-logout-url]").forEach((btn) => {
      if (btn.dataset.logoutBound === "1") return;
      btn.dataset.logoutBound = "1";
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        const url = btn.dataset.logoutUrl;
        if (!url) return;
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "X-CSRFToken": getCsrfTokenValue(),
              "X-Requested-With": "XMLHttpRequest",
            },
          });
          if (response.redirected) {
            window.location.href = response.url;
            return;
          }
          window.location.reload();
        } catch (error) {
          console.error("Logout failed", error);
          window.location.reload();
        }
      });
    });
  }

  function initGoogleAuth() {
    let googleAuthPopup = null;
    let googleAuthMonitor = null;
    let googleAuthReloaded = false;
    let googleAuthState = "";

    function getCurrentPathWithQuery() {
      return `${window.location.pathname}${window.location.search}${window.location.hash}` || "/";
    }

    function normalizeNextPath(rawNext, fallback = "/") {
      if (!rawNext) return fallback;
      try {
        const parsed = new URL(rawNext, window.location.origin);
        const candidate = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
          return fallback;
        }
        return candidate;
      } catch (_) {
        return fallback;
      }
    }

    function createPopupState() {
      try {
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
      } catch (_) {
        return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      }
    }

    function buildGoogleAuthUrl(rawAuthUrl, popupState = "") {
      const source = String(rawAuthUrl || "").trim();
      if (!source) return "";

      const fallbackPath = normalizeNextPath(getCurrentPathWithQuery(), "/");
      let popupCompletePath = `/auth/popup-complete/?next=${encodeURIComponent(fallbackPath)}&parent_origin=${encodeURIComponent(window.location.origin)}`;
      if (popupState) {
        popupCompletePath += `&popup_state=${encodeURIComponent(popupState)}`;
      }

      try {
        const url = new URL(source, window.location.origin);
        url.searchParams.set("next", popupCompletePath);
        return url.toString();
      } catch (_) {
        return source;
      }
    }

    function clearGoogleMonitor() {
      if (googleAuthMonitor) {
        clearInterval(googleAuthMonitor);
        googleAuthMonitor = null;
      }
    }

    function closeGooglePopup() {
      if (googleAuthPopup && !googleAuthPopup.closed) {
        googleAuthPopup.close();
      }
      googleAuthPopup = null;
      googleAuthState = "";
    }

    function openGooglePopup(url) {
      const popupState = createPopupState();
      googleAuthState = popupState;
      const resolvedUrl = buildGoogleAuthUrl(url, popupState);
      if (!resolvedUrl) {
        googleAuthState = "";
        return;
      }

      const width = 520;
      const height = 640;
      const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
      const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
      const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;

      const popup = window.open(resolvedUrl, "dominium-google-auth", features);
      googleAuthPopup = popup;
      googleAuthReloaded = false;
      clearGoogleMonitor();
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        window.location.href = resolvedUrl;
      } else {
        popup.focus();
        googleAuthMonitor = setInterval(() => {
          if (popup.closed) {
            clearGoogleMonitor();
            if (!googleAuthReloaded) {
              window.location.reload();
            }
          }
        }, 400);
      }
    }

    window.addEventListener("message", (event) => {
      if (!googleAuthPopup || event.source !== googleAuthPopup) return;

      const payload = event.data;
      if (
        payload &&
        typeof payload === "object" &&
        payload.state &&
        googleAuthState &&
        payload.state !== googleAuthState
      ) {
        return;
      }

      const isSuccess =
        payload === "dominium-auth-success" ||
        (payload && typeof payload === "object" && payload.type === "dominium-auth-success");
      const isFailure = payload && typeof payload === "object" && payload.type === "dominium-auth-failed";

      if (isFailure) {
        const nextPath = normalizeNextPath(payload.next, getCurrentPathWithQuery());
        const loginForm = document.getElementById("login-form");
        const nextInput = loginForm ? loginForm.querySelector("input[name='next']") : null;
        if (nextInput) nextInput.value = nextPath;

        googleAuthReloaded = true;
        closeGooglePopup();
        openModal("login");
        return;
      }

      if (isSuccess) {
        const nextFromPayload = payload && typeof payload === "object" ? payload.next : "";
        const nextPath = normalizeNextPath(nextFromPayload, getCurrentPathWithQuery());

        googleAuthReloaded = true;
        closeModal("login");
        closeModal("register");
        closeGooglePopup();
        if (nextPath && nextPath !== getCurrentPathWithQuery()) {
          window.location.assign(nextPath);
          return;
        }
        window.location.reload();
      }
    });

    document.querySelectorAll("[data-google-auth]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const url = btn.dataset.authUrl;
        openGooglePopup(url);
      });
    });
  }

  function bindPasswordToggles() {
    document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.togglePassword;
        const input = document.getElementById(targetId);
        const icon = btn.querySelector("i");
        if (!input) return;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        if (icon) {
          icon.classList.toggle("ri-eye-line", !isPassword);
          icon.classList.toggle("ri-eye-off-line", isPassword);
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initModals();
    initGoogleAuth();
    bindPasswordToggles();
    attachLogoutHandlers();
  });
})();
