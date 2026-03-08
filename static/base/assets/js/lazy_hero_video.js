(() => {
  function shouldDisableBackgroundVideo() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    return prefersReducedMotion || saveData;
  }

  function loadAndPlayVideo(video) {
    if (!video || video.dataset.loaded === "1") return;
    const source = video.querySelector("source[data-src]");
    if (!source || !source.dataset.src) return;

    source.src = source.dataset.src;
    video.dataset.loaded = "1";
    video.load();

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Ignore autoplay restrictions and keep static background fallback.
      });
    }
  }

  function initLazyHeroVideo() {
    const heroVideo = document.querySelector("video[data-lazy-video='hero']");
    if (!heroVideo || shouldDisableBackgroundVideo()) return;

    if (!("IntersectionObserver" in window)) {
      loadAndPlayVideo(heroVideo);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          loadAndPlayVideo(heroVideo);
          observer.disconnect();
        });
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(heroVideo);
  }

  document.addEventListener("DOMContentLoaded", initLazyHeroVideo);
})();
