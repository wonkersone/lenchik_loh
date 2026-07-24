const W = 960;
const H = 540;

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const hud = document.querySelector("#hud");
const gameMenu = document.querySelector("#gameMenu");
const titleEl = document.querySelector("#gameTitle");
const kindEl = document.querySelector("#gameKind");
const totalScoreEl = document.querySelector("#totalScore");

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
  lastTime: 0,
  score: 0,
  time: 0,
  combo: 0,
  metric: "",
  pointer: { x: W / 2, y: H / 2, down: false },
  keys: new Set(),
};

const bgRects = {
  school: [0, 0, 768, 341],
  build: [768, 0, 768, 341],
  race: [0, 341, 768, 341],
  river: [768, 341, 768, 341],
  arcade: [768, 682, 768, 342],
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
    rules: "На экране куча школьных вещей. Среди них ровно один рюкзак. Найди его до звонка: каждый раз цвет рюкзака меняется.",
    make: makeSearchGame,
  },
  {
    id: "whack",
    title: "Не бей Еву",
    kind: "реакция",
    desc: "Бей Лёню, Еву с тортиком не трогай.",
    accent: "#ff4f78",
    icon: "lenya_face/lenya_face-04.png",
    introImage: "eva/eva-02.png",
    rules: "Леня и Ева выскакивают из лунок. Бей только Леню. Если ударишь Еву с тортом, счет падает.",
    make: makeWhackGame,
  },
  {
    id: "build",
    title: "Строитель МГСУ",
    kind: "ловкость",
    desc: "Лови материалы и собирай этажи.",
    accent: "#ff9f43",
    icon: "lenya_face/lenya_face-16.png",
    introImage: "lenya_pose/lenya_pose-02.png",
    rules: "Двигай Леню по стройке, лови нормальные материалы и не хватай опасные знаки.",
    make: makeBuildGame,
  },
  {
    id: "race",
    title: "Октаха ехать, Мерседес сосать",
    kind: "гонка",
    desc: "Шашки 40",
    accent: "#ffd84a",
    icon: "lenya_face/lenya_face-17.png",
    introImage: "racing/racing-21.png",
    rules: "Тапай слева или справа, меняй полосу, объезжай конусы и собирай бонусы.",
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
    rules: "Жми левый и правый борт по очереди. Сбился с ритма - теряешь комбо.",
    make: makeRowGame,
  },
  {
    id: "match",
    title: "3 в ряд с Иванычем",
    kind: "головоломка",
    desc: "Собирай одинаковые лица в ряд.",
    accent: "#f865b0",
    icon: "lenya_face/lenya_face-04.png",
    introImage: "lenya_face/lenya_face-04.png",
    rules: "Меняй местами соседние лица. Три одинаковых в ряд исчезают и дают очки.",
    make: makeMatchGame,
  },
  {
    id: "tower",
    title: "Башня из учебников",
    kind: "тайминг",
    desc: "Роняй книги ровно, не завали башню.",
    accent: "#9b7cff",
    icon: "lenya_face/lenya_face-19.png",
    introImage: "lenya_pose/lenya_pose-03.png",
    rules: "Тапай в нужный момент, чтобы бросить учебник ровно на башню. Чем ровнее, тем больше очков.",
    make: makeTowerGame,
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

function rectHit(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function circleHit(p, c) {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return dx * dx + dy * dy <= c.r * c.r;
}

function drawBg(name) {
  const bg = img("assets/backgrounds/game-backgrounds.png");
  const rect = bgRects[name] || bgRects.arcade;
  if (bg) {
    ctx.drawImage(bg, ...rect, 0, 0, W, H);
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

function drawImageFit(image, x, y, w, h, anchor = "center") {
  if (!image) return;
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  const dx = anchor === "bottom" ? x + (w - dw) / 2 : x + (w - dw) / 2;
  const dy = anchor === "bottom" ? y + h - dh : y + (h - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
}

function updateHud() {
  hud.innerHTML = [
    ["счет", app.score],
    ["время", Math.ceil(app.time)],
    ["комбо", app.combo],
  ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  totalScoreEl.textContent = totalScore();
}

function showOverlay(title, text) {
  overlay.classList.remove("is-hidden");
  overlay.innerHTML = `<div class="overlay-card"><h3>${title}</h3><p>${text}</p></div>`;
}

function showGameIntro(meta) {
  const imagePath = meta.introImage ? `assets/sprites/${meta.introImage}` : `assets/sprites/${meta.icon}`;
  overlay.classList.remove("is-hidden");
  overlay.innerHTML = `
    <div class="overlay-card intro-card">
      <img src="${imagePath}" alt="">
      <div>
        <p class="kicker">${meta.kind}</p>
        <h3>${meta.title}</h3>
        <p>${meta.rules || meta.desc}</p>
        <button type="button" data-begin-game>НАЧАТЬ</button>
      </div>
    </div>
  `;
  overlay.querySelector("[data-begin-game]").addEventListener("click", () => beginGame(meta.id));
}

function hideOverlay() {
  overlay.classList.add("is-hidden");
  overlay.innerHTML = "";
}

function finish(message) {
  app.running = false;
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
  const meta = games.find((game) => game.id === id);
  if (!meta) return;
  if (location.hash !== `#${id}`) {
    history.replaceState(null, "", `#${id}`);
  }
  app.activeId = id;
  app.score = 0;
  app.combo = 0;
  app.time = 0;
  app.metric = "";
  app.running = false;
  app.game = makeGamePreview(meta);
  titleEl.textContent = meta.title;
  kindEl.textContent = meta.kind;
  updateHud();
  renderMenu();
  showGameIntro(meta);
  if (window.innerWidth <= 980) {
    setTimeout(() => document.querySelector(".stage-wrap").scrollIntoView({ block: "start" }), 40);
  }
}

function beginGame(id) {
  const meta = games.find((game) => game.id === id);
  if (!meta) return;
  app.activeId = id;
  app.score = 0;
  app.combo = 0;
  app.time = 35;
  app.metric = "";
  app.running = true;
  app.lastTime = performance.now();
  app.game = meta.make();
  titleEl.textContent = meta.title;
  kindEl.textContent = meta.kind;
  hideOverlay();
  updateHud();
  renderMenu();
  if (window.innerWidth <= 980) {
    setTimeout(() => document.querySelector(".stage-wrap").scrollIntoView({ block: "start" }), 40);
  }
}

function restartGame() {
  if (app.activeId) beginGame(app.activeId);
}

function showMenu() {
  app.running = false;
  app.game = makeAttractGame();
  app.activeId = null;
  titleEl.textContent = "Выбери игру";
  kindEl.textContent = "READY";
  app.score = 0;
  app.time = 0;
  app.combo = 0;
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
  if (!app.running) return;
  app.game?.tap?.(app.pointer);
});

canvas.addEventListener("pointermove", (event) => {
  app.pointer = { ...pointerFromEvent(event), down: app.pointer.down };
  if (!app.running) return;
  app.game?.move?.(app.pointer);
});

canvas.addEventListener("pointerup", (event) => {
  app.pointer = { ...pointerFromEvent(event), down: false };
  app.game?.up?.(app.pointer);
});

window.addEventListener("keydown", (event) => {
  app.keys.add(event.key.toLowerCase());
  if (!app.running) return;
  app.game?.key?.(event.key.toLowerCase());
});

window.addEventListener("keyup", (event) => {
  app.keys.delete(event.key.toLowerCase());
});

function tick(now) {
  const dt = Math.min(0.05, (now - app.lastTime) / 1000 || 0);
  app.lastTime = now;
  if (app.running) {
    app.time = Math.max(0, app.time - dt);
    if (app.time <= 0) finish("Время вышло");
  }
  if (app.running || app.game?.idle) app.game?.update?.(dt);
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
  app.time = 42;
  let round = 1;
  let target = null;
  let decoys = [];
  let missFlash = 0;
  const backpackIds = [0, 1, 2, 3, 4, 5];
  const objectIds = app.sprites.objects
    .map((item, index) => item && !backpackIds.includes(index) ? index : null)
    .filter((index) => index !== null);

  function newRound() {
    decoys = Array.from({ length: 64 + round * 3 }, () => ({
      img: sprite("objects", choice(objectIds)),
      x: rand(35, W - 95),
      y: rand(104, H - 86),
      w: rand(34, 78),
      h: rand(30, 72),
      rot: rand(-0.18, 0.18),
      alpha: rand(0.62, 0.92),
    }));
    target = {
      img: sprite("objects", choice(backpackIds)),
      x: rand(70, W - 130),
      y: rand(128, H - 112),
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
        app.score += 18 + round * 3 + app.combo * 2;
        app.combo += 1;
        round += 1;
        newRound();
      } else {
        app.score = Math.max(0, app.score - 2);
        app.combo = 0;
        missFlash = 0.22;
      }
    },
    update(dt) {
      missFlash = Math.max(0, missFlash - dt);
    },
    draw() {
      drawBg("school");
      drawPanel(20, 18, 380, 58, "rgba(13, 11, 25, 0.86)");
      drawText(`найди: ${target.label}`, 40, 34, 25, "#ffd84a");
      for (const item of decoys) {
        ctx.save();
        ctx.globalAlpha = item === target ? 0.94 : item.alpha;
        ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
        ctx.rotate(item.rot);
        drawImageFit(item.img, -item.w / 2, -item.h / 2, item.w, item.h);
        ctx.restore();
      }
      if (missFlash > 0) {
        ctx.fillStyle = "rgba(255,79,120,0.22)";
        ctx.fillRect(0, 0, W, H);
      }
    },
  };
}

function makeWhackGame() {
  app.time = 30;
  const holes = [];
  const faces = [2, 4, 7, 12, 15, 17, 21, 23];
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      holes.push({
        x: 230 + x * 250,
        y: 120 + y * 126,
        r: 54,
        phase: 0,
        life: 0,
        state: "hidden",
        kind: "none",
        face: 0,
        hit: 0,
      });
    }
  }
  let spawn = 0.7;
  let hammer = null;

  function pop() {
    const candidates = holes.filter((hole) => hole.state === "hidden");
    if (!candidates.length) return;
    const hole = choice(candidates);
    hole.phase = 0;
    hole.life = rand(0.58, 0.9);
    hole.state = "rising";
    hole.kind = Math.random() < 0.2 ? "eva" : "lenya";
    hole.face = choice(faces);
  }

  return {
    tap(p) {
      if (!app.running) return;
      const hit = holes.find((hole) => hole.state === "up" && circleHit(p, { x: hole.x, y: hole.y - 44, r: 58 }));
      hammer = { x: p.x, y: p.y, t: 0.16 };
      if (!hit) {
        app.combo = 0;
        return;
      }
      if (hit.kind === "eva") {
        app.score = Math.max(0, app.score - 12);
        app.combo = 0;
      } else {
        app.score += 7 + app.combo;
        app.combo += 1;
      }
      hit.hit = 0.16;
      hit.state = "falling";
    },
    update(dt) {
      spawn -= dt;
      if (spawn <= 0) {
        pop();
        spawn = rand(0.72, 1.28);
      }
      holes.forEach((hole) => {
        if (hole.hit > 0) hole.hit = Math.max(0, hole.hit - dt);
        if (hole.state === "rising") {
          hole.phase += dt / 0.12;
          if (hole.phase >= 1) {
            hole.phase = 1;
            hole.state = "up";
          }
        } else if (hole.state === "up") {
          hole.life -= dt;
          if (hole.life <= 0) hole.state = "falling";
        } else if (hole.state === "falling") {
          hole.phase -= dt / 0.14;
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
    },
    draw() {
      drawBg("arcade");
      drawPanel(150, 66, 660, 430, "rgba(9, 8, 20, 0.50)");
      holes.forEach((hole) => {
        ctx.fillStyle = "#0b0610";
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y + 44, 84, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2442";
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y + 38, 74, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#09050d";
        ctx.beginPath();
        ctx.ellipse(hole.x, hole.y + 32, 62, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff6d7";
        ctx.lineWidth = 4;
        ctx.stroke();
        if (hole.state !== "hidden" || hole.phase > 0) {
          const lift = Math.sin(hole.phase * Math.PI * 0.5) * 82;
          const image = hole.kind === "eva" ? sprite("eva", 2) : sprite("lenya_face", hole.face);
          const shake = hole.hit > 0 ? Math.sin(hole.hit * 80) * 5 : 0;
          drawImageFit(image, hole.x - 60 + shake, hole.y + 16 - lift, 120, 120);
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
    },
  };
}

function makeBuildGame() {
  app.time = 38;
  let playerX = W / 2;
  const fallers = [];
  const tower = [];
  let spawn = 0;
  const good = [0, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 17, 20, 21, 22, 23, 28, 29, 39, 40, 41, 42, 45, 48, 49, 51, 52, 53, 55, 73, 74, 75, 76, 77, 79];
  const bad = [43, 44, 56, 57, 60, 61, 62, 65, 67, 68, 69, 70, 71];

  function addFaller() {
    const isBad = Math.random() < 0.24;
    fallers.push({
      x: rand(130, W - 130),
      y: -50,
      vy: rand(130, 190),
      size: rand(48, 68),
      bad: isBad,
      img: sprite("construction", choice(isBad ? bad : good)),
    });
  }

  return {
    move(p) {
      playerX = clamp(p.x, 95, W - 95);
    },
    tap(p) {
      playerX = clamp(p.x, 95, W - 95);
    },
    update(dt) {
      if (app.keys.has("arrowleft") || app.keys.has("a")) playerX -= 380 * dt;
      if (app.keys.has("arrowright") || app.keys.has("d")) playerX += 380 * dt;
      playerX = clamp(playerX, 95, W - 95);
      spawn -= dt;
      if (spawn <= 0) {
        addFaller();
        spawn = rand(0.42, 0.72);
      }
      for (let i = fallers.length - 1; i >= 0; i -= 1) {
        const f = fallers[i];
        f.y += f.vy * dt;
        if (f.y > H - 118 && Math.abs(f.x - playerX) < 78) {
          if (f.bad) {
            app.score = Math.max(0, app.score - 10);
            app.combo = 0;
            tower.pop();
          } else {
            app.score += 9 + app.combo;
            app.combo += 1;
            tower.push(f.img);
          }
          fallers.splice(i, 1);
        } else if (f.y > H + 80) {
          fallers.splice(i, 1);
        }
      }
    },
    draw() {
      drawBg("build");
      drawPanel(24, 22, 292, 54, "rgba(13,11,25,0.8)");
      drawText(`этажи: ${tower.length}`, 44, 38, 24, "#ffd84a");
      const baseX = 58;
      for (let i = 0; i < tower.length; i += 1) {
        const y = H - 34 - i * 19;
        ctx.fillStyle = i % 2 ? "#d96d34" : "#ff9f43";
        ctx.fillRect(baseX + (i % 3) * 3, y, 142, 17);
        ctx.strokeStyle = "#fff6d7";
        ctx.lineWidth = 2;
        ctx.strokeRect(baseX + (i % 3) * 3, y, 142, 17);
      }
      fallers.forEach((f) => drawImageFit(f.img, f.x - f.size / 2, f.y - f.size / 2, f.size, f.size));
      drawImageFit(sprite("lenya_pose", 2), playerX - 56, H - 150, 112, 132, "bottom");
    },
  };
}

function makeRaceGame() {
  app.time = 36;
  const lanes = [310, 480, 650];
  let lane = 1;
  let distance = 0;
  let speed = 250;
  let spawn = 0;
  const objects = [];

  function setLane(dir) {
    lane = clamp(lane + dir, 0, 2);
  }

  function addObject() {
    const collect = Math.random() < 0.34;
    objects.push({
      lane: Math.floor(Math.random() * 3),
      y: -70,
      collect,
      img: sprite("racing", collect ? choice([16, 26]) : choice([17, 18, 19, 20, 24, 27, 28, 29, 31, 34, 35])),
    });
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
      distance += speed * dt;
      spawn -= dt;
      if (spawn <= 0) {
        addObject();
        spawn = rand(0.52, 0.82);
      }
      speed = clamp(speed + dt * 10, 250, 420);
      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const obj = objects[i];
        obj.y += speed * dt;
        if (obj.y > H - 122 && obj.y < H - 40 && obj.lane === lane) {
          if (obj.collect) {
            app.score += 18 + app.combo;
            app.combo += 1;
          } else {
            app.score = Math.max(0, app.score - 9);
            app.combo = 0;
            speed = Math.max(220, speed - 55);
          }
          objects.splice(i, 1);
        } else if (obj.y > H + 80) {
          objects.splice(i, 1);
        }
      }
    },
    draw() {
      drawBg("race");
      const roadTop = 265;
      const roadBottom = 735;
      ctx.fillStyle = "rgba(34, 36, 45, 0.88)";
      ctx.beginPath();
      ctx.moveTo(480 - roadTop / 2, 0);
      ctx.lineTo(480 + roadTop / 2, 0);
      ctx.lineTo(480 + roadBottom / 2, H);
      ctx.lineTo(480 - roadBottom / 2, H);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,246,215,0.82)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(480 - roadTop / 2, 0);
      ctx.lineTo(480 - roadBottom / 2, H);
      ctx.moveTo(480 + roadTop / 2, 0);
      ctx.lineTo(480 + roadBottom / 2, H);
      ctx.stroke();
      ctx.fillStyle = "#ffd84a";
      for (let y = -80 + (distance % 110); y < H; y += 110) {
        const t = y / H;
        const width = roadTop + (roadBottom - roadTop) * t;
        ctx.fillRect(480 - width / 6, y, 8, 58);
        ctx.fillRect(480 + width / 6, y, 8, 58);
      }
      objects.forEach((obj) => drawImageFit(obj.img, lanes[obj.lane] - 34, obj.y, 68, 68));
      drawImageFit(sprite("racing", 21), lanes[lane] - 52, H - 132, 104, 108, "bottom");
      drawText(`${Math.floor(distance / 100)} м`, 36, 34, 28, "#ffd84a");
      drawText("тап слева / справа", W - 36, 34, 20, "#fff6d7", "right");
    },
  };
}

function makeRowGame() {
  app.time = 34;
  let expected = "left";
  let progress = 0;
  let pulse = 0;
  const beats = [];
  let spawn = 0;

  function hit(side) {
    if (side === expected) {
      app.score += 8 + app.combo;
      app.combo += 1;
      progress += 32 + app.combo * 2;
      expected = expected === "left" ? "right" : "left";
      pulse = 0.35;
      if (progress > 710) finish("Заплыв окончен");
    } else {
      app.score = Math.max(0, app.score - 4);
      app.combo = 0;
      pulse = -0.25;
    }
  }

  return {
    tap(p) {
      hit(p.x < W / 2 ? "left" : "right");
    },
    key(key) {
      if (key === "arrowleft" || key === "a") hit("left");
      if (key === "arrowright" || key === "d") hit("right");
    },
    update(dt) {
      spawn -= dt;
      if (spawn <= 0) {
        beats.push({ side: expected, x: W + 40, y: expected === "left" ? 176 : 330 });
        spawn = 0.62;
      }
      beats.forEach((beat) => {
        beat.x -= 260 * dt;
      });
      while (beats.length && beats[0].x < -50) beats.shift();
      pulse = pulse > 0 ? Math.max(0, pulse - dt) : Math.min(0, pulse + dt);
    },
    draw() {
      drawBg("river");
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      for (let y = 62; y < H; y += 54) {
        ctx.fillRect(0, y, W, 3);
      }
      const boatX = 74 + progress;
      ctx.fillStyle = "#a45d2e";
      ctx.fillRect(boatX, 246, 146, 38);
      ctx.strokeStyle = "#fff6d7";
      ctx.lineWidth = 4;
      ctx.strokeRect(boatX, 246, 146, 38);
      drawImageFit(sprite("lenya_pose", 6), boatX + 36, 169, 72, 96, "bottom");
      beats.forEach((beat) => {
        ctx.fillStyle = beat.side === "left" ? "#43b6ff" : "#ff4f78";
        ctx.beginPath();
        ctx.arc(beat.x, beat.y, 26, 0, Math.PI * 2);
        ctx.fill();
        drawText(beat.side === "left" ? "L" : "R", beat.x, beat.y - 13, 24, "#070710", "center");
      });
      ctx.strokeStyle = "#ffd84a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(156, 118);
      ctx.lineTo(156, 400);
      ctx.stroke();
      drawText(expected === "left" ? "ЛЕВО" : "ПРАВО", W / 2, 34, 30, "#ffd84a", "center");
      if (pulse < 0) {
        ctx.fillStyle = "rgba(255,79,120,0.22)";
        ctx.fillRect(0, 0, W, H);
      }
    },
  };
}

function makeMatchGame() {
  app.time = 45;
  const faces = [1, 2, 4, 7, 12, 16];
  const size = 6;
  const boardX = 264;
  const boardY = 72;
  const cell = 68;
  let selected = null;
  let grid = Array.from({ length: size * size }, () => choice(faces));

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

  function refill(cleared) {
    cleared.forEach((i) => { grid[i] = choice(faces); });
  }

  function clearExisting(addScore = true) {
    const m = matches();
    if (!m.size) return false;
    if (addScore) {
      app.score += m.size * 7 + app.combo * 4;
      app.combo += 1;
    }
    refill(m);
    return true;
  }

  while (clearExisting(false)) {}

  return {
    tap(p) {
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
        app.combo = 0;
      }
      selected = null;
    },
    draw() {
      drawBg("arcade");
      drawPanel(boardX - 18, boardY - 18, cell * size + 36, cell * size + 36, "rgba(10,8,22,0.82)");
      for (let i = 0; i < grid.length; i += 1) {
        const x = boardX + (i % size) * cell;
        const y = boardY + Math.floor(i / size) * cell;
        ctx.fillStyle = selected === i ? "#ffd84a" : "#211c39";
        ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
        ctx.strokeStyle = "#fff6d7";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 4, y + 4, cell - 8, cell - 8);
        drawImageFit(sprite("lenya_face", grid[i]), x + 9, y + 9, cell - 18, cell - 18);
      }
      drawText("выбери две соседние плитки", W / 2, 494, 20, "#c9c0df", "center");
    },
  };
}

function makeTowerGame() {
  app.time = 38;
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
          app.score += Math.round(16 + overlap / 9);
          app.combo = offset < 12 ? app.combo + 1 : 0;
          if (offset < 12) app.score += 12;
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
  const paths = ["assets/backgrounds/game-backgrounds.png"];
  Object.entries(manifest).forEach(([group, items]) => {
    if (group === "ui") return;
    app.sprites[group] = items;
    items.filter(Boolean).forEach((item) => paths.push(item.file));
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
  totalScoreEl.textContent = totalScore();
  renderMenu();
  showOverlay("Загрузка", "Готовим спрайты и мини-игры.");
  await loadAssets();
  document.querySelector("#startBtn").addEventListener("click", () => {
    if (app.activeId && app.running) restartGame();
    else selectGame(app.activeId || games[0].id);
  });
  document.querySelector("#restartBtn").addEventListener("click", restartGame);
  document.querySelector("#menuBtn").addEventListener("click", showMenu);
  document.querySelector("#randomBtn").addEventListener("click", () => selectGame(choice(games).id));
  const initialId = location.hash.replace("#", "");
  if (games.some((game) => game.id === initialId)) {
    selectGame(initialId);
  } else {
    showMenu();
  }
  requestAnimationFrame(tick);
}

init();
