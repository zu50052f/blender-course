/* Screenshots remain ordinary linked images when JavaScript is unavailable. */
(() => {
  const viewer = document.querySelector("#screenshot-viewer");
  if (!viewer || typeof viewer.showModal !== "function") return;
  const image = viewer.querySelector("img");
  const caption = viewer.querySelector("#screenshot-caption");
  let trigger;
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-screenshot]");
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    trigger = link;
    image.src = link.href;
    image.alt = link.querySelector("img").alt;
    caption.textContent = link.dataset.caption;
    viewer.showModal();
  });
  viewer
    .querySelector("button")
    .addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", (event) => {
    if (event.target !== viewer) return;
    const rect = viewer.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      viewer.close();
  });
  viewer.addEventListener("close", () => trigger?.focus());
})();
