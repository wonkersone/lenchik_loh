const $ = (selector) => document.querySelector(selector);
const screen = $("#gameScreen");
const hud = $("#hud");
const gameGrid = $("#gameGrid");
const gameTitle = $("#gameTitle");
const totalScoreEl = $("#totalScore");
const finalPanel = $("#finalPanel");

let activeGame = null;
let activeId = null;
let totalScore = Number(localStorage.getItem("lenchik-total-score") || 0);
let completed = new Set(JSON.parse(localStorage.getItem("lenchik-completed") || "[]"));

const state = {
  score: 0,
  time: 0,
  combo: 0,
  best: 0,
};

const games = [
  {
    id: "whack",
    title: "Ударь Ленчика",
    tag: "Леня выскакивает, Ева с тортом спасает очки",
    color: "#ff4d6d",
    start: startWhack,
  },
  {
    id: "search",
    title: "Где Рюкзак?",
    tag: "Найди рюкзак или учебник в школьном коридоре",
    color: "#46b3ff",
    start: startSearch,
  },
  {
    id: "build",
    title: "Ленчик На Стройке",
    tag: "Лови кирпичи, избегай кривых чертежей",
    color: "#ff9b42",
    start: startBuild,
  },
  {
    id: "race",
    title: "Формула Леня",
    tag: "Болид, конусы, кубки и дедлайны",
    color: "#ffe45c",
    start: startRace,
  },
  {
    id: "row",
    title: "Греби, Ленчик",
    tag: "Держи ритм и разгони лодку",
    color: "#35e6a6",
    start: startRow,
  },
  {
    id: "shoot",
    title: "Counter-Lenchik",
    tag: "Тир по дедлайнам, лагам и будильникам",
    color: "#9b7cff",
    start: startShoot,
  },
  {
    id: "match",
    title: "Три В Ряд",
    tag: "Собирай эмоции Ленчика",
    color: "#f865b0",
    start: startMatch,
  },
  {
    id: "maze",
    title: "Побег С Парты",
    tag: "Лабиринт, звонок и свечки",
    color: "#35c8ff",
    start: startMaze,
  },
];

function saveProgress() {
  localStorage.setItem("lenchik-total-score", String(totalScore));
  localStorage.setItem("lenchik-completed", JSON.stringify([...completed]));
}

function addTotal(points) {
  totalScore = Math.max(0, totalScore + points);
  totalScoreEl.textContent = totalScore;
  saveProgress();
}

function markComplete(id) {
  completed.add(id);
  saveProgress();
  renderGameGrid();
  if (completed.size >= 4) finalPanel.hidden = false;
}

