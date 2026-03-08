(() => {
  function initFeaturedSwiper() {
    if (typeof window.Swiper === "undefined") return;
    const slider = document.querySelector(".property-swiper");
    if (!slider) return;

    new window.Swiper(".property-swiper", {
      navigation: {
        nextEl: ".custom-swiper-next",
        prevEl: ".custom-swiper-prev",
      },
      slidesPerView: 1,
      spaceBetween: 16,
      grabCursor: true,
      loop: true,
      breakpoints: {
        480: { slidesPerView: 1 },
      },
    });

    [".custom-swiper-prev", ".custom-swiper-next"].forEach((selector) => {
      const control = document.querySelector(selector);
      if (!control) return;
      control.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        control.click();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initFeaturedSwiper);
})();
