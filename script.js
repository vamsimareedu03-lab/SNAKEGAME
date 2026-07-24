/* =========================================================
   SnakeVerse — final combined build (login bug fixed)
   ========================================================= */

// ---------- Screen navigation ----------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (typeof updateControlVisibility === "function") updateControlVisibility();
}
document.querySelectorAll("[data-nav]").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.nav));
});

// ---------- Audio ----------
const bgMusic = document.getElementById("bgMusic");
const ambientForest = document.getElementById("ambientForest");
const clickSound = document.getElementById("clickSound");
const gameoverSound = document.getElementById("gameoverSound");
const highscoreSound = document.getElementById("highscoreSound");
const eatSounds = {
  ant: document.getElementById("eatAnt"),
  frog: document.getElementById("eatFrog"),
  mouse: document.getElementById("eatMouse"),
  rat: document.getElementById("eatRat"),
  rabbit: document.getElementById("eatRabbit")
};

let muted = localStorage.getItem("muted") === "true";
let musicOn = localStorage.getItem("musicOn") !== "false"; // default true
let soundOn = localStorage.getItem("soundOn") !== "false"; // default true

bgMusic.volume = 0.3;
ambientForest.volume = 0.25;

function playSafe(audioEl) {
  if (!audioEl || muted || !soundOn) return;
  audioEl.currentTime = 0;
  audioEl.play().catch(() => {});
}
function applyMuteToAll() {
  bgMusic.muted = muted || !musicOn;
  ambientForest.muted = muted || !musicOn;
  clickSound.muted = muted;
  gameoverSound.muted = muted;
  highscoreSound.muted = muted;
  Object.values(eatSounds).forEach(s => s.muted = muted);
}
applyMuteToAll();

document.querySelectorAll(".menu-buttons button, .row button, #restartBtn, #pauseBtn").forEach(btn => {
  btn.addEventListener("click", () => playSafe(clickSound));
});

// ---------- LOGIN ----------
// Login screen is ALWAYS shown first on page load.
// We no longer auto-skip to the menu just because a saved email exists.
const emailInput = document.getElementById("emailInput");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Guards against a click firing while a previous submit is still being
// processed (e.g. rapid double-click, or Enter + click in quick succession).
let isLoginProcessing = false;

// Re-enables the Continue button and resets the processing flag. Called
// whenever the login screen is (re)shown so the button can never end up
// permanently stuck/disabled.
function resetLoginButtonState() {
  isLoginProcessing = false;
  if (loginBtn) loginBtn.disabled = false;
}

function submitLogin() {
  // Null-checks: never let a missing element throw and kill the handler.
  if (!emailInput || !loginError || !loginBtn) return;

  // Prevent duplicate/overlapping submissions.
  if (isLoginProcessing) return;
  isLoginProcessing = true;
  loginBtn.disabled = true;

  try {
    const email = emailInput.value.trim();

    if (!isValidEmail(email)) {
      loginError.textContent = "Please enter a valid email address.";
      resetLoginButtonState();
      return;
    }

    loginError.textContent = "";

    // localStorage can throw (e.g. Safari private browsing, storage quota
    // exceeded, disabled storage). Previously this was unguarded, so an
    // exception here silently aborted before goToLoading() ran — the
    // Continue button appeared to "do nothing". We now degrade gracefully:
    // login still proceeds even if we can't persist the email.
    try {
      localStorage.setItem("playerEmail", email);
    } catch (storageErr) {
      console.error("Could not save player email to localStorage:", storageErr);
    }

    goToLoading();
    // Deliberately not resetting isLoginProcessing/disabled here: the
    // login screen is being navigated away from. It's reset automatically
    // by resetLoginButtonState() whenever the login screen is shown again.
  } catch (err) {
    // Catch-all so no unexpected error can leave the button permanently
    // unresponsive.
    console.error("Login error:", err);
    loginError.textContent = "Something went wrong. Please try again.";
    resetLoginButtonState();
  }
}

if (loginBtn && !loginBtn.dataset.listenerBound) {
  loginBtn.addEventListener("click", submitLogin);
  loginBtn.dataset.listenerBound = "true"; // prevents accidental duplicate binding
}
if (emailInput && !emailInput.dataset.listenerBound) {
  emailInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitLogin(); });
  emailInput.dataset.listenerBound = "true";
}

