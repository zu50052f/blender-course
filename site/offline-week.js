(() => {
  "use strict";
  const missionNav = document.querySelector(".mission-nav");
  if (!missionNav) return;

  const urls = [...new Set(
    [...document.querySelectorAll('a[data-screenshot], img[src*="assets/blender/"]')]
      .map((element) => new URL(element.href || element.src, document.baseURI).href),
  )];
  if (!urls.length) return;

  const panel = document.createElement("section");
  panel.className = "offline-panel";
  panel.setAttribute("aria-label", "Подготовка урока без интернета");
  panel.innerHTML = '<div><strong>Урок без интернета</strong><p>Если планируете заниматься без сети, взрослый может заранее сохранить снимки этой недели. Пока вы онлайн, картинки открываются сами.</p><p class="offline-status" role="status" aria-live="polite">Проверяем подсказки…</p></div><button class="button offline-save" type="button" disabled>Сохранить неделю офлайн</button>';
  missionNav.after(panel);
  const button = panel.querySelector("button");
  const status = panel.querySelector(".offline-status");

  function show(saved, total, ready) {
    if (ready) {
      status.textContent = `Готово: все ${total} снимков доступны без интернета на этом устройстве.`;
      button.textContent = "Снимки сохранены ✓";
      button.disabled = true;
    } else {
      status.textContent = `Сохранено ${saved} из ${total} снимков. Без интернета часть подсказок не откроется.`;
      button.textContent = "Сохранить неделю офлайн";
      button.disabled = false;
    }
  }

  async function askWorker(type) {
    const registration = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Service worker unavailable")), 15000);
      navigator.serviceWorker.ready.then(
        (value) => { clearTimeout(timeout); resolve(value); },
        (error) => { clearTimeout(timeout); reject(error); },
      );
    });
    const worker = registration.active || navigator.serviceWorker.controller;
    if (!worker || typeof MessageChannel === "undefined")
      throw new Error("Offline saving unavailable");
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      let timeout;
      function armTimeout() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          channel.port1.close();
          reject(new Error("Offline saving timed out"));
        }, type === "CHECK_WEEK_VISUALS" ? 6000 : 60000);
      }
      armTimeout();
      channel.port1.onmessage = ({ data }) => {
        if (data.type === "progress") {
          status.textContent = `Сохраняем снимки: ${data.saved} из ${data.total}…`;
          armTimeout();
          return;
        }
        clearTimeout(timeout);
        channel.port1.close();
        if (data.type === "done") resolve(data);
        else reject(new Error("Offline saving failed"));
      };
      worker.postMessage({ type, urls }, [channel.port2]);
    });
  }

  if (!("serviceWorker" in navigator) || !("caches" in window)) {
    status.textContent = "Этот браузер не поддерживает сохранение подсказок офлайн.";
    return;
  }
  let checkVersion = 0;
  let saving = false;
  function refresh() {
    if (saving) return;
    const version = ++checkVersion;
    askWorker("CHECK_WEEK_VISUALS")
      .then(({ saved, total, ready }) => {
        if (version === checkVersion) show(saved, total, ready);
      })
      .catch(() => {
        if (version !== checkVersion) return;
        status.textContent = "Не удалось проверить снимки. Онлайн-урок всё равно работает.";
        button.disabled = false;
      });
  }
  refresh();
  addEventListener("load", refresh, { once: true });
  navigator.serviceWorker.addEventListener?.("controllerchange", refresh);
  button.addEventListener("click", async () => {
    if (saving) return;
    saving = true;
    checkVersion++;
    button.disabled = true;
    status.textContent = "Подключитесь к интернету: сохраняем снимки…";
    try {
      const { saved, total, ready } = await askWorker("SAVE_WEEK_VISUALS");
      show(saved, total, ready);
    } catch (_) {
      status.textContent = "Не удалось сохранить все снимки. Проверьте интернет и свободное место, затем попробуйте снова.";
      button.disabled = false;
    } finally {
      saving = false;
    }
  });

  function showImageError(image) {
    if (!(image instanceof HTMLImageElement) || !image.src.includes("/assets/blender/")) return;
    const frame = image.closest(".screenshot-frame, .lesson-visual, .screenshot-scroll");
    if (!frame || image.dataset.offlineErrorShown) return;
    image.dataset.offlineErrorShown = "true";
    const note = document.createElement("p");
    note.className = "offline-image-error";
    note.textContent = "Снимок не загрузился. Подключитесь к интернету или сохраните неделю заранее.";
    if (frame.classList.contains("screenshot-frame")) frame.after(note);
    else frame.append(note);
  }
  document.addEventListener("error", (event) => showImageError(event.target), true);
  addEventListener("load", () => {
    for (const image of document.querySelectorAll('img[src*="assets/blender/"]'))
      if (image.complete && image.naturalWidth === 0) showImageError(image);
  }, { once: true });
})();
