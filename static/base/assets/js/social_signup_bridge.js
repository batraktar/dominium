window.addEventListener("load", () => {
  const AUTH_SUCCESS_EVENT = "dominium-auth-success";

  document.querySelector("[data-close-window]")?.addEventListener("click", () => {
    window.close();
  });

  if (window.opener && window !== window.opener) {
    try {
      window.opener.postMessage(AUTH_SUCCESS_EVENT, window.location.origin);
      window.opener.postMessage({ type: AUTH_SUCCESS_EVENT }, window.location.origin);
    } catch (error) {
      console.warn("Не вдалося повідомити основне вікно:", error);
    }
    setTimeout(() => window.close(), 250);
  }
});
