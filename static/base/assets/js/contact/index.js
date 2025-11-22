(() => {
  const { sendConsultation } = window.DominiumContactAPI;
  const { showNotification, bindNoEmailToggle, prefillFields } = window.DominiumContactUI;

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    if (!form) return;

    const propertyInput = document.getElementById("propertyTitle");
    if (propertyInput) {
      propertyInput.value = window.location.href;
    }

    const { nameField, phoneField, emailField, presets } = prefillFields(form);
    const noEmailCheckbox = bindNoEmailToggle(emailField);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      if (emailField?.disabled) {
        formData.set("email", "");
      }

      try {
        const { ok, data } = await sendConsultation(formData);
        if (ok) {
          showNotification("Повідомлення успішно надіслано!", false);
          form.reset();
          if (emailField) {
            emailField.disabled = false;
            emailField.classList.remove("bg-gray-100");
            if (presets.presetEmail) emailField.value = presets.presetEmail;
          }
          if (nameField && presets.presetName) nameField.value = presets.presetName;
          if (phoneField && presets.presetPhone) phoneField.value = presets.presetPhone;
          if (propertyInput) propertyInput.value = window.location.href;
          if (noEmailCheckbox) noEmailCheckbox.checked = false;
        } else {
          const errorMessages = data.errors?.join("\n") || data.message || "Сталася помилка.";
          showNotification(errorMessages, true);
        }
      } catch (error) {
        console.error(error);
        showNotification("Помилка з'єднання з сервером.", true);
      }
    });
  });
})();