// prefill the box if a previous email is on file, but never auto-advance
window.addEventListener("DOMContentLoaded", () => {
  let savedEmail = null;
  try {
    savedEmail = localStorage.getItem("playerEmail");
  } catch (err) {
    console.error("Could not read playerEmail from localStorage:", err);
  }
  if (savedEmail && emailInput) emailInput.value = savedEmail;
  if (emailInput) emailInput.focus();
  resetLoginButtonState();
  initSettingsUI();
  updateControlVisibility();
});

// ---------- LOADING ----------
function goToLoading() {
  showScreen("screen-loading");
  const bar = document.getElementById("loadBar");
  if (bar) {
    bar.style.width = "0%";
    requestAnimationFrame(() => {
      bar.style.transition = "width 2.6s ease-in-out";
      bar.style.width = "100%";
    });
  }
  setTimeout(goToMenu, 3000);
}

// ---------- MENU ----------
function goToMenu() {
  let email = null;
  try {
    email = localStorage.getItem("playerEmail");
  } catch (err) {
    console.error("Could not read playerEmail from localStorage:", err);
  }
  if (!email) { resetLoginButtonState(); showScreen("screen-login"); return; }
  const welcomeText = document.getElementById("welcomeText");
  if (welcomeText) welcomeText.textContent = `Signed in as ${email}`;
  showScreen("screen-menu");
  if (musicOn && !muted) bgMusic.play().catch(() => {});
}
document.getElementById("exitBtn").addEventListener("click", () => {
  if (confirm("Exit SnakeVerse?")) window.close();
});
document.getElementById("switchAccountBtn").addEventListener("click", () => {
  try {
    localStorage.removeItem("playerEmail");
  } catch (err) {
    console.error("Could not remove playerEmail from localStorage:", err);
  }
  if (emailInput) emailInput.value = "";
  resetLoginButtonState();
  showScreen("screen-login");
  if (emailInput) emailInput.focus();
});

// ---------- LEVEL SELECT ----------
document.querySelectorAll("#screen-level [data-level]").forEach(btn => {
  btn.addEventListener("click", () => {
    localStorage.setItem("level", btn.dataset.level);
    localStorage.setItem("speed", btn.dataset.speed);
    startGameScreen();
  });
});

