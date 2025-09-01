// Test Drive - Classic Vector Car Game Logic (Night Mode with Headlights)
// Works with cars.js (window.CAR_MODELS.player, window.CAR_MODELS.obstacles)

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const DPR = window.devicePixelRatio || 1;

function fitCanvas() {
  let w = Math.min(window.innerWidth * 0.95, 400);
  let h = Math.max(w * 1.5, 600);
  if (window.innerWidth < 440) {
    w = window.innerWidth;
    h = Math.max(window.innerHeight * 0.93, 480);
  }
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

// --- GAME STATE ---
const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3 };
let gameState = STATE.MENU;

// --- WORLD ---
const LANE_COUNT = 3;
const ROAD_MARGIN = 34;
const ROAD_EDGE = 8;

function roadLeft() { return ROAD_MARGIN + ROAD_EDGE; }
function roadRight() { return (canvas.width / DPR) - ROAD_MARGIN - ROAD_EDGE; }
function roadWidth() { return roadRight() - roadLeft(); }
function laneWidth() { return roadWidth() / LANE_COUNT; }

// --- MAIN CAR & OBSTACLES ---
let player, obstacles, coins, powerups, score, coinCount, fuel;
let baseSpeed, spawnObsTimer, spawnCoinTimer, spawnPowTimer;
let magnetTimer = 0, boostTimer = 0;
let keys = {}, touchMove = 0, holdingLeft = false, holdingRight = false;
let last = performance.now();
let scroll = 0;
const nightMode = true; // Only night mode

