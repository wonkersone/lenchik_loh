const DESKTOP_W = 960;
const DESKTOP_H = 540;
const MOBILE_W = 630;
const MOBILE_H = 980;
let W = DESKTOP_W;
let H = DESKTOP_H;

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const hud = document.querySelector("#hud");
const gameMenu = document.querySelector("#gameMenu");
const titleEl = document.querySelector("#gameTitle");
const kindEl = document.querySelector("#gameKind");
const totalScoreEl = document.querySelector("#totalScore");
const restartBtn = document.querySelector("#restartBtn");
const menuBtn = document.querySelector("#menuBtn");
const pauseBtn = document.querySelector("#pauseBtn");

ctx.imageSmoothingEnabled = false;

const store = {
  best: JSON.parse(localStorage.getItem("lenchik-arcade-best") || "{}"),
  completed: new Set(JSON.parse(localStorage.getItem("lenchik-arcade-done") || "[]")),
};

const app = {
  images: {},
  sprites: {},
  game: null,
  activeId: null,
  running: false,
  paused: false,
  lastTime: 0,
  score: 0,
  time: 0,
  metric: "",
  pointer: { x: W / 2, y: H / 2, down: false },
  keys: new Set(),
};

const bgFiles = {
  school: "assets/backgrounds/crops/school.png",
  build: "assets/backgrounds/crops/build.png",
  race: "assets/backgrounds/crops/race.png",
  river: "assets/backgrounds/crops/river.png",
  arcade: "assets/backgrounds/crops/arcade.png",
};

