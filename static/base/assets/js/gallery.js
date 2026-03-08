let images = [];
let currentIndex = 0;

function uniqueOrdered(values) {
  const seen = new Set();
  const output = [];
  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    output.push(normalized);
  });
  return output;
}

function collectGalleryImages() {
  const fromPrimary = Array.from(
    document.querySelectorAll("[data-gallery-src]")
  ).map((node) => node.getAttribute("data-gallery-src"));

  if (fromPrimary.length) {
    return uniqueOrdered(fromPrimary);
  }

  const fromThumbs = Array.from(
    document.querySelectorAll(".thumbnail-img[data-src], .thumbnail-img[src]")
  ).map((node) => node.getAttribute("data-src") || node.getAttribute("src"));
  return uniqueOrdered(fromThumbs);
}

function normalizeIndex(index) {
  if (!images.length) return 0;
  const numeric = Number(index);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(images.length - 1, Math.max(0, Math.floor(numeric)));
}

function updateDots() {
  document
    .querySelectorAll("#gallery .w-2.h-2.rounded-full")
    .forEach((dot, index) => {
      dot.className = `w-2 h-2 rounded-full ${
        index === currentIndex ? "bg-white/90" : "bg-white/50"
      }`;
    });
}

function updateThumbnails() {
  document.querySelectorAll(".thumbnail-img").forEach((thumb, index) => {
    const isActive = index === currentIndex;
    thumb.style.opacity = isActive ? "1" : "0.5";

    if (isActive) {
      thumb.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  });
}

function updateNavigationButtons() {
  const atStart = currentIndex === 0;
  const atEnd = currentIndex === images.length - 1;

  document.querySelectorAll(".btn-prev").forEach((btn) => {
    btn.style.display = atStart ? "none" : "block";
  });
  document.querySelectorAll(".btn-next").forEach((btn) => {
    btn.style.display = atEnd ? "none" : "block";
  });
}

function updateAll() {
  if (!images.length) return;

  const mainImg = document.querySelector("#gallery [data-gallery-src]") || document.querySelector("#gallery img");
  const modalImg = document.getElementById("modalImage");
  const currentSrc = images[currentIndex];

  if (mainImg) mainImg.src = currentSrc;
  if (modalImg) modalImg.src = currentSrc;

  updateDots();
  updateThumbnails();
  updateNavigationButtons();
}

function nextImage() {
  if (currentIndex < images.length - 1) {
    currentIndex += 1;
    updateAll();
  }
}

function prevImage() {
  if (currentIndex > 0) {
    currentIndex -= 1;
    updateAll();
  }
}

function openGallery(index = null) {
  if (index !== null) {
    currentIndex = normalizeIndex(index);
  }
  updateAll();
  const modal = document.getElementById("galleryModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeGallery() {
  const modal = document.getElementById("galleryModal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function showModalImage(index) {
  currentIndex = normalizeIndex(index);
  updateAll();
}

function initLazyThumbnails() {
  const lazyImages = document.querySelectorAll(".lazy-image[data-src]");
  if (!lazyImages.length) return;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
          obs.unobserve(img);
        });
      },
      { rootMargin: "200px 0px" }
    );

    lazyImages.forEach((img) => observer.observe(img));
    return;
  }

  lazyImages.forEach((img) => {
    img.src = img.dataset.src;
    img.removeAttribute("data-src");
  });
}

function bindSwipe(container) {
  if (!container) return;
  let startX = 0;
  container.addEventListener("touchstart", (event) => {
    startX = event.changedTouches[0].screenX;
  });
  container.addEventListener("touchend", (event) => {
    const deltaX = event.changedTouches[0].screenX - startX;
    if (deltaX > 40) prevImage();
    else if (deltaX < -40) nextImage();
  });
}

function bindControls() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-gallery-open]");
    if (openButton) {
      event.preventDefault();
      const index = Number(openButton.dataset.galleryOpen);
      openGallery(Number.isFinite(index) ? index : null);
      return;
    }

    const openCurrent = event.target.closest("[data-gallery-open-current]");
    if (openCurrent) {
      event.preventDefault();
      openGallery();
      return;
    }

    const thumb = event.target.closest("[data-gallery-thumb-index]");
    if (thumb) {
      event.preventDefault();
      const index = Number(thumb.dataset.galleryThumbIndex);
      if (Number.isFinite(index)) {
        showModalImage(index);
      }
      return;
    }

    const actionButton = event.target.closest("[data-gallery-action]");
    if (!actionButton) return;

    event.preventDefault();
    const action = actionButton.dataset.galleryAction;
    if (action === "prev") prevImage();
    if (action === "next") nextImage();
    if (action === "close") closeGallery();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  images = collectGalleryImages();
  if (!images.length) return;

  currentIndex = 0;
  bindControls();
  initLazyThumbnails();
  updateAll();

  bindSwipe(document.getElementById("gallery"));
  bindSwipe(document.getElementById("modalImage"));

  const modal = document.getElementById("galleryModal");
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeGallery();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    const modalNode = document.getElementById("galleryModal");
    if (!modalNode || modalNode.classList.contains("hidden")) return;
    if (event.key === "Escape") closeGallery();
    if (event.key === "ArrowRight") nextImage();
    if (event.key === "ArrowLeft") prevImage();
  });
});

function nextModalImage() {
  nextImage();
}

function prevModalImage() {
  prevImage();
}

window.nextImage = nextImage;
window.prevImage = prevImage;
window.openGallery = openGallery;
window.closeGallery = closeGallery;
window.showModalImage = showModalImage;
window.nextModalImage = nextModalImage;
window.prevModalImage = prevModalImage;