// --- UI Elements ---
const scoreSpan = document.getElementById('score');
const coinsSpan = document.getElementById('coins');
const fuelBar = document.getElementById('fuel-bar-inner');
const menuOverlay = document.getElementById('menuOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const playBtn = document.getElementById('playBtn');
const restartBtn = document.getElementById('restartBtn');
const resumeBtn = document.getElementById('resumeBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const pauseBtn = document.getElementById('pauseBtn');
const finalScore = document.getElementById('finalScore');

// --- Utility ---
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(a, b) { return Math.random() * (b - a) + a; }
function chance(p) { return Math.random() < p; }

// --- Init/Reset ---
function resetGame() {
  const laneW = laneWidth();
  player = {
    w: 44, h: 74,
    lane: 1,
    x: roadLeft() + laneW * 1 + (laneW - 44) / 2,
    y: (canvas.height / DPR) - 98,
    speed: 295,
    vx: 0,
    trail: [],
    carModel: window.CAR_MODELS.player, // HD vector car from cars.js
    invincible: 0
  };
  obstacles = [];
  coins = [];
  powerups = [];
  score = 0;
  coinCount = 0;
  fuel = 100;
  baseSpeed = 138;
  spawnObsTimer = 0;
  spawnCoinTimer = 0;
  spawnPowTimer = 0;
  magnetTimer = 0;
  boostTimer = 0;
  scroll = 0;
}

// --- Spawning ---
function spawnObstacle() {
  const laneW = laneWidth();
  let laneIndex = Math.floor(rand(0, LANE_COUNT));
  // Avoid stacking
  if (obstacles.length && Math.abs(obstacles[obstacles.length-1].lane-laneIndex)<1)
    laneIndex = (laneIndex+1)%LANE_COUNT;
  // Pick car from cars.js obstacles array
  const carDefs = window.CAR_MODELS.obstacles;
  const carDef = carDefs[Math.floor(rand(0, carDefs.length))];
  let w = carDef.w, h = carDef.h;
  let x = roadLeft() + laneIndex * laneW + (laneW - w) / 2;
  let y = -h - 12;
  let vy = baseSpeed + rand(18, 50);
  let drift = chance(0.19) ? (chance(0.5) ? 1 : -1) * rand(10, 28) : 0;
  obstacles.push({x, y, w, h, vy, vx: drift, lane: laneIndex, carDef, driftDir: Math.sign(drift)});
}
function spawnCoinLine() {
  const laneW = laneWidth();
  const laneIndex = Math.floor(rand(0, LANE_COUNT));
  const startX = roadLeft() + laneIndex * laneW + laneW / 2;
  const gap = 28;
  for (let i = 0; i < 6; i++) {
    const y = -i * gap - 16;
    const r = 10;
    const vy = baseSpeed * 0.8 + rand(8, 30);
    coins.push({x: startX, y, r, vy, vx: 0});
  }
}
function spawnPowerup() {
  const rw = roadWidth();
  const x = roadLeft() + rand(24, rw - 24);
  const y = -28;
  const kind = ['magnet', 'boost'][Math.floor(rand(0, 2))];
  const vy = baseSpeed * 0.90 + rand(8, 30);
  powerups.push({x, y, w: 28, h: 28, vy, kind});
}

// --- Game Update ---
function update(dt) {
  // Player movement
  player.vx = 0;
  if (keys['ArrowLeft'] || holdingLeft) player.vx -= player.speed;
  if (keys['ArrowRight'] || holdingRight) player.vx += player.speed;
  player.x += player.vx * dt;
  player.x = clamp(player.x, roadLeft(), roadRight() - player.w);

  // Lane snap
  let lane = Math.round((player.x - roadLeft()) / laneWidth());
  lane = clamp(lane, 0, LANE_COUNT-1);
  player.lane = lane;

  // Road scroll
  scroll += baseSpeed * 0.57 * dt;
  if (scroll > 60) scroll -= 60;

  // Obstacles
  for (const o of obstacles) {
    o.y += o.vy * dt;
    o.x += o.vx * dt;
    // Clamp drift to lane bounds
    let laneL = roadLeft() + o.lane * laneWidth();
    o.x = clamp(o.x, laneL, laneL + laneWidth() - o.w);
  }
  obstacles = obstacles.filter(o => o.y < (canvas.height / DPR) + 130);

  // Coins
  for (const c of coins) {
    c.y += (c.vy) * dt;
    if (magnetTimer > 0) {
      const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
      const dx = pcx - c.x, dy = pcy - c.y;
      const dist = Math.hypot(dx, dy) || 1;
      const pull = clamp(260 / dist, 0.5, 5.7);
      c.vx = dx * pull;
      c.x += c.vx * dt;
      c.y += dy * pull * dt;
    }
  }
  coins = coins.filter(c => c.y < (canvas.height / DPR) + 50);

  // Powerups
  for (const p of powerups) p.y += (p.vy) * dt;
  powerups = powerups.filter(p => p.y < (canvas.height / DPR) + 60);

  // Collisions
  handleCollisions();

  // Timers
  if (magnetTimer > 0) magnetTimer -= dt;
  if (boostTimer > 0) boostTimer -= dt;
  score += dt * 60;
  baseSpeed += dt * 2.2;

  // Fuel
  fuel -= dt * (boostTimer > 0 ? 2.3 : 1.7);
  if (fuel <= 0) {
    fuel = 0;
    endGame();
  }

  // Spawning
  spawnObsTimer += dt;
  spawnCoinTimer += dt;
  spawnPowTimer += dt;
  if (spawnObsTimer > 1.0) { spawnObsTimer = 0; spawnObstacle(); }
  if (spawnCoinTimer > 1.4) { spawnCoinTimer = 0; if (chance(0.7)) spawnCoinLine(); }
  if (spawnPowTimer > 5.0) { spawnPowTimer = 0; if (chance(0.82)) spawnPowerup(); }

  // Player trail (for boost effect)
  player.trail.push({x: player.x, y: player.y, w: player.w, h: player.h, t: 0.33});
  if (player.trail.length > 11) player.trail.shift();
  for (const t of player.trail) t.t -= dt;
}

function handleCollisions() {
  let hit = false;
  for (const o of obstacles) {
    if (o.x < player.x + player.w && o.x + o.w > player.x &&
      o.y < player.y + player.h && o.y + o.h > player.y) {
      hit = true; break;
    }
  }
  if (hit && (!player.invincible || player.invincible <= 0)) {
    endGame();
  }
  if (player.invincible) {
    player.invincible -= 1/60;
    if (player.invincible < 0) player.invincible = 0;
  }
  // Collect coins
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    const nx = clamp(c.x, player.x, player.x + player.w);
    const ny = clamp(c.y, player.y, player.y + player.h);
    const dx = c.x - nx, dy = c.y - ny;
    if (dx * dx + dy * dy < c.r * c.r) {
      coins.splice(i, 1);
      coinCount += 1;
      score += 6;
      fuel = clamp(fuel + 2.6, 0, 100);
    }
  }
  // Collect powerups
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    if (p.x < player.x + player.w && p.x + p.w > player.x &&
      p.y < player.y + player.h && p.y + p.h > player.y) {
      powerups.splice(i, 1);
      if (p.kind === 'magnet') magnetTimer = 7.0;
      if (p.kind === 'boost') boostTimer = 4.2;
    }
  }
}

