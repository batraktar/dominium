(() => {
  function hidePreloader(preloader, immediate = false) {
    if (!preloader) return;
    if (immediate) {
      preloader.remove();
      document.body.classList.remove("overflow-hidden");
      return;
    }

    preloader.classList.add("opacity-0", "pointer-events-none");
    window.setTimeout(() => {
      preloader.remove();
      document.body.classList.remove("overflow-hidden");
    }, 700);
  }

  window.addEventListener("load", () => {
    const preloader = document.getElementById("preloader");
    if (!preloader) return;

    const noPreloader = document.body.dataset.noPreloader === "1";
    if (noPreloader) {
      hidePreloader(preloader, true);
      return;
    }

    window.setTimeout(() => hidePreloader(preloader), 1000);
  });
})();