const neededSprites = {
  lenya_pose: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  eva: [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  lenya_face: [0, 1, 2, 3, 4, 7, 9, 10, 12, 14, 15, 16, 17, 18, 19, 21, 22, 23],
  objects: [0, 1, 2, 3, 4, 5, 12, 13, 18, 21, 22, 60, 63, 64, 65, 66],
  racing: [17, 18, 19, 21, 52],
  construction: [41, 55],
  building_layers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  rowing: [0, 1, 2],
};

const games = [
  {
    id: "search",
    title: "Ребят, а вы не видели мой рюкзак?",
    kind: "внимательность",
    desc: "Найди нужную вещь среди школьного хаоса.",
    accent: "#43b6ff",
    icon: "lenya_face/lenya_face-23.png",
    introImage: "lenya_pose/lenya_pose-08.png",
    rules: "На поле спрятан ровно один рюкзак. Каждый раунд он другого цвета, а вокруг становится больше лишних вещей.",
    desktop: "Кликай по рюкзаку мышью.",
    mobile: "Касайся найденного рюкзака пальцем.",
    duration: 42,
    make: makeSearchGame,
  },
  {
    id: "whack",
    title: "Не бей Еву",
    kind: "реакция",
    desc: "Бей Лёню, Еву с тортиком не трогай.",
    accent: "#ff4f78",
    icon: "lenya_face/lenya_face-04.png",
    introImage: "eva/eva-03.png",
    rules: "Из лунок быстро выглядывают лица. Попадай по Лене и не трогай Еву с тортом.",
    desktop: "Наводи мышью и кликай по Лене.",
    mobile: "Бей по Лене быстрым тапом.",
    duration: 30,
    make: makeWhackGame,
  },
  {
    id: "build",
    title: "Строитель МГСУ",
    kind: "ловкость",
    desc: "Собери стройку повыше.",
    accent: "#ff9f43",
    icon: "lenya_face/lenya_face-16.png",
    introImage: "lenya_pose/lenya_pose-02.png",
    rules: "Строй башню из этажей. Блок должен хотя бы краем попасть на предыдущий, а ровные попадания дают больше очков.",
    desktop: "Нажимай пробел или Enter, когда этаж над башней.",
    mobile: "Тапай по экрану в момент, когда этаж над башней.",
    duration: 40,
    make: makeBuildGame,
  },
  {
    id: "race",
    title: "Октаха ехать, Мерседес сосать",
    kind: "гонка",
    desc: "Шашки 40",
    accent: "#ffd84a",
    icon: "lenya_face/lenya_face-17.png",
    introImage: "lenya_pose/lenya_pose-05.png",
    rules: "Едь по полосам, собирай монеты и куски торта. Конусы сбивают темп, торт временно разгоняет машину.",
    desktop: "Управляй стрелками влево и вправо.",
    mobile: "Тапай по левой или правой половине экрана.",
    duration: 36,
    make: makeRaceGame,
  },
  {
    id: "row",
    title: "Гребной ритм",
    kind: "ритм",
    desc: "Жми левый и правый борт в такт.",
    accent: "#54e6a5",
    icon: "lenya_face/lenya_face-21.png",
    introImage: "lenya_pose/lenya_pose-06.png",
    rules: "Лови стрелки у желтой линии. Чем дольше держишь ритм, тем быстрее идет гонка.",
    desktop: "Нажимай стрелку влево или вправо, когда значок дошел до линии.",
    mobile: "Тапай слева или справа, когда значок дошел до линии.",
    duration: 34,
    make: makeRowGame,
  },
  {
    id: "match",
    title: "3 в ряд с Иванычем",
    kind: "головоломка",
    desc: "Собирай одинаковые лица в ряд.",
    accent: "#f865b0",
    icon: "lenya_face/lenya_face-14.png",
    introImage: "lenya_pose/lenya_pose-04.png",
    rules: "Меняй соседние плитки местами и собирай три одинаковые в ряд. Если ходов не осталось, игра предложит перемешать поле.",
    desktop: "Кликни одну плитку, потом соседнюю.",
    mobile: "Тапни одну плитку, потом соседнюю.",
    duration: 45,
    make: makeMatchGame,
  },
];

function saveProgress() {
  localStorage.setItem("lenchik-arcade-best", JSON.stringify(store.best));
  localStorage.setItem("lenchik-arcade-done", JSON.stringify([...store.completed]));
}

function totalScore() {
  return games.reduce((sum, game) => sum + Math.max(0, Number(store.best[game.id] || 0)), 0);
}

function img(path) {
  return app.images[path];
}

function sprite(group, index) {
  const item = app.sprites[group]?.[index];
  return item ? item.img : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function choice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function isPhoneViewport() {
  return window.matchMedia("(max-width: 620px)").matches;
}

function syncCanvasSize() {
  const mobile = isPhoneViewport();
  W = mobile ? MOBILE_W : DESKTOP_W;
  H = mobile ? MOBILE_H : DESKTOP_H;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;
  }
}

function isMobileGameField() {
  return isPhoneViewport() && (
    document.body.classList.contains("is-playing")
    || document.body.classList.contains("is-ended")
  );
}

function rectHit(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleHit(p, c) {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return dx * dx + dy * dy <= c.r * c.r;
}

function drawBg(name) {
  if (isMobileGameField()) {
    ctx.clearRect(0, 0, W, H);
    return;
  }
  const cropped = img(bgFiles[name]);
  if (cropped) {
    ctx.drawImage(cropped, 0, 0, W, H);
  } else {
    ctx.fillStyle = "#111020";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = "rgba(6, 5, 13, 0.18)";
  ctx.fillRect(0, 0, W, H);
}

function drawPanel(x, y, w, h, color = "rgba(10, 8, 22, 0.82)") {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#fff6d7";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
}

function drawText(text, x, y, size = 22, color = "#fff6d7", align = "left") {
  ctx.font = `900 ${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(text, x + 3, y + 3);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawArrowGlyph(x, y, side) {
  const dir = side === "left" ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = "#070710";
  ctx.fillRect(-16, -6, 22, 12);
  ctx.beginPath();
  ctx.moveTo(7, -18);
  ctx.lineTo(24, 0);
  ctx.lineTo(7, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(-12, -4, 14, 3);
  ctx.restore();
}

function drawImageFit(image, x, y, w, h, anchor = "center") {
  if (!image) return;
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  const dx = anchor === "bottom" ? x + (w - dw) / 2 : x + (w - dw) / 2;
  const dy = anchor === "bottom" ? y + h - dh : y + (h - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
}

function addTapFeedback(effects, x, y, text, color, kind = "ring") {
  effects.push({ x, y, text, color, kind, t: 0.42, life: 0.42 });
}

function updateTapFeedback(effects, dt) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    effects[i].t -= dt;
    if (effects[i].t <= 0) effects.splice(i, 1);
  }
}

function drawTapFeedback(effects) {
  effects.forEach((effect) => {
    const p = 1 - effect.t / effect.life;
    const radius = 18 + p * 34;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 5;
    if (effect.kind === "cross") {
      ctx.beginPath();
      ctx.moveTo(effect.x - radius * 0.65, effect.y - radius * 0.65);
      ctx.lineTo(effect.x + radius * 0.65, effect.y + radius * 0.65);
      ctx.moveTo(effect.x + radius * 0.65, effect.y - radius * 0.65);
      ctx.lineTo(effect.x - radius * 0.65, effect.y + radius * 0.65);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawText(effect.text, effect.x, effect.y - 54 - p * 18, 26, effect.color, "center");
    ctx.restore();
  });
}

function drawLayerBlock(block, x = block.x - block.w / 2, y = block.y, w = block.w, h = block.h) {
  const image = sprite("building_layers", block.img);
  if (!image) return;
  const cropStart = block.cropStart || 0;
  const cropWidth = block.cropWidth || 1;
  const sx = Math.max(0, Math.floor(image.width * cropStart));
  const sw = Math.max(1, Math.floor(image.width * cropWidth));
  ctx.drawImage(image, sx, 0, Math.min(sw, image.width - sx), image.height, x, y, w, h);
}

function updateHud() {
  hud.innerHTML = [
    ["счет", app.score],
    ["время", Math.ceil(app.time)],
  ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  totalScoreEl.textContent = totalScore();
  pauseBtn.textContent = app.paused ? "ДАЛЬШЕ" : "ПАУЗА";
}

function showOverlay(title, text) {
  overlay.classList.remove("is-hidden");
  overlay.innerHTML = `<div class="overlay-card"><h3>${title}</h3><p>${text}</p></div>`;
}

function showPauseOverlay() {
  overlay.classList.remove("is-hidden");
  overlay.innerHTML = `
    <div class="overlay-card">
      <h3>Пауза</h3>
      <p>Игра остановлена.</p>
      <button type="button" data-resume-game>ПРОДОЛЖИТЬ</button>
    </div>
  `;
  overlay.querySelector("[data-resume-game]").addEventListener("click", togglePause);
}

function showGameIntro(meta) {
  restartBtn.hidden = true;
  pauseBtn.hidden = true;
  document.body.classList.add("is-intro");
  document.body.classList.remove("is-ended");
  document.body.dataset.activeGame = meta.id;
  const imagePath = meta.introImage ? `assets/sprites/${meta.introImage}` : `assets/sprites/${meta.icon}`;
  overlay.classList.remove("is-hidden");
  overlay.innerHTML = `
    <div class="overlay-card intro-card">
      <img src="${imagePath}" alt="">
      <div>
        <p class="kicker">${meta.kind}</p>
        <h3>${meta.title}</h3>
        <div class="rules-list">
          <p><span>цель</span>${meta.rules || meta.desc}</p>
          <p><span>компьютер</span>${meta.desktop || "Играй мышью или клавиатурой."}</p>
          <p><span>телефон</span>${meta.mobile || "Играй касанием по экрану."}</p>
        </div>
        <button type="button" data-begin-game>НАЧАТЬ</button>
      </div>
    </div>
  `;
  overlay.querySelector("[data-begin-game]").addEventListener("click", () => beginGame(meta.id));
}

function hideOverlay() {
  document.body.classList.remove("is-intro");
  overlay.classList.add("is-hidden");
  overlay.innerHTML = "";
}

function finish(message) {
  app.running = false;
  app.paused = false;
  document.body.classList.remove("is-intro");
  document.body.classList.remove("is-playing");
  document.body.classList.add("is-ended");
  pauseBtn.hidden = true;
  const roundScore = Math.max(0, Math.round(app.score));
  if (app.activeId) {
    store.best[app.activeId] = Math.max(Number(store.best[app.activeId] || 0), roundScore);
  }
  if (app.activeId) store.completed.add(app.activeId);
  saveProgress();
  updateHud();
  renderMenu();
  showOverlay(message, `Раунд окончен. Очки за попытку: ${roundScore}.`);
}

function selectGame(id) {
  syncCanvasSize();
  const meta = games.find((game) => game.id === id);
  if (!meta) return;
  if (location.hash !== `#${id}`) {
    history.replaceState(null, "", `#${id}`);
  }
  app.activeId = id;
  document.body.dataset.activeGame = id;
  app.score = 0;
  app.time = 0;
  app.metric = "";
  app.running = false;
  app.paused = false;
  document.body.classList.remove("is-playing");
  document.body.classList.remove("is-ended");
  restartBtn.hidden = true;
  pauseBtn.hidden = true;
  app.game = makeGamePreview(meta);
  titleEl.textContent = meta.title;
  kindEl.textContent = meta.kind;
  updateHud();
  renderMenu();
  showGameIntro(meta);
}

function beginGame(id) {
  syncCanvasSize();
  const meta = games.find((game) => game.id === id);
  if (!meta) return;
  app.activeId = id;
  document.body.dataset.activeGame = id;
  app.score = 0;
  app.time = Number(meta.duration || 35);
  app.metric = "";
  app.running = false;
  app.paused = false;
  restartBtn.hidden = false;
  pauseBtn.hidden = false;
  app.lastTime = performance.now();
  app.game = meta.make();
  app.time = Number(meta.duration || app.time || 35);
  app.running = true;
  document.body.classList.add("is-playing");
  document.body.classList.remove("is-ended");
  titleEl.textContent = meta.title;
  kindEl.textContent = meta.kind;
  hideOverlay();
  updateHud();
  renderMenu();
}

function restartGame() {
  if (!app.activeId) return;
  app.paused = false;
  restartBtn.classList.remove("is-pulsing");
  void restartBtn.offsetWidth;
  restartBtn.classList.add("is-pulsing");
  beginGame(app.activeId);
}

function togglePause() {
  if (!app.activeId || !app.running) return;
  app.paused = !app.paused;
  if (app.paused) {
    showPauseOverlay();
  } else {
    hideOverlay();
    app.lastTime = performance.now();
  }
  updateHud();
}

function showMenu() {
  syncCanvasSize();
  app.running = false;
  app.paused = false;
  document.body.classList.remove("is-intro");
  document.body.classList.remove("is-playing");
  document.body.classList.remove("is-ended");
  delete document.body.dataset.activeGame;
  restartBtn.hidden = true;
  pauseBtn.hidden = true;
  app.game = makeAttractGame();
  app.activeId = null;
  titleEl.textContent = "Выбери игру";
  kindEl.textContent = "READY";
  app.score = 0;
  app.time = 0;
  updateHud();
  renderMenu();
  if (location.hash) {
    history.replaceState(null, "", location.pathname + location.search);
  }
  hideOverlay();
}

function renderMenu() {
  gameMenu.innerHTML = games.map((game) => {
    const done = store.completed.has(game.id) ? "" : "";
    const active = game.id === app.activeId ? " is-active" : "";
    return `
      <button class="game-card${active}" style="--accent:${game.accent}" data-game="${game.id}">
        <img src="assets/sprites/${game.icon}" alt="">
        <span><strong>${game.title}</strong><small>${game.desc}${done}</small></span>
      </button>
    `;
  }).join("");
  gameMenu.querySelectorAll("[data-game]").forEach((button) => {
    button.addEventListener("click", () => selectGame(button.dataset.game));
  });
}

function pointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

canvas.addEventListener("pointerdown", (event) => {
  app.pointer = { ...pointerFromEvent(event), down: true };
  if (!app.running || app.paused) return;
  app.game?.tap?.(app.pointer);
});

canvas.addEventListener("pointermove", (event) => {
  app.pointer = { ...pointerFromEvent(event), down: app.pointer.down };
  if (!app.running || app.paused) return;
  app.game?.move?.(app.pointer);
});

canvas.addEventListener("pointerup", (event) => {
  app.pointer = { ...pointerFromEvent(event), down: false };
  app.game?.up?.(app.pointer);
});

window.addEventListener("keydown", (event) => {
  app.keys.add(event.key.toLowerCase());
  if (event.key.toLowerCase() === "p" || event.key.toLowerCase() === "з") {
    togglePause();
    return;
  }
  if (!app.running || app.paused) return;
  app.game?.key?.(event.key.toLowerCase());
});

window.addEventListener("keyup", (event) => {
  app.keys.delete(event.key.toLowerCase());
});

function tick(now) {
  const dt = Math.min(0.05, (now - app.lastTime) / 1000 || 0);
  app.lastTime = now;
  if (app.running && !app.paused) {
    app.time = Math.max(0, app.time - dt);
    if (app.time <= 0) finish("Время вышло");
  }
  if ((app.running && !app.paused) || app.game?.idle) app.game?.update?.(dt);
  app.game?.draw?.();
  updateHud();
  requestAnimationFrame(tick);
}

function makeAttractGame() {
  let t = 0;
  return {
    idle: true,
    update(dt) {
      t += dt;
    },
    draw() {
      drawBg("arcade");
      drawPanel(90, 82, 780, 360, "rgba(9, 8, 20, 0.84)");
      drawText("ДР-АРКАДА", W / 2, 118, 54, "#ffd84a", "center");
      drawText("Выбери картридж слева", W / 2, 190, 25, "#fff6d7", "center");
      const frame = Math.floor(t);
      const lenya = sprite("lenya_pose", frame % 12);
      const eva = sprite("eva", frame % 8);
      drawImageFit(lenya, 360, 250, 145, 150, "bottom");
      drawImageFit(eva, 470, 250, 145, 150, "bottom");
    },
  };
}

function makeGamePreview(meta) {
  return {
    idle: true,
    update() {},
    draw() {
      const bgName = meta.id === "search" || meta.id === "tower"
        ? "school"
        : meta.id === "build"
          ? "build"
          : meta.id === "race"
            ? "race"
            : meta.id === "row"
              ? "river"
              : "arcade";
      drawBg(bgName);
      ctx.fillStyle = "rgba(7,7,16,0.62)";
      ctx.fillRect(0, 0, W, H);
    },
  };
}

function makeSearchGame() {
  let round = 1;
  let target = null;
  let decoys = [];
  let missFlash = 0;
  const effects = [];
  const backpackIds = [0, 1, 2, 3, 4, 5];
  const objectIds = [12, 13, 18, 21, 22, 60, 63, 64, 65, 66];

  function newRound() {
    const mobile = isPhoneViewport();
    const sideSafe = mobile ? 24 : 35;
    const topSafe = mobile ? 118 : 104;
    const bottomSafe = mobile ? 72 : 86;
    decoys = Array.from({ length: 64 + round * 3 }, () => ({
      img: sprite("objects", choice(objectIds)),
      x: rand(sideSafe, W - sideSafe - 70),
      y: rand(topSafe, H - bottomSafe),
      w: rand(34, 78),
      h: rand(30, 72),
      rot: rand(-0.18, 0.18),
      alpha: 1,
    }));
    target = {
      img: sprite("objects", choice(backpackIds)),
      x: rand(sideSafe + 12, W - sideSafe - 92),
      y: rand(topSafe + 12, H - bottomSafe - 40),
      w: 72,
      h: 68,
      label: "рюкзак",
    };
    decoys.splice(Math.floor(Math.random() * decoys.length), 0, target);
  }

  newRound();

  return {
    tap(p) {
      if (!app.running) return;
      if (rectHit(p, target)) {
        addTapFeedback(effects, target.x + target.w / 2, target.y + target.h / 2, "нашел", "#54e6a5");
        app.score += 20;
        round += 1;
        newRound();
      } else {
        addTapFeedback(effects, p.x, p.y, "мимо", "#ff4f78", "cross");
        app.score = Math.max(0, app.score - 2);
        missFlash = 0.22;
      }
    },
    update(dt) {
      missFlash = Math.max(0, missFlash - dt);
      updateTapFeedback(effects, dt);
    },
    draw() {
      drawBg("school");
      drawPanel(20, 18, 380, 58, "rgba(13, 11, 25, 0.86)");
      drawText(`найди: ${target.label}`, 40, 34, 25, "#ffd84a");
      for (const item of decoys) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
        ctx.rotate(item.rot);
        drawImageFit(item.img, -item.w / 2, -item.h / 2, item.w, item.h);
        ctx.restore();
      }
      if (missFlash > 0) {
        ctx.fillStyle = "rgba(255,79,120,0.22)";
        ctx.fillRect(0, 0, W, H);
      }
      drawTapFeedback(effects);
    },
  };
}

function makeWhackGame() {
  const holes = [];
  const mobile = isPhoneViewport();
  const faces = app.sprites.lenya_face
    .map((item, index) => (item ? index : null))
    .filter((index) => index !== null);
  const evaFaces = app.sprites.eva
    .map((item, index) => (item && index >= 9 && index <= 20 ? index : null))
    .filter((index) => index !== null);
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      holes.push({
        x: mobile ? 150 + x * 165 : 230 + x * 250,
        y: mobile ? 250 + y * 190 : 120 + y * 126,
        r: mobile ? 44 : 54,
        phase: 0,
        life: 0,
        state: "hidden",
        kind: "none",
        face: 0,
        evaFace: 9,
        hit: 0,
      });
    }
  }
  let spawn = 0.7;
  let hammer = null;
  const effects = [];

  function visibleRect(hole) {
    const lift = Math.sin(hole.phase * Math.PI * 0.5) * (mobile ? 74 : 82);
    const face = mobile ? 118 : 172;
    return {
      x: hole.x - face / 2,
      y: hole.y - 8 - lift,
      w: face,
      h: mobile ? 126 : 158,
    };
  }

  function pop() {
    const candidates = holes.filter((hole) => hole.state === "hidden");
    if (!candidates.length) return;
    const hole = choice(candidates);
    hole.phase = 0;
    hole.life = rand(0.28, 0.62);
    hole.state = "rising";
    hole.kind = Math.random() < 0.2 ? "eva" : "lenya";
    hole.face = choice(faces);
    hole.evaFace = choice(evaFaces);
  }

  return {
    tap(p) {
      if (!app.running) return;
      const hit = holes.find((hole) => {
        if (hole.state === "hidden" || hole.phase <= 0.08) return false;
        return rectHit(p, visibleRect(hole));
      });
      hammer = { x: p.x, y: p.y, t: 0.16 };
      if (!hit) {
        addTapFeedback(effects, p.x, p.y, "мимо", "#ff4f78", "cross");
        return;
      }
      if (hit.kind === "eva") {
        addTapFeedback(effects, hit.x, hit.y - 50, "ошибка", "#ff4f78", "cross");
        app.score = Math.max(0, app.score - 14);
      } else {
        addTapFeedback(effects, hit.x, hit.y - 50, "попал", "#54e6a5");
        app.score += 10;
      }
      hit.hit = 0.16;
      hit.state = "falling";
    },
    update(dt) {
      spawn -= dt;
      if (spawn <= 0) {
        pop();
        spawn = rand(0.62, 1.36);
      }
      holes.forEach((hole) => {
        if (hole.hit > 0) hole.hit = Math.max(0, hole.hit - dt);
        if (hole.state === "rising") {
          hole.phase += dt / 0.08;
          if (hole.phase >= 1) {
            hole.phase = 1;
            hole.state = "up";
          }
        } else if (hole.state === "up") {
          hole.life -= dt;
          if (hole.life <= 0) hole.state = "falling";
        } else if (hole.state === "falling") {
          hole.phase -= dt / 0.1;
          if (hole.phase <= 0) {
            hole.phase = 0;
            hole.state = "hidden";
          }
        }
      });
      if (hammer) {
        hammer.t -= dt;
        if (hammer.t <= 0) hammer = null;
      }
      updateTapFeedback(effects, dt);
    },
    draw() {
      drawBg("arcade");
      if (mobile) {
        drawPanel(45, 176, 540, 540, "rgba(9, 8, 20, 0.54)");
        drawImageFit(sprite("lenya_pose", 1), 22, H - 230, 118, 190, "bottom");
      } else {
        drawImageFit(sprite("lenya_pose", 1), 22, 350, 122, 160, "bottom");
        drawPanel(150, 66, 660, 430, "rgba(9, 8, 20, 0.50)");
      }
      holes.forEach((hole) => {
        ctx.fillStyle = "#0b0610";
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y + (mobile ? 38 : 44), mobile ? 62 : 84, mobile ? 22 : 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2442";
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y + (mobile ? 32 : 38), mobile ? 54 : 74, mobile ? 18 : 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#09050d";
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y + (mobile ? 28 : 32), mobile ? 46 : 62, mobile ? 14 : 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff6d7";
        ctx.lineWidth = 4;
        ctx.stroke();
        if (hole.state !== "hidden" || hole.phase > 0) {
          const lift = Math.sin(hole.phase * Math.PI * 0.5) * (mobile ? 74 : 82);
          const image = hole.kind === "eva" ? sprite("eva", hole.evaFace) : sprite("lenya_face", hole.face);
          const shake = hole.hit > 0 ? Math.sin(hole.hit * 80) * 5 : 0;
          const faceSize = mobile ? 104 : 120;
          drawImageFit(image, hole.x - faceSize / 2 + shake, hole.y + 16 - lift, faceSize, faceSize);
        }
      });
      if (hammer) {
        ctx.save();
        ctx.translate(hammer.x, hammer.y);
        ctx.rotate(-0.65);
        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(-8, -8, 16, 70);
        ctx.fillStyle = "#d9d4c8";
        ctx.fillRect(-34, -28, 68, 30);
        ctx.strokeStyle = "#fff6d7";
        ctx.lineWidth = 4;
        ctx.strokeRect(-34, -28, 68, 30);
        ctx.restore();
      }
      drawTapFeedback(effects);
    },
  };
}

