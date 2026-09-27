const { JSDOM } = require("jsdom");
const fs = require("fs");
const assert = require("node:assert/strict");
const vm = require("vm");
const root = require("node:path").join(__dirname, "../site/");
const html = fs.readFileSync(root + "week-01.html", "utf8");
const js = fs.readFileSync(root + "course.js", "utf8");
const themeJs = fs.readFileSync(root + "theme.js", "utf8");
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
  function themePage(file, saved, denied = false) {
    const page = new JSDOM(fs.readFileSync(root + file, "utf8"), {
      url: "http://localhost:8080/" + file,
      runScripts: "outside-only",
    });
    if (saved) page.window.localStorage.setItem("kubik-theme", saved);
    if (denied)
      Object.defineProperty(page.window, "localStorage", {
        get() {
          throw Error("disabled");
        },
      });
    page.window.eval(themeJs);
    page.window.document.dispatchEvent(
      new page.window.Event("DOMContentLoaded"),
    );
    return page.window;
  }
  let themed = themePage("index.html");
  assert.equal(themed.document.documentElement.dataset.theme, "light");
  themed.document.querySelector("#theme-switch").click();
  assert.equal(themed.document.documentElement.dataset.theme, "dark");
  assert.equal(
    themed.document.querySelector("#theme-switch").getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(themed.localStorage.getItem("kubik-theme"), "dark");
  themed.close();
  themed = themePage("week-01.html", "dark");
  assert.equal(themed.document.documentElement.dataset.theme, "dark");
  assert.equal(
    themed.document.querySelector('meta[name="theme-color"]').content,
    "#1b192b",
  );
  themed.document.querySelector("#theme-switch").click();
  assert.equal(themed.document.documentElement.dataset.theme, "light");
  themed.close();
  themed = themePage("week-02.html", "dark");
  assert.equal(themed.document.documentElement.dataset.theme, "dark");
  themed.close();
  themed = themePage("week-03.html", "dark");
  assert.equal(themed.document.documentElement.dataset.theme, "dark");
  themed.close();
  themed = themePage("week-04.html", "dark");
  assert.equal(themed.document.documentElement.dataset.theme, "dark");
  themed.close();
  themed = themePage("index.html", "invalid", true);
  themed.document.querySelector("#theme-switch").click();
  assert.equal(themed.document.documentElement.dataset.theme, "dark");
  themed.close();
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
  const visual = new JSDOM(html, {
    url: "http://localhost:8080/week-01.html",
    runScripts: "outside-only",
  });
  const visualDoc = visual.window.document;
  const shots = JSON.parse(
    fs.readFileSync(root + "assets/blender/screenshots.json", "utf8"),
  );
  assert.equal(
    visualDoc.querySelectorAll(".mission .steps>li>.visual-help").length,
    11,
  );
  assert.ok(
    visualDoc.querySelectorAll("details.hint .visual-help").length >= 10,
  );
  for (const [id, shot] of Object.entries(shots)) {
    assert.ok(
      fs.existsSync(root + "assets/blender/" + shot.file),
      `missing screenshot ${id}`,
    );
    assert.ok(
      visualDoc.querySelector(`a[data-screenshot="${id}"]`),
      `unused screenshot ${id}`,
    );
  }
  let opened = false;
  let closed = false;
  const viewer = visualDoc.querySelector("#screenshot-viewer");
  viewer.showModal = () => {
    opened = true;
  };
  viewer.close = () => {
    closed = true;
  };
  visual.window.eval(fs.readFileSync(root + "visual-guides.js", "utf8"));
  const sample = visualDoc.querySelector('a[data-screenshot="select"]');
  sample.click();
  assert.ok(opened);
  assert.match(viewer.querySelector("img").src, /01-select\.jpg$/);
  viewer.querySelector("button").click();
  assert.ok(closed);
  visual.window.close();
  const rocketHtml = fs.readFileSync(root + "week-02.html", "utf8");
  const rocketShots = JSON.parse(
    fs.readFileSync(root + "assets/blender/rocket/screenshots.json", "utf8"),
  );
  const rocket = new JSDOM(rocketHtml, {
    url: "http://localhost:8080/week-02.html#mission-2",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  rocket.window.HTMLElement.prototype.scrollIntoView = function () {};
  rocket.window.confirm = () => true;
  rocket.window.eval(js);
  assert.equal(
    rocket.window.document.querySelector(".mission:not([hidden])").id,
    "mission-2",
  );
  const rocketChecks =
    rocket.window.document.querySelectorAll("[data-progress]");
  assert.equal(rocketChecks.length, 8);
  rocketChecks[0].click();
  assert.equal(
    JSON.parse(rocket.window.localStorage.getItem("kubik-week02-progress-v1"))
      .pad,
    true,
  );
  assert.equal(
    rocket.window.localStorage.getItem("kubik-week01-progress-v2"),
    null,
  );
  assert.equal(
    rocket.window.document.querySelectorAll(".visual-help").length,
    13,
  );
  for (const [id, shot] of Object.entries(rocketShots)) {
    assert.ok(
      fs.existsSync(root + "assets/blender/rocket/" + shot.file),
      `missing rocket screenshot ${id}`,
    );
    assert.ok(
      rocket.window.document.querySelector(`a[data-screenshot="rocket-${id}"]`),
      `unused rocket screenshot ${id}`,
    );
  }
  rocket.window.document.querySelector("#reset-progress").click();
  assert.equal(rocketChecks[0].checked, false);
  rocket.window.close();
  const townHtml = fs.readFileSync(root + "week-03.html", "utf8");
  const townShots = JSON.parse(
    fs.readFileSync(root + "assets/blender/town/screenshots.json", "utf8"),
  );
  const town = new JSDOM(townHtml, {
    url: "http://localhost:8080/week-03.html#mission-2",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  town.window.HTMLElement.prototype.scrollIntoView = function () {};
  town.window.confirm = () => true;
  town.window.eval(js);
  assert.equal(
    town.window.document.querySelector(".mission:not([hidden])").id,
    "mission-2",
  );
  const townChecks = town.window.document.querySelectorAll("[data-progress]");
  assert.equal(townChecks.length, 8);
  townChecks[2].click();
  assert.equal(
    JSON.parse(town.window.localStorage.getItem("kubik-week03-progress-v1"))
      .copy,
    true,
  );
  assert.equal(town.window.localStorage.getItem("kubik-week02-progress-v1"), null);
  assert.equal(town.window.document.querySelectorAll(".visual-help").length, 10);
  assert.match(townHtml, /Что ты заметил\?/);
  for (const [id, shot] of Object.entries(townShots)) {
    assert.ok(
      fs.existsSync(root + "assets/blender/town/" + shot.file),
      `missing town screenshot ${id}`,
    );
    assert.ok(
      town.window.document.querySelector(`a[data-screenshot="town-${id}"]`),
      `unused town screenshot ${id}`,
    );
  }
  town.window.document.querySelector("#reset-progress").click();
  assert.equal(townChecks[2].checked, false);
  town.window.close();
  const chestHtml = fs.readFileSync(root + "week-04.html", "utf8");
  const chestShots = JSON.parse(
    fs.readFileSync(root + "assets/blender/chest/screenshots.json", "utf8"),
  );
  const chest = new JSDOM(chestHtml, {
    url: "http://localhost:8080/week-04.html#mission-2",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  chest.window.HTMLElement.prototype.scrollIntoView = function () {};
  chest.window.confirm = () => true;
  chest.window.eval(js);
  assert.equal(chest.window.document.querySelector(".mission:not([hidden])").id, "mission-2");
  const chestChecks = chest.window.document.querySelectorAll("[data-progress]");
  assert.equal(chestChecks.length, 8);
  chestChecks[2].click();
  assert.equal(JSON.parse(chest.window.localStorage.getItem("kubik-week04-progress-v1")).face, true);
  assert.equal(chest.window.localStorage.getItem("kubik-week03-progress-v1"), null);
  assert.equal(chest.window.document.querySelectorAll(".visual-help").length, 10);
  assert.match(chestHtml, /Миссия 1 \/ 4 · лёгкий разогрев/);
  assert.match(chestHtml, /Миссия 2 \/ 4 · новое действие с помощью/);
  for (const [id, shot] of Object.entries(chestShots)) {
    assert.ok(fs.existsSync(root + "assets/blender/chest/" + shot.file), `missing chest screenshot ${id}`);
    assert.ok(chest.window.document.querySelector(`a[data-screenshot="chest-${id}"]`), `unused chest screenshot ${id}`);
  }
  chest.window.document.querySelector("#reset-progress").click();
  assert.equal(chestChecks[2].checked, false);
  chest.window.close();
  for (const file of ["index.html", "week-01.html", "week-02.html", "week-03.html", "week-04.html"]) {
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
    addAll: async (requests) => {
      for (const request of requests) {
        const p =
          new URL(request.url).pathname.replace(/^\//, "") || "index.html";
        assert.equal(request.cache, "reload");
        assert.ok(fs.existsSync(root + p));
        data.set(request.url, {
          path: p === "index.html" ? "./index.html" : "./" + p,
        });
      }
    },
    match: async (r) =>
      data.get(
        typeof r === "string"
          ? new URL(r, "http://localhost:8080/").href
          : r.url,
      ),
    put: async (r, response) => data.set(r.url, response),
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
    Request,
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
  ctx.fetch = async () => ({
    ok: true,
    clone() {
      return this;
    },
    source: "network",
  });
  assert.equal((await request("week-01.html", "navigate")).source, "network");
  assert.equal(
    (await request("assets/blender/01-select.jpg", "no-cors")).source,
    "network",
  );
  ctx.fetch = async () => {
    throw Error("offline");
  };
  assert.equal((await request("week-01.html", "navigate")).source, "network");
  assert.equal(
    (await request("assets/blender/01-select.jpg", "no-cors")).source,
    "network",
  );
  console.log(
    "PASS: theme switching/persistence/fallback, navigation, progress, reset, storage failures, local assets, SW precache and offline fallbacks.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
