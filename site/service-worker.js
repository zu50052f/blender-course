const CACHE_NAME = "blender-course-v18-plane";
const VISUAL_CACHE_NAME = "blender-course-visuals-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./week-01.html",
  "./week-02.html",
  "./week-02.css",
  "./week-03.html",
  "./week-03.css",
  "./week-04.html",
  "./week-04.css",
  "./week-05.html",
  "./week-05.css",
  "./styles.css",
  "./theme.css",
  "./course.js",
  "./theme.js",
  "./visual-guides.css",
  "./visual-guides.js",
  "./offline-week.css",
  "./offline-week.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/robot-mascot.jpg",
  "./assets/rocket-mascot.svg",
  "./assets/town-mascot.svg",
  "./assets/chest-mascot.svg",
  "./assets/plane-mascot.svg",
  "./assets/step-1.svg",
  "./assets/step-2.svg",
  "./assets/step-3.svg",
  "./assets/step-4.svg",
];
const VISUAL_ROOT = new URL("./assets/blender/", self.registration.scope).href;

function checkedVisualUrls(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 120)
    throw new Error("Invalid visual guide list");
  return [...new Set(value.map((entry) => {
    if (typeof entry !== "string") throw new Error("Invalid visual guide URL");
    const url = new URL(entry, self.registration.scope);
    if (!url.href.startsWith(VISUAL_ROOT) || url.search || url.hash)
      throw new Error("Visual guide outside this course");
    return url.href;
  }))];
}

self.addEventListener("message", (event) => {
  const port = event.ports && event.ports[0];
  const type = event.data && event.data.type;
  if (!port || !["CHECK_WEEK_VISUALS", "SAVE_WEEK_VISUALS"].includes(type)) return;
  event.waitUntil((async () => {
    try {
      const urls = checkedVisualUrls(event.data.urls);
      const cache = await caches.open(VISUAL_CACHE_NAME);
      let saved = 0;
      for (const url of urls) {
        const request = new Request(url, { cache: "reload" });
        if (await cache.match(request)) {
          saved++;
        } else if (type === "SAVE_WEEK_VISUALS") {
          const response = await fetch(request);
          if (!response.ok) throw new Error("Visual guide download failed");
          await cache.put(request, response.clone());
          saved++;
        }
        if (type === "SAVE_WEEK_VISUALS")
          port.postMessage({ type: "progress", saved, total: urls.length });
      }
      port.postMessage({ type: "done", saved, total: urls.length, ready: saved === urls.length });
    } catch (_) {
      port.postMessage({ type: "error" });
    }
  })());
});
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
      .then(async (keys) => {
        const visualCache = await caches.open(VISUAL_CACHE_NAME);
        for (const key of [...keys].reverse()) {
          if (!key.startsWith("blender-course-") ||
              key === CACHE_NAME || key === VISUAL_CACHE_NAME) continue;
          const oldCache = await caches.open(key);
          for (const request of await oldCache.keys()) {
            if (!request.url.startsWith(VISUAL_ROOT) ||
                await visualCache.match(request)) continue;
            const response = await oldCache.match(request);
            try {
              await visualCache.put(request, response);
            } catch (_) {
              // The new cache may be full. The readiness check will report gaps.
            }
          }
          await caches.delete(key);
        }
      })
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
    caches.open(CACHE_NAME).then(async (coreCache) => {
      if (event.request.mode === "navigate") {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            try {
              await coreCache.put(event.request, response.clone());
            } catch (_) {
              // Keep showing the fetched page if caching is unavailable.
            }
          }
          return response;
        } catch (_) {
          return (
            (await coreCache.match(event.request)) ||
            (await coreCache.match("./index.html"))
          );
        }
      }
      const visual = url.href.startsWith(VISUAL_ROOT);
      const cache = visual ? await caches.open(VISUAL_CACHE_NAME) : coreCache;
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok && visual)
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
