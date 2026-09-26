const CACHE_NAME = "blender-course-v5-visual-guides";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./week-01.html",
  "./styles.css",
  "./course.js",
  "./visual-guides.css",
  "./visual-guides.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/robot-mascot.jpg",
  "./assets/step-1.svg",
  "./assets/step-2.svg",
  "./assets/step-3.svg",
  "./assets/step-4.svg",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("blender-course-") && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok && url.pathname.includes("/assets/blender/"))
          try {
            await cache.put(event.request, response.clone());
          } catch (_) {
            /* Cache may be full; keep the network image. */
          }
        return response;
      } catch (_) {
        if (event.request.mode === "navigate")
          return await cache.match("./index.html");
        return Response.error();
      }
    }),
  );
});
