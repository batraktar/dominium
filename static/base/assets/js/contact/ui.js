(() => {
  function showNotification(message, isError = false) {
    const note = document.createElement("div");
    note.textContent = message;
    note.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white text-sm z-50 ${
      isError ? "bg-red-500" : "bg-green-500"
    }`;
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 3000);
  }

  function bindNoEmailToggle(emailField) {
    if (!emailField) return;
    const wrapper = emailField.parentElement;
    if (!wrapper) return;
    const container = document.createElement("div");
    container.innerHTML = `
      <label class="flex items-center space-x-2 mt-2 text-sm text-gray-700">
        <input type="checkbox" id="noEmail" class="h-4 w-4">
        <span>Немає пошти</span>
      </label>
    `;
    wrapper.appendChild(container);
    const checkbox = container.querySelector("#noEmail");
    checkbox.addEventListener("change", (event) => {
      if (event.target.checked) {
        emailField.value = "";
        emailField.disabled = true;
        emailField.classList.add("bg-gray-100");
      } else {
        emailField.disabled = false;
        emailField.classList.remove("bg-gray-100");
      }
    });
    return checkbox;
  }

  function prefillFields(form) {
    const nameField = form.querySelector('input[name="name"]');
    const phoneField = form.querySelector('input[name="phone"]');
    const emailField = form.querySelector('input[name="email"]');
    const presetName = form.dataset.userName || "";
    const presetEmail = form.dataset.userEmail || "";
    const presetPhone = form.dataset.userPhone || "";

    if (nameField && presetName && !nameField.value) nameField.value = presetName;
    if (emailField && presetEmail && !emailField.value) emailField.value = presetEmail;
    if (phoneField && presetPhone && !phoneField.value) phoneField.value = presetPhone;
    return { nameField, phoneField, emailField, presets: { presetName, presetEmail, presetPhone } };
  }

  window.DominiumContactUI = {
    showNotification,
    bindNoEmailToggle,
    prefillFields,
  };
})();