// --- Drawing ---
function draw() {
  drawRoad();
  for (const o of obstacles) drawObstacleCar(o);
  for (const c of coins) drawCoin(c);
  for (const p of powerups) drawPowerup(p);
  drawPlayer();
  // Fuel blink if low
  if (fuel < 24 && Math.floor(performance.now() / 250) % 2 === 0)
    ctx.fillStyle = "rgba(255,60,60,0.14)", ctx.fillRect(0,0,canvas.width/DPR,canvas.height/DPR);
}

function drawRoad() {
  // Gradient road for night
  const w = canvas.width / DPR, h = canvas.height / DPR;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#23242c");
  grad.addColorStop(1, "#18181c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // road edges
  ctx.fillStyle = "#222b";
  ctx.fillRect(ROAD_MARGIN, 0, ROAD_EDGE, h);
  ctx.fillRect(w - ROAD_MARGIN - ROAD_EDGE, 0, ROAD_EDGE, h);

  // lanes
  ctx.save();
  ctx.strokeStyle = "#fff9";
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 5;
  let dash = 36, gap = 32;
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = roadLeft() + i * laneWidth();
    ctx.setLineDash([dash, gap]);
    ctx.beginPath();
    ctx.moveTo(x, (scroll % (dash+gap)) - (dash+gap));
    ctx.lineTo(x, h + (dash+gap));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // Night: vignette for atmosphere
  let vgrad = ctx.createRadialGradient(w/2, h*0.8, w*0.33, w/2, h*0.8, w*0.86);
  vgrad.addColorStop(0, "rgba(0,0,0,0)");
  vgrad.addColorStop(1, "rgba(0,0,0,0.44)");
  ctx.fillStyle = vgrad; ctx.fillRect(0,0,w,h);
}

function drawObstacleCar(o) {
  // Draw HD vector car/bike from cars.js
  o.carDef.draw(ctx, o.x, o.y, o.w, o.h, {headlights: nightMode});
  // Turn indicator (if drifting)
  if (o.driftDir && Math.abs(o.vx) > 0.5) {
    let blink = Math.floor(performance.now()/220)%2===0;
    if (blink) {
      ctx.fillStyle = "#ffbb33";
      let s = 13;
      if (o.driftDir > 0) {
        ctx.beginPath();
        ctx.moveTo(o.x+o.w, o.y+o.h/2-s); ctx.lineTo(o.x+o.w+s, o.y+o.h/2); ctx.lineTo(o.x+o.w, o.y+o.h/2+s);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(o.x, o.y+o.h/2-s); ctx.lineTo(o.x-s, o.y+o.h/2); ctx.lineTo(o.x, o.y+o.h/2+s);
        ctx.closePath(); ctx.fill();
      }
    }
  }
}

function drawPlayer() {
  // Boost trail
  if (boostTimer > 0) {
    for (const t of player.trail) {
      if (t.t <= 0) continue;
      const a = Math.max(0, Math.min(0.21, t.t * 0.38));
      ctx.fillStyle = `rgba(102,224,255,${a})`;
      drawRoundRect(t.x, t.y + 9, t.w, t.h - 18, 14);
    }
  }
  // Draw player car using HD vector art from cars.js
  player.carModel.draw(ctx, player.x, player.y, player.w, player.h, {headlights: nightMode});
  // Magnet aura
  if (magnetTimer > 0) {
    let alpha = 0.19 + 0.13 * Math.sin(performance.now() / 160);
    ctx.save();
    ctx.strokeStyle = `rgba(255,107,107,${alpha})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(player.x + player.w / 2, player.y + player.h / 2, 62, 68, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawCoin(c) {
  ctx.save();
  ctx.shadowColor = "#ffd24d";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ffd24d";
  ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff7";
  ctx.beginPath(); ctx.arc(c.x-3, c.y-3, c.r*0.55, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawPowerup(p) {
  ctx.save();
  ctx.fillStyle = "#190a";
  drawRoundRect(p.x, p.y, p.w, p.h, 7);
  if (p.kind === 'magnet') {
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(p.x+7, p.y+7, 7, p.h-14);
    ctx.fillRect(p.x+p.w-14, p.y+7, 7, p.h-14);
    ctx.fillRect(p.x+6, p.y+7, p.w-12, 7);
  } else if (p.kind === 'boost') {
    ctx.fillStyle = "#66e0ff";
    ctx.beginPath();
    ctx.moveTo(p.x+p.w/2-5, p.y+6);
    ctx.lineTo(p.x+p.w/2+3, p.y+6);
    ctx.lineTo(p.x+p.w/2-3, p.y+p.h-6);
    ctx.lineTo(p.x+p.w/2+5, p.y+p.h-6);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawRoundRect(x, y, w, h, r, fill=true, stroke=false) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if (fill !== false) ctx.fill();
  if (stroke) ctx.stroke();
}

// --- UI Update ---
function updateHUD() {
  scoreSpan.textContent = Math.floor(score);
  coinsSpan.textContent = coinCount;
  fuelBar.style.width = clamp(fuel, 0, 100) * 0.6 + "px";
  fuelBar.style.background = fuel > 30 ? "#2be782" : "#ff4b4b";
}

// --- Game Loop ---
function loop(now) {
  const dt = clamp((now - last) / 1000, 0, 0.035);
  last = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === STATE.PLAYING) {
    update(dt);
    draw();
    updateHUD();
  } else if (gameState === STATE.PAUSED) {
    draw();
    updateHUD();
  } else if (gameState === STATE.GAMEOVER) {
    draw();
    updateHUD();
  } else if (gameState === STATE.MENU) {
    draw();
    updateHUD();
  }
  requestAnimationFrame(loop);
}

// --- State Handlers ---
function startGame() {
  resetGame();
  gameState = STATE.PLAYING;
  menuOverlay.style.display = "none";
  gameOverOverlay.style.display = "none";
  pauseOverlay.style.display = "none";
}
function endGame() {
  gameState = STATE.GAMEOVER;
  finalScore.textContent = `Score: ${Math.floor(score)} | Coins: ${coinCount}`;
  gameOverOverlay.style.display = "";
  pauseOverlay.style.display = "none";
}
function togglePause() {
  if (gameState === STATE.PLAYING) {
    gameState = STATE.PAUSED;
    pauseOverlay.style.display = "";
  } else if (gameState === STATE.PAUSED) {
    gameState = STATE.PLAYING;
    pauseOverlay.style.display = "none";
  }
}

// --- Controls (prevent scroll/shake) ---
document.addEventListener('keydown', function(e){
  if(['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if (e.key === " " || e.key === "Spacebar") {
    if (gameState === STATE.MENU || gameState === STATE.GAMEOVER) startGame();
    else if (gameState === STATE.PLAYING || gameState === STATE.PAUSED) togglePause();
  }
  if (gameState !== STATE.PLAYING) return;
  if (e.key === "ArrowLeft" || e.key === "a") keys['ArrowLeft'] = true;
  if (e.key === "ArrowRight" || e.key === "d") keys['ArrowRight'] = true;
});
document.addEventListener('keyup', function(e){
  if(['ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  if (e.key === "ArrowLeft" || e.key === "a") keys['ArrowLeft'] = false;
  if (e.key === "ArrowRight" || e.key === "d") keys['ArrowRight'] = false;
});

// Touch controls: hold left/right/middle to steer
canvas.addEventListener('touchstart', function(e){
  if (e.touches.length === 1) {
    let x = e.touches[0].clientX;
    let w = canvas.getBoundingClientRect().width;
    if (x < w/3) { holdingLeft = true; }
    else if (x > w*2/3) { holdingRight = true; }
  }
});
canvas.addEventListener('touchend', function(e){
  holdingLeft = false; holdingRight = false;
});
canvas.addEventListener('touchmove', function(e){
  if (e.touches.length === 1) {
    let x = e.touches[0].clientX;
    let w = canvas.getBoundingClientRect().width;
    holdingLeft = x < w/3;
    holdingRight = x > w*2/3;
  }
});

// UI buttons
leftBtn.addEventListener('touchstart', e => { e.preventDefault(); holdingLeft=true; leftBtn.classList.add('hold'); });
leftBtn.addEventListener('touchend', e => { e.preventDefault(); holdingLeft=false; leftBtn.classList.remove('hold'); });
rightBtn.addEventListener('touchstart', e => { e.preventDefault(); holdingRight=true; rightBtn.classList.add('hold'); });
rightBtn.addEventListener('touchend', e => { e.preventDefault(); holdingRight=false; rightBtn.classList.remove('hold'); });
pauseBtn.addEventListener('click', togglePause);

playBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', togglePause);

// Mobile controls show/hide
function updateMobileControls() {
  const mobile = window.innerWidth < 420;
  document.querySelector('.mobile-controls').style.display = mobile ? 'flex' : 'none';
}
updateMobileControls();
window.addEventListener('resize', updateMobileControls);

// --- Start Game ---
resetGame();
gameState = STATE.MENU;
menuOverlay.style.display = "";
gameOverOverlay.style.display = "none";
pauseOverlay.style.display = "none";
requestAnimationFrame(loop);