function makeBuildGame() {
  const layers = app.sprites.building_layers
    .map((item, index) => (item ? index : null))
    .filter((index) => index !== null);
  const blockH = 46;
  const stack = [{ x: W / 2, y: H - 82, w: 330, h: blockH, img: 0, cropStart: 0, cropWidth: 1 }];
  let swing = 0;
  let cameraY = 0;
  let falling = null;
  let nextImg = choice(layers.filter((id) => id !== 0));
  let lost = false;
  const missGrace = 10;
  const mobile = isPhoneViewport();
  const craneY = mobile ? 190 : 84;
  const craneHeadY = mobile ? 164 : 58;
  const craneHookY = mobile ? 172 : 66;

  function makeBlock(x, y, w) {
    return {
      x,
      y,
      w,
      h: blockH,
      img: nextImg,
      cropStart: 0,
      cropWidth: 1,
      vy: 0,
    };
  }

  function drop() {
    if (falling || lost) return;
    const top = stack[stack.length - 1];
    const movingX = W / 2 + Math.sin(swing) * 300;
    falling = makeBlock(movingX, craneY - cameraY, Math.max(84, top.w - 8));
    nextImg = choice(layers);
  }

  return {
    tap() {
      drop();
    },
    key(key) {
      if (key === " " || key === "enter") drop();
    },
    update(dt) {
      swing += dt * 2.85;
      const top = stack[stack.length - 1];
      const targetCamera = Math.max(0, 230 - top.y);
      cameraY += (targetCamera - cameraY) * Math.min(1, dt * 5.8);
      if (falling) {
        falling.vy += 960 * dt;
        falling.y += falling.vy * dt;
        const targetY = top.y - blockH + 7;
        if (falling.y >= targetY) {
          const fallingLeft = falling.x - falling.w / 2;
          const fallingRight = falling.x + falling.w / 2;
          const topLeft = top.x - top.w / 2;
          const topRight = top.x + top.w / 2;
          const rawLeft = Math.max(fallingLeft, topLeft);
          const rawRight = Math.min(fallingRight, topRight);
          const rawOverlap = Math.max(0, rawRight - rawLeft);
          if (rawOverlap <= 0) {
            lost = true;
            finish("Стройка рухнула");
            return;
          }
          const left = Math.max(fallingLeft, topLeft - missGrace);
          const right = Math.min(fallingRight, topRight + missGrace);
          const overlap = Math.max(14, Math.min(falling.w, right - left));
          const offset = Math.abs(falling.x - top.x);
          const keptStart = falling.cropStart + ((left - fallingLeft) / falling.w) * falling.cropWidth;
          const keptWidth = (overlap / falling.w) * falling.cropWidth;
          stack.push({ x: (left + right) / 2, y: targetY, w: overlap, h: blockH, img: falling.img, cropStart: keptStart, cropWidth: keptWidth });
          app.score += Math.round(14 + overlap / 12);
          if (offset < 14) app.score += 8;
          falling = null;
        }
      }
    },
    draw() {
      drawBg("build");
      drawPanel(26, 24, 330, 56, "rgba(13,11,25,0.84)");
      drawText(`этажи: ${stack.length - 1}`, 46, 40, 24, "#ffd84a");
      drawImageFit(sprite("lenya_pose", 2), 752, 330, 128, 166, "bottom");
      ctx.save();
      ctx.translate(0, cameraY);
      const movingX = W / 2 + Math.sin(swing) * 300;
      ctx.fillStyle = "#2a1a12";
      ctx.fillRect(movingX - 26, craneHeadY - cameraY, 52, 12);
      ctx.fillStyle = "#ff9f43";
      ctx.fillRect(movingX - 18, craneHookY - cameraY, 36, 10);
      if (!falling) {
        drawLayerBlock({ x: movingX, y: craneY - cameraY, w: Math.max(84, stack[stack.length - 1].w - 8), h: blockH, img: nextImg, cropStart: 0, cropWidth: 1 });
      }
      stack.forEach((block, i) => {
        drawLayerBlock(block);
      });
      if (falling) {
        drawLayerBlock(falling);
      }
      ctx.restore();
      drawText("тап / пробел чтобы положить материал", W / 2, 500, 20, "#c9c0df", "center");
    },
  };
}

