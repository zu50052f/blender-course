const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const root = path.join(__dirname, "..", "site");
const dom = new JSDOM(fs.readFileSync(path.join(root, "week-01.html"), "utf8"));
const doc = dom.window.document;
const shots = JSON.parse(
  fs.readFileSync(path.join(root, "assets/blender/screenshots.json"), "utf8"),
);
function guide(title, ids) {
  const details = doc.createElement("details");
  details.className = "visual-help";
  details.dataset.actions = ids.join(" ");
  const summary = doc.createElement("summary");
  summary.textContent = "Покажи мне: " + title;
  details.append(summary);
  const intro = doc.createElement("p");
  intro.className = "guide-intro";
  intro.textContent =
    "Настоящий Blender 5.2. Нажми на картинку, чтобы рассмотреть её крупнее. Твоя модель может выглядеть иначе.";
  details.append(intro);
  const list = doc.createElement("ol");
  list.className = "screenshot-steps";
  details.append(list);
  for (const id of ids) {
    const shot = shots[id];
    if (!shot) throw Error("Unknown screenshot " + id);
    const li = doc.createElement("li");
    const title = doc.createElement("h4");
    title.textContent = shot.title;
    li.append(title);
    const link = doc.createElement("a");
    link.className = "screenshot-frame";
    link.href = "assets/blender/" + shot.file;
    link.dataset.screenshot = id;
    link.dataset.caption = shot.title + " — " + shot.instruction;
    link.setAttribute("aria-label", "Увеличить: " + shot.title);
    const image = doc.createElement("img");
    image.src = link.href;
    image.alt = shot.alt;
    image.loading = "lazy";
    image.decoding = "async";
    image.width = shot.width;
    image.height = shot.height;
    link.append(image);
    if (shot.crop) {
      const [x, y, w, h] = shot.crop;
      link.classList.add("screenshot-cropped");
      link.style.aspectRatio = `${w * shot.width} / ${h * shot.height}`;
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
    li.append(link);
    const caption = doc.createElement("p");
    caption.className = "screenshot-caption";
    caption.textContent = shot.instruction;
    li.append(caption);
    const result = doc.createElement("p");
    result.className = "screenshot-result";
    const bold = doc.createElement("strong");
    bold.textContent = "Проверь: ";
    result.append(bold, shot.result);
    li.append(result);
    list.append(li);
  }
  return details;
}
// Re-running the builder is safe: regenerate only its own panels.
doc
  .querySelectorAll(".visual-help,#screenshot-viewer")
  .forEach((el) => el.remove());
const steps = [...doc.querySelectorAll(".mission .steps>li")];
const panels = [
  ["выбрать и приблизить куб", ["select", "zoom"]],
  ["изменить размер", ["scale"]],
  ["добавить куб и поднять голову", ["add-menu", "cube-menu", "move-up"]],
  ["поставить руку сбоку", ["move-side"]],
  ["сделать вторую руку", ["copy"]],
  ["поставить ноги", ["legs"]],
  null,
  ["добавить шарик", ["sphere-menu", "eye-front"]],
  ["повернуть руку", ["rotate"]],
  ["покрасить робота", ["material-new", "base-color", "preview"]],
  ["покрасить другую деталь", ["shared-material"]],
  ["сохранить свою работу", ["file-menu", "save-dialog"]],
];
steps.forEach((step, i) => {
  if (panels[i]) step.append(guide(...panels[i]));
});
const hints = {
  "Хочу посмотреть с другой стороны": ["осмотреть куб", ["orbit"]],
  "Если получилось не так": [
    "отменить действие и растянуть куб",
    ["undo-menu", "stretch"],
  ],
  "Куда делся новый куб?": ["посмотреть спереди", ["view-root", "view-menu"]],
  "Как сделать длинную руку?": ["вытянуть руку", ["stretch"]],
  "Копия убежала или наложилась на руку": ["передвинуть копию", ["copy"]],
  "Хочу свериться со схемой": ["сравнить с Blender", ["legs"]],
  "Как поставить глаза перед лицом?": [
    "проверить глаз спереди и сбоку",
    ["eye-front", "view-menu", "eye-side"],
  ],
  "Ещё одна идея, если хочется": ["смешная антенна", ["sphere-menu", "rotate"]],
  "Хочу сделать улыбку кривой": [
    "сделать улыбку кривой",
    [
      "curve-menu",
      "smile-place",
      "smile-subdivide",
      "smile-points",
      "smile-bevel",
      "smile-final",
    ],
  ],
  "Я поменял цвет, но робот серый": ["включить цветной вид", ["preview"]],
  "Почему поменялись сразу две детали?": [
    "сделать отдельный материал",
    ["shared-material"],
  ],
  "Для взрослого: камера, свет и PNG": [
    "сделать фото вместе",
    [
      "camera-menu",
      "camera-frame",
      "add-light",
      "light-settings",
      "render-menu",
      "render-result",
      "image-menu",
      "image-save",
    ],
  ],
  "Сохранить робота и продолжить в другой день": [
    "сохранить и снова открыть",
    ["file-menu", "save-dialog", "open-dialog"],
  ],
};
for (const el of doc.querySelectorAll("details.hint")) {
  const key = el.querySelector("summary")?.textContent.trim();
  if (hints[key]) el.append(guide(...hints[key]));
}
const dialog = doc.createElement("dialog");
dialog.id = "screenshot-viewer";
dialog.setAttribute("aria-labelledby", "screenshot-caption");
dialog.innerHTML =
  '<div class="screenshot-toolbar"><p id="screenshot-caption"></p><button type="button" autofocus>Закрыть ✕</button></div><div class="screenshot-scroll"><img alt=""></div><p class="image-zoom-note">На маленьком экране картинку можно прокрутить в стороны. Esc — закрыть.</p>';
doc.body.append(dialog);
for (const [tag, attr, value] of [
  ["link", "href", "visual-guides.css"],
  ["script", "src", "visual-guides.js"],
]) {
  if (!doc.querySelector(`${tag}[${attr}="${value}"]`)) {
    const el = doc.createElement(tag);
    el.setAttribute(attr, value);
    if (tag === "link") el.rel = "stylesheet";
    else el.defer = true;
    doc.head.append(el);
  }
}
fs.writeFileSync(
  path.join(root, "week-01.html"),
  "<!doctype html>\n" + doc.documentElement.outerHTML + "\n",
);
console.log(
  "Generated " +
    doc.querySelectorAll(".visual-help").length +
    " visual guides covering " +
    Object.keys(shots).length +
    " Blender actions.",
);
