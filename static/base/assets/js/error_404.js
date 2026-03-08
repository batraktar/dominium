document.addEventListener("DOMContentLoaded", () => {
  const variants = document.querySelectorAll(".error-variant");
  if (!variants.length) return;
  const randomIndex = Math.floor(Math.random() * variants.length);
  variants[randomIndex].classList.remove("hidden");
});