function makeRaceGame() {
  const mobile = isPhoneViewport();
  const road = mobile ? { x: 128, y: 0, w: 374, h: H } : { x: 230, y: 0, w: 500, h: H };
  const lanes = mobile
    ? [road.x + road.w * 0.23, road.x + road.w * 0.5, road.x + road.w * 0.77]
    : [330, 480, 630];
  let lane = 1;
  let distance = 0;
  let speed = 270;
  let spawn = 0;
  let carFlash = 0;
  let carFlashColor = "#54e6a5";
  let cakeBoost = 0;
  const objects = [];
  const effects = [];
  const coneIds = [17, 18, 19];
  const coinId = 52;
  const cakeIds = [60, 63, 64, 65];
  function setLane(dir) {
    lane = clamp(lane + dir, 0, 2);
  }

  function addObject() {
    const roll = Math.random();
    const type = roll < 0.42 ? "coin" : roll < 0.58 ? "cake" : "cone";
    const objectLane = Math.floor(Math.random() * 3);
    objects.push({
      lane: objectLane,
      x: lanes[objectLane],
      y: -78,
      type,
      img: type === "coin" ? sprite("racing", coinId) : type === "cake" ? sprite("objects", choice(cakeIds)) : sprite("racing", choice(coneIds)),
      size: type === "coin" ? 50 : type === "cake" ? 56 : 58,
      hitW: type === "cone" ? (mobile ? 32 : 36) : (mobile ? 42 : 46),
      hitH: type === "cone" ? (mobile ? 36 : 40) : (mobile ? 42 : 46),
    });
  }

  function carRect() {
    return {
      x: lanes[lane] - (mobile ? 24 : 25),
      y: H - (mobile ? 168 : 120),
      w: mobile ? 48 : 50,
      h: mobile ? 78 : 82,
    };
  }

  function objectRect(obj) {
    return { x: obj.x - obj.hitW / 2, y: obj.y + 10, w: obj.hitW, h: obj.hitH };
  }

  return {
    tap(p) {
      setLane(p.x < W / 2 ? -1 : 1);
    },
    key(key) {
      if (key === "arrowleft" || key === "a") setLane(-1);
      if (key === "arrowright" || key === "d") setLane(1);
    },
    update(dt) {
      const roadSpeed = speed + (cakeBoost > 0 ? 135 : 0);
      distance += roadSpeed * dt;
      spawn -= dt;
      if (spawn <= 0) {
        addObject();
        spawn = rand(0.56, 0.9) * (cakeBoost > 0 ? 0.82 : 1);
      }
      speed = clamp(speed + dt * 10, 250, 420);
      cakeBoost = Math.max(0, cakeBoost - dt);
      carFlash = Math.max(0, carFlash - dt);
      updateTapFeedback(effects, dt);
      const carHit = carRect();
      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const obj = objects[i];
        obj.y += roadSpeed * dt;
        if (rectsOverlap(carHit, objectRect(obj))) {
          if (obj.type === "coin") {
            app.score += 16;
            carFlash = 0.22;
            carFlashColor = "#54e6a5";
            addTapFeedback(effects, obj.x, obj.y + 32, "+монета", "#ffd84a");
          } else if (obj.type === "cake") {
            app.score += 10;
            cakeBoost = 4.2;
            speed = clamp(speed + 28, 250, 460);
            carFlash = 0.32;
            carFlashColor = "#ffd84a";
            addTapFeedback(effects, obj.x, obj.y + 32, "+скорость", "#ffd84a");
          } else {
            app.score = Math.max(0, app.score - 10);
            speed = Math.max(220, speed - 55);
            carFlash = 0.28;
            carFlashColor = "#ff4f78";
            addTapFeedback(effects, obj.x, obj.y + 30, "удар", "#ff4f78", "cross");
          }
          objects.splice(i, 1);
        } else if (obj.y > H + 80) {
          objects.splice(i, 1);
        }
      }
    },
    draw() {
      drawBg("race");
      if (!mobile) {
        ctx.fillStyle = "rgba(7, 9, 14, 0.34)";
        ctx.fillRect(0, 0, W, H);
        drawImageFit(sprite("lenya_pose", 5), 34, 366, 118, 156, "bottom");
      }
      ctx.fillStyle = mobile ? "#20242b" : "#252a31";
      ctx.fillRect(road.x, road.y, road.w, road.h);
      ctx.fillStyle = mobile ? "#303844" : "#303640";
      for (let y = -48 + (distance % 96); y < H; y += 96) {
        ctx.fillRect(road.x, y, road.w, mobile ? 34 : 42);
      }
      ctx.fillStyle = mobile ? "#11141a" : "#171a20";
      ctx.fillRect(road.x - 18, 0, mobile ? 18 : 26, H);
      ctx.fillRect(road.x + road.w, 0, mobile ? 18 : 26, H);
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(road.x + (mobile ? 12 : 16), 0, mobile ? 5 : 7, H);
      ctx.fillRect(road.x + road.w - (mobile ? 17 : 23), 0, mobile ? 5 : 7, H);
      ctx.fillStyle = "#fff6d7";
      for (let y = -72 + (distance % 112); y < H; y += 112) {
        ctx.fillRect(road.x + road.w / 3 - (mobile ? 4 : 5), y, mobile ? 8 : 10, mobile ? 52 : 58);
        ctx.fillRect(road.x + road.w * 2 / 3 - (mobile ? 4 : 5), y, mobile ? 8 : 10, mobile ? 52 : 58);
      }
      objects.forEach((obj) => drawImageFit(obj.img, obj.x - obj.size / 2, obj.y, obj.size, obj.size));
      if (carFlash > 0) {
        ctx.fillStyle = carFlashColor === "#ff4f78" ? "rgba(255,79,120,0.24)" : carFlashColor === "#ffd84a" ? "rgba(255,216,74,0.24)" : "rgba(84,230,165,0.22)";
        ctx.fillRect(lanes[lane] - (mobile ? 50 : 58), H - (mobile ? 188 : 148), mobile ? 100 : 116, mobile ? 118 : 126);
      }
      drawImageFit(sprite("racing", 21), lanes[lane] - (mobile ? 48 : 52), H - (mobile ? 170 : 132), mobile ? 96 : 104, mobile ? 112 : 108, "bottom");
      drawTapFeedback(effects);
      drawText(`${Math.floor(distance / 100)} м`, 36, 34, 28, "#ffd84a");
    },
  };
}

