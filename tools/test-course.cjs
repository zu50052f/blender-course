const { JSDOM } = require("jsdom");
const fs = require("fs");
const assert = require("node:assert/strict");
const vm = require("vm");
const root = require("node:path").join(__dirname, "../site/");
const html = fs.readFileSync(root + "week-01.html", "utf8");
const js = fs.readFileSync(root + "course.js", "utf8");
function setup(saved, fail = false, hash = "") {
  const d = new JSDOM(html, {
    url: "http://localhost:8080/week-01.html" + hash,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = d.window;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  if (saved !== undefined)
    w.localStorage.setItem("kubik-week01-progress-v2", saved);
  if (fail)
    Object.defineProperty(w, "localStorage", {
      get() {
        throw Error("disabled");
      },
    });
  w.confirm = () => true;
  w.eval(js);
  return w;
}
(async () => {
  for (const bad of ["null", "false", "[]", "invalid", "42"]) {
    let w = setup(bad);
    assert.equal(
      w.document.querySelectorAll(".mission:not([hidden])").length,
      1,
    );
    w.close();
  }
  let w = setup();
  let cb = w.document.querySelector('[data-progress="cubes"]');
  cb.click();
  assert.equal(
    w.document
      .querySelector("[role=progressbar]")
      .getAttribute("aria-valuenow"),
    "1",
  );
  const saved = w.localStorage.getItem("kubik-week01-progress-v2");
  w.close();
  w = setup(saved);
  assert.equal(
    w.document.querySelector('[data-progress="cubes"]').checked,
    true,
  );
  w.confirm = () => false;
  w.document.querySelector("#reset-progress").click();
  assert.equal(
    w.document.querySelector('[data-progress="cubes"]').checked,
    true,
  );
  w.confirm = () => true;
  w.document.querySelector("#reset-progress").click();
  assert.equal(
    w.document.querySelector('[data-progress="cubes"]').checked,
    false,
  );
  w.close();
  w = setup(undefined, true);
  w.document.querySelector('[data-progress="cubes"]').click();
  assert.match(
    w.document.querySelector("#storage-note").textContent,
    /не сохраняет/,
  );
  w.document.querySelector("#reset-progress").click();
  w.close();
  w = setup(undefined, false, "#mission-3");
  assert.equal(
    w.document.querySelector(".mission:not([hidden])").id,
    "mission-3",
  );
  w.location.hash = "#mission-2";
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(
    w.document.querySelector(".mission:not([hidden])").id,
    "mission-2",
  );
  assert.equal(w.document.activeElement.id, "title-2");
  w.document.querySelectorAll("[data-progress]").forEach((c) => c.click());
  assert.equal(w.document.querySelector("#celebration").hidden, false);
  assert.equal(w.document.querySelectorAll(".badge.earned").length, 4);
  w.close();
  w = setup(undefined, false, "#lesson-4");
  assert.equal(
    w.document.querySelector(".mission:not([hidden])").id,
    "mission-4",
  );
  w.close();
  const nojs = new JSDOM(html);
  assert.equal(
    nojs.window.document.querySelectorAll(".mission[hidden]").length,
    0,
  );
  nojs.window.close();
  for (const file of ["index.html", "week-01.html"]) {
    const dom = new JSDOM(fs.readFileSync(root + file, "utf8"));
    const doc = dom.window.document;
    for (const el of doc.querySelectorAll("[src],a[href],link[href]")) {
      const ref = el.getAttribute("src") || el.getAttribute("href");
      if (/^https?:/.test(ref)) continue;
      const [path, hash] = ref.split("#");
      const target = path || file;
      assert.ok(fs.existsSync(root + target), `${file}: missing ${target}`);
      if (hash) {
        const targetDoc = path
          ? new JSDOM(fs.readFileSync(root + target, "utf8")).window.document
          : doc;
        assert.ok(targetDoc.getElementById(hash), `missing anchor ${ref}`);
      }
    }
    dom.window.close();
  }
  // Exercise service-worker install, scoped cleanup, cache hits and offline fallback.
  const handlers = {};
  const data = new Map();
  const deleted = [];
  const keys = ["blender-course-v1", "unrelated-app"];
  const cache = {
    addAll: async (paths) => {
      for (const p of paths) {
        assert.ok(
          fs.existsSync(
            root + (p === "./" ? "index.html" : p.replace("./", "")),
          ),
        );
        data.set(new URL(p, "http://localhost:8080/").href, { path: p });
      }
    },
    match: async (r) =>
      data.get(
        typeof r === "string"
          ? new URL(r, "http://localhost:8080/").href
          : r.url,
      ),
  };
  const ctx = {
    self: {
      location: { origin: "http://localhost:8080" },
      registration: { scope: "http://localhost:8080/" },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (e, h) => (handlers[e] = h),
    },
    caches: {
      open: async () => cache,
      keys: async () => keys,
      delete: async (k) => deleted.push(k),
    },
    URL,
    Response,
    fetch: async () => {
      throw Error("offline");
    },
  };
  vm.runInNewContext(fs.readFileSync(root + "service-worker.js", "utf8"), ctx);
  await new Promise((resolve, reject) =>
    handlers.install({ waitUntil: (p) => p.then(resolve, reject) }),
  );
  await new Promise((resolve, reject) =>
    handlers.activate({ waitUntil: (p) => p.then(resolve, reject) }),
  );
  assert.deepEqual(deleted, ["blender-course-v1"]);
  async function request(path, mode) {
    let promise;
    handlers.fetch({
      request: { url: "http://localhost:8080/" + path, method: "GET", mode },
      respondWith: (p) => (promise = p),
    });
    return promise;
  }
  assert.equal(
    (await request("week-01.html", "navigate")).path,
    "./week-01.html",
  );
  assert.equal((await request("missing", "navigate")).path, "./index.html");
  assert.equal((await request("missing.png", "no-cors")).type, "error");
  console.log(
    "PASS: navigation, stable progress, reload state, reset/cancel, all badges, malformed/denied storage, legacy anchors, no-JS content, local links/assets, SW precache, scoped cleanup, offline fallbacks.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
