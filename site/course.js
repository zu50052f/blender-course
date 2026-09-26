(() => {
  "use strict";
  const missions = [...document.querySelectorAll(".mission")];
  if (missions.length) {
    const links = [...document.querySelectorAll(".mission-link")];
    const checks = [...document.querySelectorAll("[data-progress]")];
    const storageKey = "kubik-week01-progress-v2";
    let saved = {};
    let storageAvailable = true;
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (value && typeof value === "object" && !Array.isArray(value))
        saved = value;
    } catch (_) {
      storageAvailable = false;
    }
    function update() {
      const done = checks.filter((c) => c.checked).length;
      document.querySelector("#progress-label").textContent =
        `${done} из ${checks.length} открытий`;
      document.querySelector(".progress-fill").style.width =
        `${(done / checks.length) * 100}%`;
      document
        .querySelector('[role="progressbar"]')
        .setAttribute("aria-valuenow", done);
      document.querySelector("#celebration").hidden = done !== checks.length;
      missions.forEach((mission, i) => {
        const complete = [...mission.querySelectorAll("[data-progress]")].every(
          (c) => c.checked,
        );
        links[i].classList.toggle("is-done", complete);
        const badge = document.querySelectorAll(".badge")[i];
        badge.classList.toggle("earned", complete);
        badge.setAttribute(
          "aria-label",
          `${badge.title}: ${complete ? "получен" : "впереди"}`,
        );
      });
      document.querySelector("#storage-note").textContent = storageAvailable
        ? "Отметки сохраняются на этом устройстве."
        : "Браузер не сохраняет отметки. Пока страница открыта, они останутся здесь.";
    }
    checks.forEach((check) => {
      check.checked = saved[check.dataset.progress] === true;
      check.addEventListener("change", () => {
        saved[check.dataset.progress] = check.checked;
        try {
          localStorage.setItem(storageKey, JSON.stringify(saved));
          storageAvailable = true;
        } catch (_) {
          storageAvailable = false;
        }
        update();
      });
    });
    document.querySelector("#reset-progress").addEventListener("click", () => {
      if (
        !confirm("Убрать все отметки? Сам робот в Blender останется на месте.")
      )
        return;
      saved = {};
      checks.forEach((check) => {
        check.checked = false;
      });
      try {
        localStorage.removeItem(storageKey);
      } catch (_) {
        storageAvailable = false;
      }
      update();
    });
    // Preserve links to the previous course's lesson anchors.
    function activeId() {
      const match = location.hash.match(/^#(?:mission-|lesson-)([1-4])$/);
      return match ? `mission-${match[1]}` : "mission-1";
    }
    function showMission(moveFocus = false) {
      const id = activeId();
      missions.forEach((m) => {
        m.hidden = m.id !== id;
      });
      links.forEach((link) => {
        if (link.hash === `#${id}`) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      });
      if (moveFocus)
        document.querySelector(`#${id} h2`).focus({ preventScroll: true });
    }
    showMission();
    update();
    addEventListener("hashchange", () => {
      if (/^#(?:mission-|lesson-)[1-4]$/.test(location.hash)) {
        showMission(true);
        document.getElementById(activeId()).scrollIntoView({ block: "start" });
      }
    });
    // A same-hash link does not fire hashchange.
    document.querySelectorAll('a[href^="#mission-"]').forEach((link) => {
      link.addEventListener("click", () => {
        if (link.hash === location.hash) showMission(true);
      });
    });
    if (/^#(?:mission-|lesson-)[1-4]$/.test(location.hash)) {
      requestAnimationFrame(() =>
        document.getElementById(activeId()).scrollIntoView(),
      );
    }
  }
  document.querySelectorAll('a[href="#grownups"]').forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelector("#grownups").open = true;
    });
  });
  if (location.hash === "#grownups")
    document.querySelector("#grownups").open = true;
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }
})();