function makeRowGame() {
  if (isPhoneViewport()) return makeRowGameMobile();
  const hitX = 310;
  const boatX = 230;
  const boatY = 238;
  const beats = [];
  const effects = [];
  let spawn = 0.55;
  let water = 0;
  let boatKick = 0;
  let strokeFrame = 0;
  let missFlash = 0;
  let speed = 250;
  let distance = 0;
  let tempo = 0;

  function spawnBeat() {
    beats.push({
      side: Math.random() < 0.5 ? "left" : "right",
      x: W + 58,
      y: H / 2,
      hit: false,
    });
  }

  function press(side) {
    if (!app.running) return;
    let best = null;
    let bestDistance = Infinity;
    beats.forEach((beat) => {
      if (beat.hit || beat.side !== side) return;
      const d = Math.abs(beat.x - hitX);
      if (d < bestDistance) {
        best = beat;
        bestDistance = d;
      }
    });
    if (best && bestDistance <= 54) {
      best.hit = true;
      app.score += 9;
      distance += 38;
      speed = clamp(speed + 5, 250, 430);
      boatKick = 0.22;
      strokeFrame = 0.28;
      addTapFeedback(effects, hitX, best.y, "гребок", "#54e6a5");
    } else {
      app.score = Math.max(0, app.score - 3);
      speed = Math.max(230, speed - 18);
      missFlash = 0.22;
      addTapFeedback(effects, hitX, H / 2, "мимо", "#ff4f78", "cross");
    }
  }

  return {
    tap(p) {
      press(p.x < W / 2 ? "left" : "right");
    },
    key(key) {
      if (key === "arrowleft" || key === "a") press("left");
      if (key === "arrowright" || key === "d") press("right");
    },
    update(dt) {
      tempo += dt;
      speed = clamp(speed + dt * (8 + tempo * 0.18), 250, 450);
      water += speed * dt;
      distance += speed * dt * 0.035;
      spawn -= dt;
      if (spawn <= 0) {
        spawnBeat();
        spawn = rand(0.56, 0.9) * clamp(1 - tempo * 0.012, 0.66, 1);
      }
      for (let i = beats.length - 1; i >= 0; i -= 1) {
        const beat = beats[i];
        beat.x -= speed * dt;
        if (!beat.hit && beat.x < hitX - 66) {
          beat.hit = true;
          missFlash = 0.18;
          addTapFeedback(effects, hitX, beat.y, "поздно", "#ff4f78", "cross");
        }
        if (beat.x < -70 || beat.hit) beats.splice(i, 1);
      }
      boatKick = Math.max(0, boatKick - dt);
      strokeFrame = Math.max(0, strokeFrame - dt);
      missFlash = Math.max(0, missFlash - dt);
      updateTapFeedback(effects, dt);
    },
    draw() {
      drawBg("river");
      ctx.fillStyle = "rgba(4, 18, 34, 0.42)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(40, 148, 185, 0.64)";
      ctx.fillRect(0, 168, W, 206);
      ctx.fillStyle = "rgba(146, 230, 255, 0.34)";
      for (let x = -120 - (water % 120); x < W; x += 120) {
        ctx.fillRect(x, 222, 64, 5);
        ctx.fillRect(x + 46, 303, 72, 4);
      }
      for (let x = -80 - (water % 96); x < W + 80; x += 96) {
        drawImageFit(sprite("rowing", 2), x - 22, 126, 44, 66);
        drawImageFit(sprite("rowing", 2), x + 20, 356, 44, 66);
      }
      ctx.strokeStyle = "#ffd84a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(hitX, 178);
      ctx.lineTo(hitX, 362);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,216,74,0.18)";
      ctx.fillRect(hitX - 54, 178, 108, 184);
      beats.forEach((beat) => {
        const ready = Math.abs(beat.x - hitX) <= 54;
        ctx.fillStyle = ready ? "#ffd84a" : beat.side === "left" ? "#43b6ff" : "#ff4f78";
        ctx.beginPath();
        ctx.arc(beat.x, beat.y, ready ? 34 : 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff6d7";
        ctx.lineWidth = 4;
        ctx.stroke();
        drawArrowGlyph(beat.x, beat.y, beat.side);
      });
      const kick = boatKick > 0 ? Math.sin(boatKick * 44) * 13 + 18 : 0;
      drawImageFit(sprite("rowing", strokeFrame > 0 ? 1 : 0), boatX + 50 + kick, boatY - 150, 118, 248);
      if (missFlash > 0) {
        ctx.fillStyle = "rgba(255,79,120,0.22)";
        ctx.fillRect(0, 0, W, H);
      }
      drawTapFeedback(effects);
      drawText(`${Math.floor(distance)} м`, 36, 34, 28, "#ffd84a");
    },
  };
}