function setHud(items) {
  hud.innerHTML = items
    .map(([label, value]) => `<div class="hud-item"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function updateHud(extra = []) {
  if (!Array.isArray(extra)) extra = [];
  setHud([
    ["Счет", state.score],
    ["Время", state.time],
    ["Комбо", state.combo],
    ["Лучшее", state.best],
    ...extra,
  ].slice(0, 4));
}

function toast(message, bad = false) {
  const old = $(".toast");
  if (old) old.remove();
  const box = document.createElement("div");
  box.className = `toast${bad ? " bad" : ""}`;
  box.textContent = message;
  screen.appendChild(box);
  setTimeout(() => box.remove(), 1500);
}

function stopActive() {
  if (activeGame?.stop) activeGame.stop();
  activeGame = null;
}

function startGame(id) {
  stopActive();
  activeId = id;
  const game = games.find((item) => item.id === id);
  gameTitle.textContent = game.title;
  state.score = 0;
  state.combo = 0;
  state.time = 30;
  state.best = Number(localStorage.getItem(`lenchik-best-${id}`) || 0);
  updateHud();
  screen.innerHTML = "";
  game.start();
  renderGameGrid();
}

function finishGame(id, bonusMessage = "Раунд завершен") {
  const bestKey = `lenchik-best-${id}`;
  const previous = Number(localStorage.getItem(bestKey) || 0);
  if (state.score > previous) {
    localStorage.setItem(bestKey, String(state.score));
    state.best = state.score;
  }
  addTotal(Math.max(0, state.score));
  markComplete(id);
  updateHud();
  toast(`${bonusMessage}: +${Math.max(0, state.score)} к общему счету`);
}

function renderGameGrid() {
  gameGrid.innerHTML = games.map((game) => {
    const done = completed.has(game.id) ? " ПРОЙДЕНО" : "";
    const active = game.id === activeId ? " is-active" : "";
    return `
      <button class="cartridge${active}" style="--cart-color:${game.color}" data-game="${game.id}">
        <strong>${game.title}${done}</strong>
        <span>${game.tag}</span>
      </button>
    `;
  }).join("");
  gameGrid.querySelectorAll("[data-game]").forEach((btn) => {
    btn.addEventListener("click", () => startGame(btn.dataset.game));
  });
}

function makeCanvas(width = 96, height = 96) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function px(ctx, x, y, w, h, color, scale = 4) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
}

function drawLenya(canvas, options = {}) {
  const ctx = canvas.getContext("2d");
  const scale = canvas.width / 48;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  const outfit = options.outfit || "tan";
  const mood = options.mood || "smile";
  const hair = "#2b1b16";
  const skin = "#f0b28d";
  const shade = "#d98c72";
  const dark = "#120c0b";
  const suit = {
    tan: "#a77b4b",
    builder: "#f0a629",
    racer: "#e63b54",
    rower: "#2c75ff",
    cs: "#30433a",
    casual: "#d91f34",
    black: "#16151c",
  }[outfit] || "#a77b4b";
  px(ctx, 16, 5, 17, 4, hair, scale);
  px(ctx, 13, 9, 23, 6, hair, scale);
  px(ctx, 12, 14, 24, 13, skin, scale);
  px(ctx, 12, 24, 3, 5, shade, scale);
  px(ctx, 33, 24, 3, 5, shade, scale);
  px(ctx, 16, 17, 6, 2, dark, scale);
  px(ctx, 27, 17, 6, 2, dark, scale);
  px(ctx, 18, 20, 3, 3, "#34251d", scale);
  px(ctx, 29, 20, 3, 3, "#34251d", scale);
  px(ctx, 24, 22, 2, 3, shade, scale);
  if (mood === "serious") px(ctx, 21, 27, 9, 2, dark, scale);
  if (mood === "duck") {
    px(ctx, 21, 26, 8, 3, "#b44962", scale);
    px(ctx, 23, 25, 4, 1, "#f5a3b3", scale);
  }
  if (mood === "wow") {
    px(ctx, 18, 20, 4, 4, "#fff", scale);
    px(ctx, 29, 20, 4, 4, "#fff", scale);
    px(ctx, 23, 27, 5, 5, dark, scale);
  }
  if (mood === "smile") {
    px(ctx, 20, 27, 10, 2, dark, scale);
    px(ctx, 22, 28, 6, 1, "#fff", scale);
  }
  px(ctx, 20, 29, 8, 5, skin, scale);
  px(ctx, 12, 34, 24, 19, suit, scale);
  px(ctx, 21, 34, 7, 18, "#f7f2d8", scale);
  if (outfit === "tan") px(ctx, 23, 35, 3, 12, "#16151c", scale);
  if (outfit === "builder") {
    px(ctx, 14, 6, 20, 4, "#ffe45c", scale);
    px(ctx, 17, 2, 14, 5, "#ffe45c", scale);
    px(ctx, 23, 35, 3, 10, "#303030", scale);
  }
  if (outfit === "racer") {
    px(ctx, 13, 34, 22, 4, "#fff", scale);
    px(ctx, 17, 39, 14, 3, "#ffe45c", scale);
  }
  if (outfit === "rower") px(ctx, 8, 43, 32, 3, "#c77a3b", scale);
  if (outfit === "cs") px(ctx, 31, 41, 8, 3, "#1a1a1a", scale);
  px(ctx, 8, 36, 5, 16, skin, scale);
  px(ctx, 35, 36, 5, 16, skin, scale);
  px(ctx, 16, 53, 7, 16, "#1c2030", scale);
  px(ctx, 26, 53, 7, 16, "#1c2030", scale);
  px(ctx, 14, 69, 10, 4, "#0a0a0d", scale);
  px(ctx, 25, 69, 10, 4, "#0a0a0d", scale);
}

function drawEva(canvas, options = {}) {
  const ctx = canvas.getContext("2d");
  const scale = canvas.width / 48;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  px(ctx, 10, 8, 28, 28, "#181016", scale);
  px(ctx, 13, 11, 23, 20, "#f0b28d", scale);
  px(ctx, 14, 10, 22, 6, "#181016", scale);
  px(ctx, 16, 19, 4, 3, "#fff", scale);
  px(ctx, 29, 19, 4, 3, "#fff", scale);
  px(ctx, 17, 20, 2, 2, "#26334a", scale);
  px(ctx, 30, 20, 2, 2, "#26334a", scale);
  px(ctx, 21, 26, 8, 3, options.mood === "cake" ? "#b44962" : "#2a1515", scale);
  px(ctx, 13, 34, 22, 17, "#f7f2d8", scale);
  px(ctx, 9, 36, 6, 14, "#f0b28d", scale);
  px(ctx, 34, 36, 6, 14, "#f0b28d", scale);
  if (options.cake) {
    px(ctx, 15, 47, 18, 8, "#fff3b0", scale);
    px(ctx, 15, 44, 18, 4, "#ff7aa2", scale);
    px(ctx, 23, 40, 2, 4, "#ffe45c", scale);
  }
  px(ctx, 16, 51, 7, 14, "#2b2351", scale);
  px(ctx, 26, 51, 7, 14, "#2b2351", scale);
  px(ctx, 15, 65, 9, 4, "#151515", scale);
  px(ctx, 25, 65, 9, 4, "#151515", scale);
}

function drawFace(canvas, mood = "smile") {
  drawLenya(canvas, { mood });
}

function countdown(seconds, onTick, onDone) {
  let left = seconds;
  state.time = left;
  onTick?.(left);
  const timer = setInterval(() => {
    left -= 1;
    state.time = left;
    onTick?.(left);
    if (left <= 0) {
      clearInterval(timer);
      onDone?.();
    }
  }, 1000);
  return () => clearInterval(timer);
}

function gameIntro(title, text, action = "Старт") {
  screen.innerHTML = `
    <div class="game-intro">
      <h3>${title}</h3>
      <p>${text}</p>
      <button class="pixel-button primary" id="startRound">${action}</button>
    </div>
  `;
  return $("#startRound");
}

function startWhack() {
  const start = gameIntro("Бей Ленчика, не трогай Еву", "Леня выскакивает из лунок. За Леню дают очки. Если выскочила Ева с тортом, не бей: будет штраф.");
  activeGame = { stop: () => {} };
  start.addEventListener("click", () => {
    screen.innerHTML = `<div class="whack-grid"></div>`;
    const grid = $(".whack-grid");
    const holes = Array.from({ length: 9 }, (_, index) => {
      const hole = document.createElement("button");
      hole.className = "hole";
      hole.type = "button";
      const canvas = makeCanvas(96, 96);
      hole.appendChild(canvas);
      grid.appendChild(hole);
      return { hole, canvas, kind: "empty", index };
    });
    let live = true;
    let current = null;
    const endTimer = countdown(30, updateHud, () => {
      live = false;
      finishGame("whack", "Ленчики обработаны");
    });
    const pop = setInterval(() => {
      holes.forEach((item) => {
        item.hole.classList.remove("up");
        item.kind = "empty";
      });
      current = holes[Math.floor(Math.random() * holes.length)];
      const eva = Math.random() < 0.18;
      current.kind = eva ? "eva" : "lenya";
      if (eva) drawEva(current.canvas, { cake: true, mood: "cake" });
      else drawLenya(current.canvas, { mood: Math.random() < 0.5 ? "wow" : "duck", outfit: "casual" });
      current.hole.classList.add("up");
    }, 620);
    holes.forEach((item) => {
      item.hole.addEventListener("click", () => {
        if (!live || item.kind === "empty") return;
        if (item.kind === "eva") {
          state.score = Math.max(0, state.score - 8);
          state.combo = 0;
          item.hole.classList.add("flash-bad");
          toast("Ева с тортом! Минус очки", true);
        } else {
          state.score += 5 + state.combo;
          state.combo += 1;
          item.hole.classList.add("flash-good");
        }
        item.kind = "empty";
        item.hole.classList.remove("up");
        updateHud();
      });
    });
    activeGame.stop = () => {
      clearInterval(pop);
      endTimer();
      live = false;
    };
  });
}

function startSearch() {
  const start = gameIntro("Найди рюкзак", "В школьном коридоре слишком много вещей. Найди синий рюкзак или зеленый учебник до звонка.");
  activeGame = { stop: () => {} };
  start.addEventListener("click", () => {
    screen.innerHTML = `<div class="search-game"></div>`;
    const area = $(".search-game");
    const colors = ["#6a4c93", "#ff9b42", "#2a9d8f", "#e76f51", "#577590", "#f7b801", "#3a86ff"];
    for (let i = 0; i < 72; i += 1) {
      const item = document.createElement("div");
      item.className = "corridor-item";
      item.style.setProperty("--item-color", colors[i % colors.length]);
      item.style.left = `${4 + Math.random() * 88}%`;
      item.style.top = `${16 + Math.random() * 75}%`;
      item.style.width = `${22 + Math.random() * 62}px`;
      item.style.height = `${18 + Math.random() * 70}px`;
      area.appendChild(item);
    }
    let round = 0;
    let live = true;
    function placeTarget() {
      const old = $(".hidden-object");
      if (old) old.remove();
      const target = document.createElement("button");
      target.type = "button";
      target.className = `hidden-object${round % 2 ? " book" : ""}`;
      target.ariaLabel = round % 2 ? "Учебник" : "Рюкзак";
      target.style.left = `${8 + Math.random() * 80}%`;
      target.style.top = `${22 + Math.random() * 65}%`;
      target.addEventListener("click", () => {
        if (!live) return;
        state.score += 12 + round * 2;
        state.combo += 1;
        round += 1;
        updateHud([["Раунд", round + 1]]);
        toast(round % 2 ? "Учебник найден" : "Рюкзак найден");
        placeTarget();
      });
      area.appendChild(target);
    }
    placeTarget();
    const endTimer = countdown(35, () => updateHud([["Раунд", round + 1]]), () => {
      live = false;
      finishGame("search", "Рюкзак почти спасен");
    });
    activeGame.stop = () => {
      live = false;
      endTimer();
    };
  });
}

function startBuild() {
  const start = gameIntro("Построй башню", "Двигай Ленчика мышью или пальцем. Кирпичи и каски дают этажи. Кривой чертеж ломает комбо.");
  activeGame = { stop: () => {} };
  start.addEventListener("click", () => {
    screen.innerHTML = `<div class="construction-game"><div class="tower"></div></div>`;
    const area = $(".construction-game");
    const tower = $(".tower");
    const catcher = makeCanvas(64, 96);
    catcher.className = "catcher";
    drawLenya(catcher, { outfit: "builder", mood: "serious" });
    area.appendChild(catcher);
    let x = area.clientWidth / 2;
    let live = true;
    const move = (clientX) => {
      const rect = area.getBoundingClientRect();
      x = Math.max(30, Math.min(area.clientWidth - 80, clientX - rect.left));
      catcher.style.left = `${x}px`;
    };
    area.addEventListener("pointermove", (event) => move(event.clientX));
    const fallers = new Set();
    const spawn = setInterval(() => {
      const node = document.createElement("div");
      const bad = Math.random() < 0.22;
      node.className = `falling${bad ? " bad" : ""}`;
      node.textContent = bad ? "X" : "[]";
      node.style.left = `${30 + Math.random() * (area.clientWidth - 80)}px`;
      node.style.top = "-44px";
      node.dataset.bad = bad ? "1" : "0";
      area.appendChild(node);
      fallers.add({ node, y: -44 });
    }, 520);
    const loop = setInterval(() => {
      for (const item of [...fallers]) {
        item.y += 5.5;
        item.node.style.top = `${item.y}px`;
        const dx = Math.abs(parseFloat(item.node.style.left) - x);
        if (item.y > area.clientHeight - 116 && dx < 58) {
          if (item.node.dataset.bad === "1") {
            state.score = Math.max(0, state.score - 10);
            state.combo = 0;
            area.classList.add("shake");
            setTimeout(() => area.classList.remove("shake"), 300);
          } else {
            state.score += 8 + state.combo;
            state.combo += 1;
            const brick = document.createElement("div");
            brick.className = "brick";
            tower.appendChild(brick);
          }
          item.node.remove();
          fallers.delete(item);
          updateHud([["Этажи", tower.children.length]]);
        } else if (item.y > area.clientHeight) {
          item.node.remove();
          fallers.delete(item);
        }
      }
    }, 28);
    const endTimer = countdown(35, () => updateHud([["Этажи", tower.children.length]]), () => {
      live = false;
      finishGame("build", "Башня сдана");
    });
    activeGame.stop = () => {
      if (!live) return;
      live = false;
      clearInterval(spawn);
      clearInterval(loop);
      endTimer();
    };
  });
}

function startRace() {
  const start = gameIntro("Доедь до финиша", "Стрелки или A/D меняют полосу. Желтые кубки дают очки, конусы забирают скорость.");
  activeGame = { stop: () => {} };
  start.addEventListener("click", () => {
    screen.innerHTML = `<div class="race-game"></div>`;
    const area = $(".race-game");
    const player = document.createElement("div");
    player.className = "race-player";
    area.appendChild(player);
    const lanes = [0.27, 0.5, 0.73];
    let lane = 1;
    let speed = 5;
    let distance = 0;
    let live = true;
    const placePlayer = () => {
      player.style.left = `${lanes[lane] * area.clientWidth - 27}px`;
    };
    placePlayer();
    const onKey = (event) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") lane = Math.max(0, lane - 1);
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") lane = Math.min(2, lane + 1);
      placePlayer();
    };
    window.addEventListener("keydown", onKey);
    area.addEventListener("pointerdown", (event) => {
      const rect = area.getBoundingClientRect();
      lane = event.clientX - rect.left < rect.width / 2 ? Math.max(0, lane - 1) : Math.min(2, lane + 1);
      placePlayer();
    });
    const objects = new Set();
    const spawn = setInterval(() => {
      const node = document.createElement("div");
      const collect = Math.random() < 0.36;
      node.className = collect ? "race-collect" : "race-obstacle";
      const objLane = Math.floor(Math.random() * 3);
      node.style.left = `${lanes[objLane] * area.clientWidth - 24}px`;
      node.style.top = "-56px";
      node.dataset.lane = objLane;
      node.dataset.collect = collect ? "1" : "0";
      area.appendChild(node);
      objects.add({ node, y: -56 });
    }, 720);
    const loop = setInterval(() => {
      distance += speed;
      for (const obj of [...objects]) {
        obj.y += speed + 2;
        obj.node.style.top = `${obj.y}px`;
        if (obj.y > area.clientHeight - 116 && obj.y < area.clientHeight - 32 && Number(obj.node.dataset.lane) === lane) {
          if (obj.node.dataset.collect === "1") {
            state.score += 15;
            state.combo += 1;
          } else {
            state.score = Math.max(0, state.score - 8);
            state.combo = 0;
            speed = Math.max(3, speed - 0.6);
            area.classList.add("shake");
            setTimeout(() => area.classList.remove("shake"), 300);
          }
          obj.node.remove();
          objects.delete(obj);
          updateHud([["Км", Math.floor(distance / 100)]]);
        } else if (obj.y > area.clientHeight) {
          obj.node.remove();
          objects.delete(obj);
        }
      }
      speed = Math.min(9, speed + 0.004);
    }, 28);
    const endTimer = countdown(35, () => updateHud([["Км", Math.floor(distance / 100)]]), () => {
      live = false;
      finishGame("race", "Финиш");
    });
    activeGame.stop = () => {
      if (!live) return;
      live = false;
      clearInterval(spawn);
      clearInterval(loop);
      endTimer();
      window.removeEventListener("keydown", onKey);
    };
  });
}

function startRow() {
  const start = gameIntro("Поймай ритм", "Нажимай ЛЕВО и ПРАВО по очереди. Правильная последовательность ускоряет лодку.");
  activeGame = { stop: () => {} };
  start.addEventListener("click", () => {
    screen.innerHTML = `
      <div class="row-game"><div class="boat"></div></div>
      <div class="rhythm-pad">
        <button class="pixel-button primary" data-oar="left">ЛЕВО</button>
        <button class="pixel-button primary" data-oar="right">ПРАВО</button>
      </div>
    `;
    const boat = $(".boat");
    const area = $(".row-game");
    let expected = "left";
    let progress = 0;
    let live = true;
    const waves = setInterval(() => {
      const wave = document.createElement("div");
      wave.className = "wave";
      wave.style.top = `${20 + Math.random() * 72}%`;
      area.appendChild(wave);
      let x = -70;
      const move = setInterval(() => {
        x += 8;
        wave.style.transform = `translateX(${-x}px)`;
        if (x > area.clientWidth + 120) {
          clearInterval(move);
          wave.remove();
        }
      }, 35);
    }, 520);
    const row = (side) => {
      if (!live) return;
      if (side === expected) {
        progress += 18 + state.combo * 1.5;
        state.score += 4 + state.combo;
        state.combo += 1;
        expected = expected === "left" ? "right" : "left";
        boat.style.left = `${Math.min(area.clientWidth - 150, 28 + progress)}px`;
      } else {
        state.combo = 0;
        state.score = Math.max(0, state.score - 3);
        toast("Сбился ритм", true);
      }
      if (progress > area.clientWidth - 210) {
        state.score += 60;
        live = false;
        clearInterval(waves);
        finishGame("row", "Финиш на воде");
      }
      updateHud([["Нужно", expected === "left" ? "ЛЕВО" : "ПРАВО"]]);
    };
    screen.querySelectorAll("[data-oar]").forEach((button) => {
      button.addEventListener("click", () => row(button.dataset.oar));
    });
    const onKey = (event) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") row("left");
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") row("right");
    };
    window.addEventListener("keydown", onKey);
    const endTimer = countdown(30, () => updateHud([["Нужно", expected === "left" ? "ЛЕВО" : "ПРАВО"]]), () => {
      live = false;
      finishGame("row", "Заплыв окончен");
    });
    activeGame.stop = () => {
      live = false;
      clearInterval(waves);
      endTimer();
      window.removeEventListener("keydown", onKey);
    };
  });
}

function startShoot() {
  const start = gameIntro("Тир без токсичности", "Стреляй по дедлайнам, лагам и будильникам. Красную Еву с тортом не трогай.");
  activeGame = { stop: () => {} };
  start.addEventListener("click", () => {
    screen.innerHTML = `<div class="shoot-game"></div>`;
    const area = $(".shoot-game");
    let live = true;
    const labels = ["LAG", "ДЕД", "ALRM", "EXAM"];
    function spawnTarget() {
      if (!live) return;
      const target = document.createElement("button");
      target.type = "button";
      const bad = Math.random() < 0.14;
      target.className = `target${bad ? " bad" : ""}`;
      target.textContent = bad ? "EVA" : labels[Math.floor(Math.random() * labels.length)];
      target.style.left = `${8 + Math.random() * 78}%`;
      target.style.top = `${10 + Math.random() * 72}%`;
      target.addEventListener("click", (event) => {
        event.stopPropagation();
        if (bad) {
          state.score = Math.max(0, state.score - 12);
          state.combo = 0;
          toast("Ева с тортом вне тира", true);
        } else {
          state.score += 10 + state.combo;
          state.combo += 1;
        }
        target.remove();
        updateHud();
      });
      area.appendChild(target);
      setTimeout(() => target.remove(), 1350);
    }
    area.addEventListener("click", () => {
      state.combo = 0;
      state.score = Math.max(0, state.score - 2);
      updateHud();
    });
    const spawn = setInterval(spawnTarget, 420);
    const endTimer = countdown(30, updateHud, () => {
      live = false;
      finishGame("shoot", "Тир закрыт");
    });
    activeGame.stop = () => {
      live = false;
      clearInterval(spawn);
      endTimer();
    };
  });
}

function startMatch() {
  const start = gameIntro("Собери эмоции", "Меняй соседние плитки. Три одинаковых лица в ряд исчезают и дают очки.");
  activeGame = { stop: () => {} };
  start.addEventListener("click", () => {
    screen.innerHTML = `<div class="match-board"></div><p class="game-note">Подсказка: кликай две соседние плитки.</p>`;
    const board = $(".match-board");
    const moods = ["smile", "serious", "duck", "wow"];
    const size = 6;
    let grid = Array.from({ length: size * size }, () => moods[Math.floor(Math.random() * moods.length)]);
    let selected = null;
    let live = true;
    function render() {
      board.innerHTML = "";
      grid.forEach((mood, index) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = `gem${selected === index ? " selected" : ""}`;
        cell.dataset.index = index;
        const canvas = makeCanvas(64, 64);
        drawFace(canvas, mood);
        cell.appendChild(canvas);
        cell.addEventListener("click", () => clickGem(index));
        board.appendChild(cell);
      });
    }
    function adjacent(a, b) {
      const ax = a % size;
      const ay = Math.floor(a / size);
      const bx = b % size;
      const by = Math.floor(b / size);
      return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
    }
    function findMatches() {
      const matches = new Set();
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size - 2; x += 1) {
          const i = y * size + x;
          if (grid[i] === grid[i + 1] && grid[i] === grid[i + 2]) {
            matches.add(i); matches.add(i + 1); matches.add(i + 2);
          }
        }
      }
      for (let x = 0; x < size; x += 1) {
        for (let y = 0; y < size - 2; y += 1) {
          const i = y * size + x;
          if (grid[i] === grid[i + size] && grid[i] === grid[i + size * 2]) {
            matches.add(i); matches.add(i + size); matches.add(i + size * 2);
          }
        }
      }
      return matches;
    }
    function clearMatches() {
      const matches = findMatches();
      if (!matches.size) return false;
      state.score += matches.size * 6 + state.combo * 3;
      state.combo += 1;
      matches.forEach((index) => {
        grid[index] = moods[Math.floor(Math.random() * moods.length)];
      });
      updateHud([["Собрано", matches.size]]);
      return true;
    }
    function clickGem(index) {
      if (!live) return;
      if (selected === null) {
        selected = index;
        render();
        return;
      }
      if (!adjacent(selected, index)) {
        selected = index;
        render();
        return;
      }
      [grid[selected], grid[index]] = [grid[index], grid[selected]];
      if (!clearMatches()) {
        [grid[selected], grid[index]] = [grid[index], grid[selected]];
        state.combo = 0;
        toast("Матча нет", true);
      }
      selected = null;
      render();
    }
    while (clearMatches()) {}
    state.score = 0;
    state.combo = 0;
    render();
    const endTimer = countdown(45, () => updateHud([["Ход", selected === null ? "1" : "2"]]), () => {
      live = false;
      finishGame("match", "Эмоции собраны");
    });
    activeGame.stop = () => {
      live = false;
      endTimer();
    };
  });
}

function startMaze() {
  const start = gameIntro("Сбеги до звонка", "Собери свечки и доберись до зеленого выхода. Управление стрелками или WASD.");
  activeGame = { stop: () => {} };
  start.addEventListener("click", () => {
    const map = [
      "#############",
      "#.....#.....#",
      "#.###.#.###.#",
      "#.#.......#.#",
      "#.#.#####.#.#",
      "#...#...#...#",
      "###.#.#.#.###",
      "#.....#.....#",
      "#.###...###.#",
      "#.....#....E#",
      "#############",
    ];
    screen.innerHTML = `<div class="maze-game"></div><p class="game-note">Собирай желтые точки, потом выходи к зеленой клетке.</p>`;
    const area = $(".maze-game");
    let player = { x: 1, y: 1 };
    let dots = 0;
    let live = true;
    const avatar = makeCanvas(64, 64);
    drawLenya(avatar, { outfit: "black", mood: "serious" });
    function render() {
      area.innerHTML = "";
      dots = 0;
      map.forEach((row, y) => {
        [...row].forEach((char, x) => {
          const cell = document.createElement("div");
          cell.className = "maze-cell";
          if (char === "#") cell.classList.add("maze-wall");
          if (char === ".") {
            cell.classList.add("maze-dot");
            dots += 1;
          }
          if (char === "E") cell.classList.add("maze-exit");
          if (player.x === x && player.y === y) {
            cell.classList.add("maze-player");
            cell.appendChild(avatar.cloneNode(true));
            drawLenya(cell.firstChild, { outfit: "black", mood: "serious" });
          }
          area.appendChild(cell);
        });
      });
      updateHud([["Свечки", dots]]);
    }
    function setChar(x, y, char) {
      const row = map[y];
      map[y] = row.slice(0, x) + char + row.slice(x + 1);
    }
    function move(dx, dy) {
      if (!live) return;
      const nx = player.x + dx;
      const ny = player.y + dy;
      const next = map[ny][nx];
      if (next === "#") return;
      player = { x: nx, y: ny };
      if (next === ".") {
        state.score += 4;
        state.combo += 1;
        setChar(nx, ny, " ");
      }
      if (next === "E") {
        if (dots <= 0) {
          state.score += 80;
          live = false;
          finishGame("maze", "Из класса сбежали");
        } else {
          toast("Сначала свечки", true);
        }
      }
      render();
    }
    const onKey = (event) => {
      const key = event.key.toLowerCase();
      if (key === "arrowup" || key === "w") move(0, -1);
      if (key === "arrowdown" || key === "s") move(0, 1);
      if (key === "arrowleft" || key === "a") move(-1, 0);
      if (key === "arrowright" || key === "d") move(1, 0);
    };
    window.addEventListener("keydown", onKey);
    area.addEventListener("pointerdown", (event) => {
      const rect = area.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0);
      else move(0, dy > 0 ? 1 : -1);
    });
    render();
    const endTimer = countdown(55, () => updateHud([["Свечки", dots]]), () => {
      live = false;
      finishGame("maze", "Звонок прозвенел");
    });
    activeGame.stop = () => {
      live = false;
      endTimer();
      window.removeEventListener("keydown", onKey);
    };
  });
}

function showMenu() {
  stopActive();
  activeId = null;
  gameTitle.textContent = "Выбери картридж";
  setHud([["Счет", 0], ["Время", 0], ["Комбо", 0], ["Лучшее", 0]]);
  screen.innerHTML = `
    <div class="attract">
      <canvas id="attractSprite" width="220" height="220"></canvas>
      <p>Выбери игру справа или нажми случайный картридж. После нескольких побед откроется праздничный финал.</p>
    </div>
  `;
  drawLenya($("#attractSprite"), { outfit: "racer", mood: "smile" });
  renderGameGrid();
}

function init() {
  totalScoreEl.textContent = totalScore;
  renderGameGrid();
  drawLenya($("#heroSprite"), { outfit: "tan", mood: "smile" });
  drawLenya($("#attractSprite"), { outfit: "racer", mood: "smile" });
  drawLenya($("#finalLenya"), { outfit: "casual", mood: "wow" });
  drawEva($("#finalEva"), { cake: true, mood: "cake" });
  setHud([["Счет", 0], ["Время", 0], ["Комбо", 0], ["Лучшее", 0]]);
  if (completed.size >= 4) finalPanel.hidden = false;
  $("#restartBtn").addEventListener("click", () => activeId ? startGame(activeId) : showMenu());
  $("#menuBtn").addEventListener("click", showMenu);
  $("[data-start-random]").addEventListener("click", () => startGame(games[Math.floor(Math.random() * games.length)].id));
  $("[data-open-final]").addEventListener("click", () => {
    finalPanel.hidden = false;
    finalPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  const lines = [
    "ребят, а вы не видели мой рюкзак?",
    "почему болид опять на паре?",
    "строю башню, держите кирпич",
    "если что, я на воде",
  ];
  setInterval(() => {
    $("#speechBubble").textContent = lines[Math.floor(Math.random() * lines.length)];
  }, 3600);
}

init();
