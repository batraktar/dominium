(() => {
  function closeAllMenus(scope = document) {
    scope.querySelectorAll("[data-share-menu]").forEach((menu) => {
      if (!menu.classList.contains("hidden")) {
        menu.classList.add("hidden");
      }
    });
  }

  function getAbsoluteUrl(rawUrl) {
    if (!rawUrl) {
      return window.location.href;
    }
    try {
      if (/^https?:\/\//i.test(rawUrl)) {
        return rawUrl;
      }
      return new URL(rawUrl, window.location.origin).toString();
    } catch (error) {
      console.error("Share: invalid URL", rawUrl, error);
      return window.location.href;
    }
  }

  function notify(message) {
    if (window.Toastify) {
      window.Toastify({
        text: message,
        duration: 2500,
        gravity: "top",
        position: "right",
        style: { background: "#133E44" },
      }).showToast();
      return;
    }
    const note = document.createElement("div");
    note.textContent = message;
    note.className = "fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-white text-sm z-50 bg-deepOcean";
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 2500);
  }

  async function handleShare(action, toggle) {
    const absoluteUrl = getAbsoluteUrl(toggle.dataset.shareUrl);
    const encodedUrl = encodeURIComponent(absoluteUrl);
    const encodedText = encodeURIComponent(toggle.dataset.shareTitle || document.title);

    switch (action) {
      case "copy":
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(absoluteUrl);
          } else {
            const input = document.createElement("input");
            input.value = absoluteUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            document.body.removeChild(input);
          }
          notify("Посилання скопійовано");
        } catch (error) {
          console.error("Share copy error", error);
          notify("Не вдалося скопіювати посилання");
        }
        break;
      case "telegram":
        window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank", "noopener");
        break;
      case "viber": {
        const text = encodeURIComponent(`${toggle.dataset.shareTitle || ""}\n${absoluteUrl}`);
        const viberUrl = `viber://forward?text=${text}`;
        const win = window.open(viberUrl, "_blank");
        if (!win) {
          window.open(`https://viber.click?number=&text=${text}`, "_blank", "noopener");
        }
        break;
      }
      case "native":
        if (navigator.share) {
          try {
            await navigator.share({ title: toggle.dataset.shareTitle || document.title, url: absoluteUrl });
          } catch (error) {
            if (error && error.name !== "AbortError") {
              console.error("Native share error", error);
              notify("Не вдалося поділитися");
            }
          }
        } else {
          notify("Поділитися через пристрій неможливо");
        }
        break;
      default:
        console.warn("Unknown share action:", action);
    }
    closeAllMenus();
  }

  function initShareContainers(scope = document) {
    const containers = scope.querySelectorAll("[data-share-container]");
    if (!containers.length) {
      return;
    }

    containers.forEach((container) => {
      if (container.dataset.shareBound === "1") {
        return;
      }
      container.dataset.shareBound = "1";
      const toggle = container.querySelector("[data-share-toggle]");
      const menu = container.querySelector("[data-share-menu]");
      if (!toggle || !menu) {
        return;
      }

      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const wasHidden = menu.classList.contains("hidden");
        closeAllMenus();
        if (wasHidden) {
          menu.classList.remove("hidden");
        }
      });

      menu.addEventListener("click", (event) => event.stopPropagation());

      menu.querySelectorAll("[data-share-action]").forEach((item) => {
        item.addEventListener("click", (event) => {
          event.preventDefault();
          const action = item.dataset.shareAction;
          handleShare(action, toggle);
        });
      });
    });
  }

  if (!document.__dominiumShareClickAttached) {
    document.__dominiumShareClickAttached = true;
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-share-container]")) {
        return;
      }
      closeAllMenus();
    });
  }

  window.initShareContainers = initShareContainers;
  document.addEventListener("DOMContentLoaded", () => initShareContainers());
})();