function makeRowGameMobile() {
  const laneX = { left: W / 2 - 96, right: W / 2 + 96 };
  const hitY = 642;
  const boatX = W / 2 - 172;
  const boatY = 744;
  const beats = [];
  const effects = [];
  let spawn = 0.55;
  let water = 0;
  let boatKick = 0;
  let strokeFrame = 0;
  let missFlash = 0;
  let speed = 250;
  let distance = 0;
  let tempo = 0;

  function spawnBeat() {
    const side = Math.random() < 0.5 ? "left" : "right";
    beats.push({ side, x: laneX[side], y: 92, hit: false });
  }

  function press(side) {
    if (!app.running) return;
    let best = null;
    let bestDistance = Infinity;
    beats.forEach((beat) => {
      if (beat.hit || beat.side !== side) return;
      const d = Math.abs(beat.y - hitY);
      if (d < bestDistance) {
        best = beat;
        bestDistance = d;
      }
    });
    if (best && bestDistance <= 58) {
      best.hit = true;
      app.score += 9;
      distance += 38;
      speed = clamp(speed + 5, 250, 430);
      boatKick = 0.22;
      strokeFrame = 0.28;
      addTapFeedback(effects, best.x, hitY, "гребок", "#54e6a5");
    } else {
      app.score = Math.max(0, app.score - 3);
      speed = Math.max(230, speed - 18);
      missFlash = 0.22;
      addTapFeedback(effects, W / 2, hitY, "мимо", "#ff4f78", "cross");
    }
  }

  return {
    tap(p) {
      press(p.x < W / 2 ? "left" : "right");
    },
    key(key) {
      if (key === "arrowleft" || key === "a") press("left");
      if (key === "arrowright" || key === "d") press("right");
    },
    update(dt) {
      tempo += dt;
      speed = clamp(speed + dt * (8 + tempo * 0.18), 250, 450);
      water += speed * dt;
      distance += speed * dt * 0.035;
      spawn -= dt;
      if (spawn <= 0) {
        spawnBeat();
        spawn = rand(0.56, 0.9) * clamp(1 - tempo * 0.012, 0.66, 1);
      }
      for (let i = beats.length - 1; i >= 0; i -= 1) {
        const beat = beats[i];
        beat.y += speed * dt;
        if (!beat.hit && beat.y > hitY + 68) {
          beat.hit = true;
          missFlash = 0.18;
          addTapFeedback(effects, beat.x, hitY, "поздно", "#ff4f78", "cross");
        }
        if (beat.y > H + 70 || beat.hit) beats.splice(i, 1);
      }
      boatKick = Math.max(0, boatKick - dt);
      strokeFrame = Math.max(0, strokeFrame - dt);
      missFlash = Math.max(0, missFlash - dt);
      updateTapFeedback(effects, dt);
    },
    draw() {
      drawBg("river");
      ctx.fillStyle = "rgba(4, 18, 34, 0.22)";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,246,215,0.62)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(laneX.left, 104);
      ctx.lineTo(laneX.left, H - 88);
      ctx.moveTo(laneX.right, 104);
      ctx.lineTo(laneX.right, H - 88);
      ctx.stroke();
      for (let y = -80 + (water % 118); y < H + 80; y += 118) {
        drawImageFit(sprite("rowing", 2), laneX.left - 28, y, 56, 84);
        drawImageFit(sprite("rowing", 2), laneX.right - 28, y + 44, 56, 84);
      }
      ctx.strokeStyle = "#ffd84a";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(90, hitY);
      ctx.lineTo(W - 90, hitY);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,216,74,0.16)";
      ctx.fillRect(88, hitY - 46, W - 176, 92);
      beats.forEach((beat) => {
        const ready = Math.abs(beat.y - hitY) <= 58;
        ctx.fillStyle = ready ? "#ffd84a" : beat.side === "left" ? "#43b6ff" : "#ff4f78";
        ctx.beginPath();
        ctx.arc(beat.x, beat.y, ready ? 36 : 29, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff6d7";
        ctx.lineWidth = 4;
        ctx.stroke();
        drawArrowGlyph(beat.x, beat.y, beat.side);
      });
      const kick = boatKick > 0 ? Math.sin(boatKick * 44) * 18 + 18 : 0;
      drawImageFit(sprite("rowing", strokeFrame > 0 ? 1 : 0), W / 2 - 82, boatY - 260 - kick, 164, 258);
      if (missFlash > 0) {
        ctx.fillStyle = "rgba(255,79,120,0.22)";
        ctx.fillRect(0, 0, W, H);
      }
      drawTapFeedback(effects);
      drawText(`${Math.floor(distance)} м`, 34, 34, 28, "#ffd84a");
    },
  };
}

