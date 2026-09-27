const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..", "site");
const page = path.join(root, "week-03.html");
const screenshotWidth = 2992;
const screenshotHeight = 1680;
const shots = JSON.parse(
  fs.readFileSync(
    path.join(root, "assets/blender/town/screenshots.json"),
    "utf8",
  ),
);
const dom = new JSDOM(fs.readFileSync(page, "utf8"));
const doc = dom.window.document;

for (const details of doc.querySelectorAll(".visual-help[data-shots]")) {
  const ids = details.dataset.shots.split(/\s+/);
  const summary = details.querySelector(":scope > summary");
  if (!summary) throw Error("Screenshot guide has no summary");
  for (const node of [...details.childNodes]) {
    if (node !== summary) node.remove();
  }
  const intro = doc.createElement("p");
  intro.className = "guide-intro";
  intro.textContent =
    "Настоящий Blender 5.2. Нажми на картинку, чтобы рассмотреть её крупнее. Твоя модель может выглядеть иначе.";
  details.append(intro);
  const list = doc.createElement("ol");
  list.className = "screenshot-steps";
  for (const id of ids) {
    const shot = shots[id];
    if (!shot) throw Error(`Unknown town screenshot ${id}`);
    const item = doc.createElement("li");
    const title = doc.createElement("h4");
    title.textContent = shot.title;
    item.append(title);
    const link = doc.createElement("a");
    link.className = "screenshot-frame";
    link.href = `assets/blender/town/${shot.file}`;
    link.dataset.screenshot = `town-${id}`;
    link.dataset.caption = `${shot.title} — ${shot.instruction}`;
    link.setAttribute("aria-label", `Увеличить: ${shot.title}`);
    const image = doc.createElement("img");
    image.src = link.href;
    image.alt = `Скриншот Blender 5.2: ${shot.title}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.width = screenshotWidth;
    image.height = screenshotHeight;
    link.append(image);
    if (shot.crop) {
      const [x, y, w, h] = shot.crop;
      link.classList.add("screenshot-cropped");
      link.style.aspectRatio = `${w * screenshotWidth} / ${h * screenshotHeight}`;
      image.style.cssText = `width:${10000 / w}%;max-width:none;position:absolute;left:${(-x * 100) / w}%;top:${(-y * 100) / h}%;`;
    }
    if (shot.target) {
      const [x, y, w, h] = shot.target;
      const target = doc.createElement("span");
      target.className = "screenshot-target";
      target.setAttribute("aria-hidden", "true");
      target.style.cssText = `--x:${x}%;--y:${y}%;--w:${w}%;--h:${h}%;`;
      link.append(target);
    }
    item.append(link);
    const caption = doc.createElement("p");
    caption.className = "screenshot-caption";
    caption.textContent = shot.instruction;
    item.append(caption);
    const result = doc.createElement("p");
    result.className = "screenshot-result";
    const bold = doc.createElement("strong");
    bold.textContent = "Проверь: ";
    result.append(bold, shot.result);
    item.append(result);
    list.append(item);
  }
  details.append(list);
}

fs.writeFileSync(
  page,
  ("<!doctype html>\n" + doc.documentElement.outerHTML + "\n")
    .replace(/[\t ]+$/gm, "")
    .replace(/\n+<\/body>/, "\n</body>"),
);
console.log(
  `Generated ${doc.querySelectorAll(".visual-help").length} town guides with ${Object.keys(shots).length} Blender screenshots.`,
);