// ---------- LEADERBOARD ----------
function renderLeaderboard() {
  const board = JSON.parse(localStorage.getItem("leaderboard") || "[]");
  const rows = document.getElementById("leaderboardRows");
  rows.innerHTML = "";
  if (board.length === 0) {
    rows.innerHTML = `<tr><td colspan="4" style="opacity:0.6;">No scores yet — go play!</td></tr>`;
    return;
  }
  board.forEach((entry, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${entry.email}</td><td>${entry.score}</td><td>${entry.date}</td>`;
    rows.appendChild(tr);
  });
}
document.getElementById("leaderboardNavBtn").addEventListener("click", () => {
  renderLeaderboard();
  showScreen("screen-leaderboard");
});
document.getElementById("leaderboardFromGameOverBtn").addEventListener("click", () => {
  renderLeaderboard();
  showScreen("screen-leaderboard");
});

// ---------- SETTINGS ----------
const musicToggle = document.getElementById("musicToggle");
const soundToggle = document.getElementById("soundToggle");

function initSettingsUI() {
  updateToggleUI(musicToggle, musicOn);
  updateToggleUI(soundToggle, soundOn);
  updateControlMethodUI();
}
function updateToggleUI(btn, isOn) {
  btn.textContent = isOn ? "On" : "Off";
  btn.classList.toggle("on", isOn);
}
musicToggle.addEventListener("click", () => {
  musicOn = !musicOn;
  localStorage.setItem("musicOn", musicOn);
  updateToggleUI(musicToggle, musicOn);
  applyMuteToAll();
  if (!musicOn) { bgMusic.pause(); ambientForest.pause(); }
  else if (document.getElementById("screen-menu").classList.contains("active")) bgMusic.play().catch(() => {});
  else if (document.getElementById("screen-game").classList.contains("active")) ambientForest.play().catch(() => {});
});
soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("soundOn", soundOn);
  updateToggleUI(soundToggle, soundOn);
});
document.getElementById("resetScoresBtn").addEventListener("click", () => {
  if (confirm("Reset all high scores?")) {
    localStorage.removeItem("leaderboard");
    renderLeaderboard();
  }
});

// ---------- Control Method (Arrow Buttons / Joystick / Auto) ----------
const isTouchDevice = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
let controlMethod = localStorage.getItem("controlMethod") || "auto";

const controlOptionBtns = document.querySelectorAll(".control-option-btn");
function updateControlMethodUI() {
  controlOptionBtns.forEach(btn => {
    btn.classList.toggle("on", btn.dataset.control === controlMethod);
  });
}
controlOptionBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    controlMethod = btn.dataset.control;
    localStorage.setItem("controlMethod", controlMethod);
    updateControlMethodUI();
    updateControlVisibility();
  });
});

// Auto = keyboard on desktop, joystick on mobile (touch)
function getEffectiveControl() {
  if (controlMethod === "arrows") return "arrows";
  if (controlMethod === "joystick") return "joystick";
  return isTouchDevice ? "joystick" : "keyboard";
}

// Shows/hides the arrow buttons and joystick based on the selected Control
// Method and whether the game screen is currently active. Keyboard input
// itself is never disabled here — it keeps working exactly as before.
function updateControlVisibility() {
  const gameActive = document.getElementById("screen-game").classList.contains("active");
  const effective = getEffectiveControl();

  if (gameActive && effective === "arrows") {
    arrowControls.classList.remove("hidden");
  } else {
    arrowControls.classList.add("hidden");
  }

  if (gameActive && effective === "joystick") {
    joystick.classList.remove("joystick-disabled");
  } else {
    joystick.classList.add("joystick-disabled");
    joystick.classList.remove("show");
    joyActive = false;
    resetJoystickThumb();
  }
}

// =========================================================
// GAME
// =========================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const GRID = 20;
const CELLS = canvas.width / GRID;

let snake, dir, nextDir, food, rocks, score, loopId, paused, gameOver, scoreSaved;
let rabbitTimer = null;
let particles = [];
let shakeTimeout = null;

let prevSnake = [];
let lastTickTime = performance.now();
let activeSpeed = 220;
let currentHeadAngle = 0;
let mouthOpen = 0;
let tongueTimer = 180;
let tongueActive = 0;
let blinkTimer = 120;
let blinking = 0;

const PREY_TYPES = [
  { type: "ant",   points: 10, growth: 1, emoji: "🐜", weight: 40, move: "twitch" },
  { type: "frog",  points: 20, growth: 1, emoji: "🐸", weight: 25, move: "hop" },
  { type: "mouse", points: 30, growth: 1, emoji: "🐭", weight: 20, move: "dart" },
  { type: "rat",   points: 40, growth: 1, emoji: "🐀", weight: 12, move: "wander" }
];
const RABBIT = { type: "rabbit", points: 100, growth: 2, emoji: "🐇", weight: 3, move: "flee" };

function startGameScreen() {
  const email = localStorage.getItem("playerEmail") || "Guest";
  const level = localStorage.getItem("level") || "easy";
  document.getElementById("hudEmail").textContent = email;
  document.getElementById("hudLevel").textContent = level.toUpperCase();

  showScreen("screen-game");
  bgMusic.pause();
  ambientForest.currentTime = 0;
  if (musicOn && !muted) ambientForest.play().catch(() => {});

  resetState();
  startLoop();
}

function currentSpeed() {
  return parseInt(localStorage.getItem("speed")) || 220;
}

function resetState() {
  clearTimeout(rabbitTimer);
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  paused = false;
  gameOver = false;
  scoreSaved = false;
  particles = [];
  rocks = generateRocks(5);
  food = generateFood();

  prevSnake = snake.map(s => ({ x: s.x, y: s.y }));
  lastTickTime = performance.now();
  currentHeadAngle = angleForDir(dir);
  mouthOpen = 0;
  tongueActive = 0;
  tongueTimer = 180 + Math.random() * 120;
  blinking = 0;
  blinkTimer = 120 + Math.random() * 240;

  document.getElementById("hudScore").textContent = score;
  document.getElementById("gameOverModal").classList.add("hidden");
  document.getElementById("pauseBtn").textContent = "⏸";
}

function randCell() {
  return { x: Math.floor(Math.random() * CELLS), y: Math.floor(Math.random() * CELLS) };
}
function cellOccupied(cell, extra = []) {
  return (
    snake.some(s => s.x === cell.x && s.y === cell.y) ||
    (rocks && rocks.some(r => r.x === cell.x && r.y === cell.y)) ||
    extra.some(e => e.x === cell.x && e.y === cell.y)
  );
}
function generateRocks(count) {
  const list = [];
  let attempts = 0;
  while (list.length < count && attempts < 500) {
    const c = randCell();
    if (!cellOccupied(c, list)) list.push(c);
    attempts++;
  }
  return list;
}
function pickWeighted() {
  const pool = [...PREY_TYPES, RABBIT];
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) { if (r < p.weight) return p; r -= p.weight; }
  return pool[0];
}
function generateFood() {
  let c, attempts = 0;
  do { c = randCell(); attempts++; } while (cellOccupied(c) && attempts < 500);
  const meta = pickWeighted();
  clearTimeout(rabbitTimer);
  if (meta.type === "rabbit") {
    rabbitTimer = setTimeout(() => {
      if (food && food.type === "rabbit" && !gameOver) food = generateFood();
    }, 4000);
  }
  return { ...c, ...meta, moveCooldown: 0 };
}
function moveFood() {
  if (!food) return;
  food.moveCooldown = (food.moveCooldown || 0) - 1;
  if (food.moveCooldown > 0) return;

  const speedByType = { twitch: 4, hop: 3, dart: 1, wander: 5, flee: 1 };
  food.moveCooldown = speedByType[food.move] ?? 3;
  if (food.move === "hop" && Math.random() < 0.5) return;

  const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
  let candidates = dirs;

  if (food.move === "flee") {
    const head = snake[0];
    const curDist = Math.hypot(food.x - head.x, food.y - head.y);
    candidates = dirs.filter(d => Math.hypot((food.x+d.x)-head.x, (food.y+d.y)-head.y) >= curDist);
    if (candidates.length === 0) candidates = dirs;
  }

  const move = candidates[Math.floor(Math.random() * candidates.length)];
  const nx = food.x + move.x, ny = food.y + move.y;
  if (nx >= 0 && nx < CELLS && ny >= 0 && ny < CELLS && !cellOccupied({ x: nx, y: ny })) {
    food.x = nx; food.y = ny;
  }
}

function triggerShake() {
  const wrap = document.querySelector(".canvas-wrap");
  wrap.classList.remove("shake");
  void wrap.offsetWidth;
  wrap.classList.add("shake");
  clearTimeout(shakeTimeout);
  shakeTimeout = setTimeout(() => wrap.classList.remove("shake"), 250);
}
function spawnParticles(cellX, cellY, color) {
  const cx = cellX * GRID + GRID / 2, cy = cellY * GRID + GRID / 2;
  for (let i = 0; i < 10; i++) {
    particles.push({ x: cx, y: cy, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, life: 20, color });
  }
}
function updateParticles() {
  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
  particles = particles.filter(p => p.life > 0);
}
function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(p.life / 20, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ---------- Snake animation state ----------
function angleForDir(d) {
  if (d.x === 1) return 0;
  if (d.x === -1) return Math.PI;
  if (d.y === 1) return Math.PI / 2;
  if (d.y === -1) return -Math.PI / 2;
  return 0;
}
function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
}
function updateSnakeAnim() {
  if (mouthOpen > 0) mouthOpen = Math.max(0, mouthOpen - 0.06);

  tongueTimer--;
  if (tongueTimer <= 0 && tongueActive <= 0) {
    tongueActive = 14;
    tongueTimer = 180 + Math.random() * 120;
  }
  if (tongueActive > 0) tongueActive--;

  blinkTimer--;
  if (blinkTimer <= 0) {
    blinking = 8;
    blinkTimer = 120 + Math.random() * 240;
  }
  if (blinking > 0) blinking--;
}

// ---------- Spline body ----------
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const x = 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
  const y = 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
  return { x, y };
}
function buildSmoothPath(pts) {
  if (pts.length < 2) return pts;
  const padded = [pts[0], ...pts, pts[pts.length - 1]];
  const smooth = [];
  const STEPS = 6;
  for (let i = 0; i < padded.length - 3; i++) {
    for (let s = 0; s < STEPS; s++) {
      smooth.push(catmullRom(padded[i], padded[i+1], padded[i+2], padded[i+3], s / STEPS));
    }
  }
  smooth.push(pts[pts.length - 1]);
  return smooth;
}

// ---------- Rendering: interpolated grid → pixel snake ----------
function getRenderSnakePts(t) {
  return snake.map((s, i) => {
    const curPx = { x: s.x * GRID + GRID / 2, y: s.y * GRID + GRID / 2 };
    const prevGrid = prevSnake[i] || prevSnake[prevSnake.length - 1] || s;
    const prevPx = { x: prevGrid.x * GRID + GRID / 2, y: prevGrid.y * GRID + GRID / 2 };
    return { x: prevPx.x + (curPx.x - prevPx.x) * t, y: prevPx.y + (curPx.y - prevPx.y) * t };
  });
}

function drawHead(pos, angle) {
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);

  const headLen = GRID * 0.9;
  const headWide = GRID * 0.95;
  const stretch = 1 + mouthOpen * 0.15;

  const grad = ctx.createRadialGradient(-headLen*0.2,0,2, 0,0, headLen*0.7);
  grad.addColorStop(0, "#4dffa0");
  grad.addColorStop(1, "#1fae5c");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, (headLen/2) * stretch, headWide/2, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = "rgba(230,255,210,0.4)";
  ctx.beginPath();
  ctx.ellipse(headLen*0.05, headWide*0.18, headLen*0.28, headWide*0.18, 0, 0, Math.PI*2);
  ctx.fill();

  if (mouthOpen > 0.05) {
    ctx.fillStyle = "#7a1f1f";
    ctx.beginPath();
    ctx.moveTo(headLen*0.35, 0);
    ctx.quadraticCurveTo(headLen*0.55, headWide*0.25*mouthOpen, headLen*0.75, 0);
    ctx.quadraticCurveTo(headLen*0.55, -headWide*0.05, headLen*0.35, 0);
    ctx.fill();
  }

  ctx.fillStyle = "#0a2e18";
  ctx.beginPath(); ctx.arc(headLen*0.42, -headWide*0.12, 1.3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(headLen*0.42, headWide*0.12, 1.3, 0, Math.PI*2); ctx.fill();

  const eyeScaleY = blinking > 0 ? 0.15 : 1;
  [-1, 1].forEach(side => {
    ctx.save();
    ctx.translate(headLen*0.12, side * headWide*0.28);
    ctx.scale(1, eyeScaleY);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(0,0, headWide*0.14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#0a2e18";
    ctx.beginPath(); ctx.arc(headWide*0.03,0, headWide*0.08, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });

  if (tongueActive > 0) {
    ctx.strokeStyle = "#ff4d5e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(headLen*0.5, 0);
    ctx.lineTo(headLen*0.85, 0);
    ctx.lineTo(headLen*0.95, -3);
    ctx.moveTo(headLen*0.85, 0);
    ctx.lineTo(headLen*0.95, 3);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSnake(renderPts) {
  const pts = buildSmoothPath(renderPts);
  if (pts.length < 2) return;
  const total = pts.length;

  for (let i = 0; i < total - 1; i++) {
    const t = i / total;
    const width = Math.max(3, (GRID * 0.85) * (1 - t * 0.7));
    const a = pts[i], b = pts[i+1];

    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, "#1fae5c");
    grad.addColorStop(1, "#39ff88");
    ctx.strokeStyle = grad;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.strokeStyle = "rgba(230,255,210,0.35)";
    ctx.lineWidth = Math.max(1, width * 0.28);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  drawHead(renderPts[0], currentHeadAngle);
}

function drawFood() {
  if (!food) return;
  const bobAmp = food.type === "rabbit" ? 3 : 1.5;
  const bob = Math.sin(performance.now()/200 + food.x*3 + food.y*3) * bobAmp;
  const x = food.x * GRID + GRID / 2;
  const y = food.y * GRID + GRID / 2 + bob;
  ctx.save();
  ctx.font = `${GRID - 2}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = food.type === "rabbit" ? "rgba(255,217,61,0.7)" : "rgba(255,255,255,0.4)";
  ctx.shadowBlur = food.type === "rabbit" ? 12 : 6;
  ctx.fillText(food.emoji, x, y);
  ctx.restore();
}

function drawRocks() {
  rocks.forEach(r => {
    const x = r.x * GRID, y = r.y * GRID;
    ctx.save();
    ctx.translate(x, y);

    const grad = ctx.createLinearGradient(0, 0, GRID, GRID);
    grad.addColorStop(0, "#8a4a3a");
    grad.addColorStop(1, "#5e2f24");
    ctx.fillStyle = grad;
    ctx.fillRect(1, 1, GRID - 2, GRID - 2);

    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    const rowH = (GRID - 2) / 2;
    ctx.beginPath(); ctx.moveTo(1, 1+rowH); ctx.lineTo(GRID-1, 1+rowH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(GRID/2, 1); ctx.lineTo(GRID/2, 1+rowH); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(GRID/4, 1+rowH); ctx.lineTo(GRID/4, GRID-1);
    ctx.moveTo((GRID/4)*3, 1+rowH); ctx.lineTo((GRID/4)*3, GRID-1);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.strokeRect(1.5, 1.5, GRID-3, GRID-3);
    ctx.restore();
  });
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  for (let i = 0; i <= CELLS; i++) {
    ctx.beginPath(); ctx.moveTo(i*GRID, 0); ctx.lineTo(i*GRID, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*GRID); ctx.lineTo(canvas.width, i*GRID); ctx.stroke();
  }
}

function render(renderPts) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawRocks();
  drawFood();
  drawSnake(renderPts);
  drawParticles();
}

// ---------- Game logic (tick-based, unchanged mechanics) ----------
function update() {
  if (paused || gameOver) return;

  prevSnake = snake.map(s => ({ x: s.x, y: s.y }));
  lastTickTime = performance.now();

  moveFood();
  updateParticles();
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS) return endGame();
  if (snake.some(s => s.x === head.x && s.y === head.y)) return endGame();
  if (rocks.some(r => r.x === head.x && r.y === head.y)) return endGame();

  snake.unshift(head);

  if (food && head.x === food.x && head.y === food.y) {
    score += food.points;
    document.getElementById("hudScore").textContent = score;
    playSafe(eatSounds[food.type]);
    spawnParticles(food.x, food.y, food.type === "rabbit" ? "#ffd93d" : "#7fff9a");
    mouthOpen = 1;

    for (let g = 1; g < (food.growth || 1); g++) snake.push({ ...snake[snake.length - 1] });
    if (food.type === "rabbit") triggerShake();

    clearTimeout(rabbitTimer);
    food = generateFood();
  } else {
    snake.pop();
  }
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  clearInterval(loopId);
  clearTimeout(rabbitTimer);
  playSafe(gameoverSound);
  ambientForest.pause();

  document.getElementById("finalScore").textContent = score;
  document.getElementById("finalEmail").textContent = localStorage.getItem("playerEmail") || "Guest";
  document.getElementById("gameOverModal").classList.remove("hidden");
  saveScore();
}

function saveScore() {
  if (scoreSaved) return;
  scoreSaved = true;
  const email = localStorage.getItem("playerEmail") || "Guest";
  const board = JSON.parse(localStorage.getItem("leaderboard") || "[]");
  const isNewHigh = board.length === 0 || score > board[0].score;
  board.push({ email, score, date: new Date().toLocaleDateString() });
  board.sort((a, b) => b.score - a.score);
  localStorage.setItem("leaderboard", JSON.stringify(board.slice(0, 10)));
  if (isNewHigh) playSafe(highscoreSound);
}

function startLoop() {
  clearInterval(loopId);
  activeSpeed = currentSpeed();
  lastTickTime = performance.now();
  loopId = setInterval(update, activeSpeed);
}

function restartGame() {
  resetState();
  ambientForest.currentTime = 0;
  if (musicOn && !muted) ambientForest.play().catch(() => {});
  startLoop();
}

// ---------- Game control buttons ----------
document.getElementById("pauseBtn").addEventListener("click", () => {
  if (gameOver) return;
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "▶" : "⏸";
});
document.getElementById("restartBtn").addEventListener("click", restartGame);
document.getElementById("playAgainBtn").addEventListener("click", restartGame);
document.getElementById("muteBtn").addEventListener("click", () => {
  muted = !muted;
  localStorage.setItem("muted", muted);
  applyMuteToAll();
  document.getElementById("muteBtn").textContent = muted ? "🔇" : "🔊";
});

// ---------- 60fps render loop (interpolates between grid ticks) ----------
function gameRenderLoop(now) {
  requestAnimationFrame(gameRenderLoop);
  if (!document.getElementById("screen-game").classList.contains("active")) return;

  updateSnakeAnim();
  currentHeadAngle = lerpAngle(currentHeadAngle, angleForDir(dir), 0.25);

  const t = (paused || gameOver) ? 1 : Math.min(1, (now - lastTickTime) / activeSpeed);
  render(getRenderSnakePts(t));
}
requestAnimationFrame(gameRenderLoop);

// ---------- Keyboard input ----------
window.addEventListener("keydown", (e) => {
  if (!document.getElementById("screen-game").classList.contains("active")) return;
  const key = e.key.toLowerCase();
  let changed = null;

  if ((key === "arrowup" || key === "w") && dir.y === 0) changed = { x: 0, y: -1 };
  else if ((key === "arrowdown" || key === "s") && dir.y === 0) changed = { x: 0, y: 1 };
  else if ((key === "arrowleft" || key === "a") && dir.x === 0) changed = { x: -1, y: 0 };
  else if ((key === "arrowright" || key === "d") && dir.x === 0) changed = { x: 1, y: 0 };

  if (changed) {
    nextDir = changed;
    playSafe(clickSound);
  }
});

// ---------- Joystick input ----------
const joystick = document.getElementById("joystick");
const joystickThumb = document.getElementById("joystickThumb");
const JOY_RADIUS = 40;
let joyActive = false;

function setDirFromAngle(angle) {
  const deg = angle * 180 / Math.PI;
  let newDir;

  if (deg >= -45 && deg < 45) newDir = { x: 1, y: 0 };
  else if (deg >= 45 && deg < 135) newDir = { x: 0, y: 1 };
  else if (deg >= -135 && deg < -45) newDir = { x: 0, y: -1 };
  else newDir = { x: -1, y: 0 };

  // Prevent reversing directly into the snake's own body
  if (newDir.x === -dir.x && newDir.y === -dir.y) return;

  nextDir = newDir;
  playSafe(clickSound);
}

function updateJoystickThumb(dx, dy) {
  const dist = Math.min(Math.hypot(dx, dy), JOY_RADIUS);
  const angle = Math.atan2(dy, dx);
  const tx = Math.cos(angle) * dist;
  const ty = Math.sin(angle) * dist;
  joystickThumb.style.transform = `translate(${tx}px, ${ty}px)`;
}
function resetJoystickThumb() {
  joystickThumb.style.transform = `translate(0px, 0px)`;
}

function handleJoyStart(clientX, clientY) {
  if (getEffectiveControl() !== "joystick") return;
  joyActive = true;
  joystick._startX = clientX;
  joystick._startY = clientY;
}
function handleJoyMove(clientX, clientY) {
  if (!joyActive) return;
  const dx = clientX - joystick._startX;
  const dy = clientY - joystick._startY;
  updateJoystickThumb(dx, dy);

  const dist = Math.hypot(dx, dy);
  if (dist > 12) {
    setDirFromAngle(Math.atan2(dy, dx));
  }
}
function handleJoyEnd() {
  joyActive = false;
  resetJoystickThumb();
}

// Touch events
joystick.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  handleJoyStart(t.clientX, t.clientY);
}, { passive: true });
joystick.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  handleJoyMove(t.clientX, t.clientY);
}, { passive: true });
joystick.addEventListener("touchend", handleJoyEnd);
joystick.addEventListener("touchcancel", handleJoyEnd);

