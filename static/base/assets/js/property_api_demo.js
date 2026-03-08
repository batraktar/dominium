document.addEventListener("DOMContentLoaded", () => {
  const outputNode = document.getElementById("properties-output");
  if (!outputNode) return;

  const reloadBtn = document.getElementById("reload-properties");
  const apiUrl = outputNode.dataset.apiUrl;
  if (!apiUrl) {
    outputNode.textContent = "Помилка: API URL не налаштовано.";
    return;
  }

  async function loadProperties() {
    outputNode.textContent = "Завантаження...";

    try {
      const response = await fetch(apiUrl, { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(`Статус ${response.status}`);
      }
      const data = await response.json();
      outputNode.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      outputNode.textContent = `Помилка: ${error.message}`;
    }
  }

  reloadBtn?.addEventListener("click", loadProperties);
  loadProperties();
});
