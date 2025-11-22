(() => {
  const getCsrfToken = () =>
    document.getElementById("csrf-token")?.value ||
    document.querySelector("input[name='csrfmiddlewaretoken']")?.value ||
    "";

  async function sendConsultation(formData) {
    const csrf = getCsrfToken();
    const response = await fetch("/consultation/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": csrf,
      },
      credentials: "same-origin",
      body: new URLSearchParams(formData),
    });

    const data = await response.json();
    return { ok: response.ok, data };
  }

  window.DominiumContactAPI = {
    sendConsultation,
    getCsrfToken,
  };
})();