// Mouse events (desktop testing)
joystick.addEventListener("mousedown", (e) => {
  handleJoyStart(e.clientX, e.clientY);
});
window.addEventListener("mousemove", (e) => {
  if (joyActive) handleJoyMove(e.clientX, e.clientY);
});
window.addEventListener("mouseup", () => {
  if (joyActive) handleJoyEnd();
});

// ---------- Arrow Buttons input (Control Method: Arrow Buttons) ----------
const arrowControls = document.getElementById("arrowControls");
const arrowUpBtn = document.getElementById("arrowUp");
const arrowDownBtn = document.getElementById("arrowDown");
const arrowLeftBtn = document.getElementById("arrowLeft");
const arrowRightBtn = document.getElementById("arrowRight");

function pressArrow(newDir, axisIsFree) {
  if (getEffectiveControl() !== "arrows") return;
  if (!axisIsFree()) return;
  nextDir = newDir;
  playSafe(clickSound);
}
arrowUpBtn.addEventListener("pointerdown", () => pressArrow({ x: 0, y: -1 }, () => dir.y === 0));
arrowDownBtn.addEventListener("pointerdown", () => pressArrow({ x: 0, y: 1 }, () => dir.y === 0));
arrowLeftBtn.addEventListener("pointerdown", () => pressArrow({ x: -1, y: 0 }, () => dir.x === 0));
arrowRightBtn.addEventListener("pointerdown", () => pressArrow({ x: 1, y: 0 }, () => dir.x === 0));

