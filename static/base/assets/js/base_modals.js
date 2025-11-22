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

    function clearGoogleMonitor() {
      if (googleAuthMonitor) {
        clearInterval(googleAuthMonitor);
        googleAuthMonitor = null;
      }
    }

    function openGooglePopup(url) {
      if (!url) return;
      const width = 520;
      const height = 640;
      const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
      const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
      const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;

      const popup = window.open(url, "dominium-google-auth", features);
      googleAuthPopup = popup;
      googleAuthReloaded = false;
      clearGoogleMonitor();
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        window.location.href = url;
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
      if (event.origin !== window.location.origin) return;
      if (event.data === "dominium-auth-success") {
        googleAuthReloaded = true;
        closeModal("login");
        closeModal("register");
        if (googleAuthPopup && !googleAuthPopup.closed) {
          googleAuthPopup.close();
        }
        window.location.reload();
      }
    });

    if (window.name === "dominium-google-auth" && window.opener) {
      window.addEventListener("load", () => {
        try {
          window.opener.postMessage("dominium-auth-success", window.location.origin);
        } catch (err) {
          console.warn("Не вдалося повідомити основне вікно про авторизацію:", err);
        }
        setTimeout(() => {
          window.close();
        }, 300);
      });
    }

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