function makeMatchGame() {
  const tiles = [
    "lenya_face:4",
    "eva:9",
    "objects:0",
    "objects:60",
    "construction:55",
    "construction:41",
  ];
  const size = 5;
  const mobile = isPhoneViewport();
  const cell = mobile ? Math.floor((W - 54) / size) : 74;
  const boardX = Math.round((W - cell * size) / 2);
  const boardY = mobile ? Math.round((H - cell * size) / 2) : 78;
  let selected = null;
  let grid = [];
  let needsShuffle = false;
  let clearing = new Set();
  let clearTimer = 0;
  let pendingScore = true;
  const shuffleButton = {
    x: W / 2 - 150,
    y: mobile ? Math.min(H - 82, boardY + cell * size + 28) : 458,
    w: 300,
    h: 48,
  };

  function makeGrid() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const next = [];
      for (let i = 0; i < size * size; i += 1) {
        const x = i % size;
        const y = Math.floor(i / size);
        let candidates = [...tiles];
        if (x >= 2 && next[i - 1] === next[i - 2]) {
          candidates = candidates.filter((tile) => tile !== next[i - 1]);
        }
        if (y >= 2 && next[i - size] === next[i - size * 2]) {
          candidates = candidates.filter((tile) => tile !== next[i - size]);
        }
        next[i] = choice(candidates);
      }
      grid = next;
      if (hasPossibleMove()) return next;
    }
    return grid;
  }

  function indexAt(p) {
    const x = Math.floor((p.x - boardX) / cell);
    const y = Math.floor((p.y - boardY) / cell);
    if (x < 0 || y < 0 || x >= size || y >= size) return -1;
    return y * size + x;
  }

  function adjacent(a, b) {
    const ax = a % size;
    const ay = Math.floor(a / size);
    const bx = b % size;
    const by = Math.floor(b / size);
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }

  function matches() {
    const out = new Set();
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size - 2; x += 1) {
        const i = y * size + x;
        if (grid[i] === grid[i + 1] && grid[i] === grid[i + 2]) {
          out.add(i); out.add(i + 1); out.add(i + 2);
        }
      }
    }
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < size - 2; y += 1) {
        const i = y * size + x;
        if (grid[i] === grid[i + size] && grid[i] === grid[i + size * 2]) {
          out.add(i); out.add(i + size); out.add(i + size * 2);
        }
      }
    }
    return out;
  }

  function hasPossibleMove() {
    if (!grid?.length) return true;
    for (let i = 0; i < grid.length; i += 1) {
      const x = i % size;
      const neighbors = [];
      if (x < size - 1) neighbors.push(i + 1);
      if (i < grid.length - size) neighbors.push(i + size);
      for (const j of neighbors) {
        [grid[i], grid[j]] = [grid[j], grid[i]];
        const possible = matches().size > 0;
        [grid[i], grid[j]] = [grid[j], grid[i]];
        if (possible) return true;
      }
    }
    return false;
  }

  function shuffleGrid() {
    selected = null;
    clearing = new Set();
    clearTimer = 0;
    grid = makeGrid();
    needsShuffle = !hasPossibleMove();
  }

  function refill(cleared) {
    cleared.forEach((i) => { grid[i] = choice(tiles); });
  }

  function startClear(cleared, addScore = true) {
    if (!cleared.size) return false;
    clearing = new Set(cleared);
    clearTimer = 0.24;
    pendingScore = addScore;
    selected = null;
    needsShuffle = false;
    return true;
  }

  function clearExisting(addScore = true) {
    const m = matches();
    if (!m.size) return false;
    return startClear(m, addScore);
  }

  function drawTile(tile, x, y, w, h) {
    const [group, id] = tile.split(":");
    drawImageFit(sprite(group, Number(id)), x, y, w, h);
  }

  shuffleGrid();

  return {
    tap(p) {
      if (clearTimer > 0) return;
      if (needsShuffle) {
        if (rectHit(p, shuffleButton)) shuffleGrid();
        return;
      }
      const hit = indexAt(p);
      if (hit < 0) return;
      if (selected === null) {
        selected = hit;
        return;
      }
      if (!adjacent(selected, hit)) {
        selected = hit;
        return;
      }
      [grid[selected], grid[hit]] = [grid[hit], grid[selected]];
      if (!clearExisting(true)) {
        [grid[selected], grid[hit]] = [grid[hit], grid[selected]];
      } else {
        needsShuffle = !hasPossibleMove();
      }
      selected = null;
    },
    update(dt) {
      if (clearTimer > 0) {
        clearTimer = Math.max(0, clearTimer - dt);
        if (clearTimer === 0) {
          if (pendingScore) {
            app.score += clearing.size * 7;
          }
          refill(clearing);
          clearing = new Set();
          if (!clearExisting(true)) needsShuffle = !hasPossibleMove();
        }
      } else if (!needsShuffle && !clearExisting(true)) {
        needsShuffle = !hasPossibleMove();
      }
    },
    draw() {
      drawBg("arcade");
      if (!mobile) {
        drawImageFit(sprite("lenya_pose", 9), 766, 350, 130, 164, "bottom");
      }
      drawPanel(boardX - 18, boardY - 18, cell * size + 36, cell * size + 36, "rgba(10,8,22,0.82)");
      const clearPulse = clearTimer > 0 ? 0.65 + Math.sin(clearTimer * 42) * 0.18 : 1;
      for (let i = 0; i < grid.length; i += 1) {
        const x = boardX + (i % size) * cell;
        const y = boardY + Math.floor(i / size) * cell;
        const isClearing = clearing.has(i);
        ctx.fillStyle = isClearing ? "#54e6a5" : selected === i ? "#ffd84a" : "#211c39";
        ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
        ctx.strokeStyle = "#fff6d7";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 4, y + 4, cell - 8, cell - 8);
        if (isClearing) {
          ctx.fillStyle = "rgba(255,255,255,0.24)";
          ctx.fillRect(x + 8, y + 8, cell - 16, cell - 16);
        }
        const inset = isClearing ? 10 + (1 - clearPulse) * 18 : 10;
        drawTile(grid[i], x + inset, y + inset, cell - inset * 2, cell - inset * 2);
      }
      if (needsShuffle) {
        drawPanel(shuffleButton.x, shuffleButton.y, shuffleButton.w, shuffleButton.h, "rgba(255,216,74,0.94)");
        drawText("ПЕРЕМЕШАТЬ", W / 2, shuffleButton.y + 12, 22, "#17110a", "center");
      }
    },
  };
}

