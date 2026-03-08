(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const headerQField = document.getElementById("q-main");
    const hiddenQField = document.getElementById("q-hidden");
    const searchForm = document.getElementById("main-search-form");

    if (!headerQField || !hiddenQField || !searchForm) {
      return;
    }

    const syncQuery = () => {
      hiddenQField.value = headerQField.value;
    };

    const submitBtn = searchForm.querySelector('button[type="submit"]');
    submitBtn?.addEventListener("click", syncQuery);
    searchForm.addEventListener("submit", syncQuery);
    headerQField.addEventListener("input", syncQuery);
  });
})();
