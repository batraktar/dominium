document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.getElementById("toggle-password");
  if (!toggleButton) return;

  toggleButton.addEventListener("click", () => {
    const input = document.getElementById("password");
    const icon = toggleButton.querySelector("i");
    if (!input) return;

    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";

    if (icon) {
      icon.classList.toggle("ri-eye-line", !isPassword);
      icon.classList.toggle("ri-eye-off-line", isPassword);
    }
  });
});
