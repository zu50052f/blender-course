(() => {
  "use strict";
  const key = "kubik-theme";
  let theme = "light";
  try {
    if (localStorage.getItem(key) === "dark") theme = "dark";
  } catch (_) {
    // The switch still works for this page if storage is unavailable.
  }

  function apply(next) {
    theme = next;
    document.documentElement.dataset.theme = theme;
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = theme === "dark" ? "#1b192b" : "#fffaf0";
    const button = document.querySelector("#theme-switch");
    if (!button) return;
    const dark = theme === "dark";
    const label = dark ? "Светлая тема" : "Тёмная тема";
    button.hidden = false;
    button.setAttribute("aria-pressed", String(dark));
    button.title = label;
    button.querySelector(".theme-icon").textContent = dark ? "☀" : "☾";
    button.querySelector(".theme-label").textContent = label;
  }

  apply(theme);
  document.addEventListener("DOMContentLoaded", () => {
    apply(theme);
    document.querySelector("#theme-switch")?.addEventListener("click", () => {
      apply(theme === "dark" ? "light" : "dark");
      try {
        localStorage.setItem(key, theme);
      } catch (_) {
        // The current page still changes theme.
      }
    });
  });
})();
