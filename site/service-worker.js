const CACHE_NAME = "blender-course-v15-tiny-town";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./week-01.html",
  "./week-02.html",
  "./week-02.css",
  "./week-03.html",
  "./week-03.css",
  "./styles.css",
  "./theme.css",
  "./course.js",
  "./theme.js",
  "./visual-guides.css",
  "./visual-guides.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/robot-mascot.jpg",
  "./assets/rocket-mascot.svg",
  "./assets/town-mascot.svg",
  "./assets/step-1.svg",
  "./assets/step-2.svg",
  "./assets/step-3.svg",
  "./assets/step-4.svg",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          CORE_ASSETS.map(
            (asset) =>
              new Request(new URL(asset, self.registration.scope), {
                cache: "reload",
              }),
          ),
        ),
      )
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
      if (event.request.mode === "navigate") {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            try {
              await cache.put(event.request, response.clone());
            } catch (_) {
              // Keep showing the fetched page if caching is unavailable.
            }
          }
          return response;
        } catch (_) {
          return (
            (await cache.match(event.request)) ||
            (await cache.match("./index.html"))
          );
        }
      }
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
        return Response.error();
      }
    }),
  );
});