function makeTowerGame() {
  const stack = [{ x: W / 2, y: H - 44, w: 220 }];
  let swing = 0;
  let falling = null;
  let lost = false;

  function drop() {
    if (falling || lost) return;
    const top = stack[stack.length - 1];
    falling = { x: W / 2 + Math.sin(swing) * 280, y: 72, w: Math.max(74, top.w - 7), vy: 0 };
  }

  return {
    tap() {
      drop();
    },
    key(key) {
      if (key === " " || key === "enter") drop();
    },
    update(dt) {
      swing += dt * 2.7;
      if (falling) {
        falling.vy += 930 * dt;
        falling.y += falling.vy * dt;
        const top = stack[stack.length - 1];
        const targetY = top.y - 26;
        if (falling.y >= targetY) {
          const overlap = Math.max(0, Math.min(falling.x + falling.w / 2, top.x + top.w / 2) - Math.max(falling.x - falling.w / 2, top.x - top.w / 2));
          if (overlap < 42) {
            lost = true;
            finish("Башня рухнула");
            return;
          }
          const offset = Math.abs(falling.x - top.x);
          stack.push({ x: falling.x, y: targetY, w: overlap });
          app.score += Math.round(14 + overlap / 12);
          if (offset < 12) app.score += 8;
          falling = null;
          if (stack.length >= 13) finish("Башня готова");
        }
      }
    },
    draw() {
      drawBg("school");
      drawPanel(26, 24, 330, 56, "rgba(13,11,25,0.84)");
      drawText(`этажи: ${stack.length - 1}`, 46, 40, 24, "#ffd84a");
      drawImageFit(sprite("lenya_pose", 3), 760, 338, 118, 156, "bottom");
      const hookX = W / 2 + Math.sin(swing) * 280;
      ctx.strokeStyle = "#fff6d7";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(hookX, 70);
      ctx.stroke();
      if (!falling) {
        drawImageFit(sprite("objects", 18), hookX - 42, 70, 84, 54);
      }
      stack.forEach((block, i) => {
        if (i === 0) {
          ctx.fillStyle = "#211c39";
          ctx.fillRect(block.x - block.w / 2, block.y, block.w, 22);
          return;
        }
        drawImageFit(sprite("objects", i % 2 ? 18 : 13), block.x - block.w / 2, block.y - 4, block.w, 34);
        ctx.strokeStyle = "#fff6d7";
        ctx.lineWidth = 2;
        ctx.strokeRect(block.x - block.w / 2, block.y, block.w, 22);
      });
      if (falling) {
        drawImageFit(sprite("objects", stack.length % 2 ? 18 : 13), falling.x - falling.w / 2, falling.y - 12, falling.w, 42);
      }
      drawText("тап / пробел чтобы бросить", W / 2, 500, 20, "#c9c0df", "center");
    },
  };
}

async function loadAssets() {
  const manifest = await fetch("assets/sprites/manifest.json").then((r) => r.json());
  const paths = [...Object.values(bgFiles)];
  Object.entries(neededSprites).forEach(([group, indexes]) => {
    app.sprites[group] = [];
    indexes.forEach((index) => {
      const item = manifest[group]?.[index];
      if (!item) return;
      app.sprites[group][index] = item;
      paths.push(item.file);
    });
  });
  await Promise.all(paths.map((path) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      app.images[path] = image;
      Object.values(app.sprites).flat().filter(Boolean).forEach((item) => {
        if (item.file === path) item.img = image;
      });
      resolve();
    };
    image.onerror = resolve;
    image.src = path;
  })));
}

async function init() {
  syncCanvasSize();
  totalScoreEl.textContent = totalScore();
  renderMenu();
  showOverlay("Загрузка", "Готовим спрайты и мини-игры.");
  await loadAssets();
  restartBtn.addEventListener("click", restartGame);
  pauseBtn.addEventListener("click", togglePause);
  menuBtn.addEventListener("click", showMenu);
  document.querySelector("#randomBtn").addEventListener("click", () => selectGame(choice(games).id));
  const initialId = location.hash.replace("#", "");
  if (games.some((game) => game.id === initialId)) {
    selectGame(initialId);
  } else {
    showMenu();
  }
  window.addEventListener("resize", () => {
    const oldW = W;
    const oldH = H;
    syncCanvasSize();
    if (oldW === W && oldH === H) return;
    if (app.running && app.activeId) {
      beginGame(app.activeId);
    } else if (app.activeId) {
      selectGame(app.activeId);
    } else {
      showMenu();
    }
  });
  requestAnimationFrame(tick);
}

init();