// =========================================================
// NEW FEATURE — Dynamic touch-only virtual joystick
// =========================================================
// Only runs on touch-capable devices. On desktop/mouse-only devices this
// block does nothing, so the original fixed-position joystick behavior
// above (used for desktop mouse testing) and all other game logic stays
// exactly as it was.
//
// Reuses the existing handleJoyMove / setDirFromAngle / resetJoystickThumb
// functions above, so direction handling, the dead zone (dist > 12), and
// reverse-direction prevention are unchanged — only *where* and *when*
// the joystick appears is new.
if (isTouchDevice) {
  const canvasWrap = document.querySelector(".canvas-wrap");
  joystick.classList.add("dynamic-joy"); // hidden by default (see style.css)

  let dynTouchId = null;

  function showDynJoystickAt(clientX, clientY) {
    const rect = canvasWrap.getBoundingClientRect();
    const size = joystick.offsetWidth || 110;
    let left = clientX - rect.left - size / 2;
    let top = clientY - rect.top - size / 2;

    // Keep the joystick fully within the visible canvas area
    left = Math.max(0, Math.min(left, rect.width - size));
    top = Math.max(0, Math.min(top, rect.height - size));

    joystick.style.left = `${left}px`;
    joystick.style.top = `${top}px`;
    joystick.classList.add("show");

    // Reuse the existing start handler so drag math matches the original
    handleJoyStart(clientX, clientY);
  }

  function hideDynJoystick() {
    joystick.classList.remove("show");
    handleJoyEnd(); // reuses existing reset logic
  }

  canvasWrap.addEventListener("touchstart", (e) => {
    if (!document.getElementById("screen-game").classList.contains("active")) return;
    if (getEffectiveControl() !== "joystick") return;
    if (dynTouchId !== null) return; // already tracking one touch
    const t = e.changedTouches[0];
    dynTouchId = t.identifier;
    showDynJoystickAt(t.clientX, t.clientY);
  }, { passive: true });

  canvasWrap.addEventListener("touchmove", (e) => {
    if (dynTouchId === null) return;
    let t = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === dynTouchId) { t = e.changedTouches[i]; break; }
    }
    if (!t) return;
    handleJoyMove(t.clientX, t.clientY);
  }, { passive: true });

  function endDynTouch(e) {
    if (dynTouchId === null) return;
    let ended = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === dynTouchId) { ended = true; break; }
    }
    if (!ended) return;
    dynTouchId = null;
    hideDynJoystick();
  }
  canvasWrap.addEventListener("touchend", endDynTouch, { passive: true });
  canvasWrap.addEventListener("touchcancel", endDynTouch, { passive: true });
}
