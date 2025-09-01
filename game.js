// =========== Game State & Constants ===========
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const DPR = window.devicePixelRatio || 1;

function fitCanvas() {
  let w = 400, h = 600;
  if (window.innerWidth < 412) {
    w = window.innerWidth;
    h = Math.max(480, window.innerHeight - 110);
  }
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

const LANE_COUNT = 3;
const ROAD_MARGIN = 34;
const ROAD_EDGE = 8;
const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3 };
let gameState = STATE.MENU;

// Game world
let player, obstacles, coins, powerups, score, coinCount, fuel;
let baseSpeed, spawnObsTimer, spawnCoinTimer, spawnPowTimer;
let magnetTimer = 0, boostTimer = 0;
let hasLifeSaver = false, lifeSaverCount = 0, lifeSaverBlink = 0;
let keys = {}, touchMove = 0, swipeStart = null, last = performance.now();
let scroll = 0;

// =========== UI Elements ===========
const scoreSpan = document.getElementById('score');
const coinsSpan = document.getElementById('coins');
const fuelBar = document.getElementById('fuel-bar-inner');
const lifeSaverHud = document.getElementById('lifeSaverHud');
const lifeSaverCountSpan = document.getElementById('lifeSaverCount');
const magnetPower = document.getElementById('magnetPower');
const boostPower = document.getElementById('boostPower');
const magnetTimerSpan = document.getElementById('magnetTimer');
const boostTimerSpan = document.getElementById('boostTimer');

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

// =========== Utility ===========
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(a, b) { return Math.random() * (b - a) + a; }
function chance(p) { return Math.random() < p; }
function lerp(a, b, t) { return a + (b - a) * t; }
function roadLeft() {
  return ROAD_MARGIN + ROAD_EDGE;
}
function roadRight() {
  return (canvas.width / DPR) - ROAD_MARGIN - ROAD_EDGE;
}
function roadWidth() {
  return roadRight() - roadLeft();
}
function laneWidth() {
  return roadWidth() / LANE_COUNT;
}

// =========== Game Init & Reset ===========
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
    lastLane: 1
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
  hasLifeSaver = false;
  lifeSaverCount = 0;
  lifeSaverBlink = 0;
  scroll = 0;
}

// =========== Spawning ===========
function spawnObstacle() {
  const laneW = laneWidth();
  let laneIndex = Math.floor(rand(0, LANE_COUNT));
  // Ensure no stacking with last car
  if (obstacles.length && Math.abs(obstacles[obstacles.length-1].lane-laneIndex)<1)
    laneIndex = (laneIndex+1)%LANE_COUNT;
  const types = ['car','bus'];
  // LifeSaver collectible car comes as a rare "ambulance"
  if (chance(0.035) && !hasLifeSaver && lifeSaverCount < 1) {
    obstacles.push(makeLifeSaverCar(laneIndex));
    return;
  }
  const type = chance(0.34) ? 'bus' : 'car';
  let w = (type==='bus') ? 54 : 42;
  let h = (type==='bus') ? 120 : 68;
  let x = roadLeft() + laneIndex * laneW + (laneW - w) / 2;
  let y = -h - 12;
  let vy = baseSpeed + rand(18, 60);
  let vx = 0;
  let drift = chance(0.23) ? (chance(0.5) ? 1 : -1) * rand(18, 38) : 0;
  // drift targets adjacent lane if possible
  if (drift !== 0) {
    let targetLane = clamp(laneIndex + (drift > 0 ? 1 : -1), 0, LANE_COUNT-1);
    drift = (targetLane - laneIndex) * rand(22, 48);
  }
  obstacles.push({x, y, w, h, vy, vx: drift, type, lane: laneIndex, driftDir: Math.sign(drift)});
}

function makeLifeSaverCar(laneIndex) {
  // Ambulance or rare car as extra life
  const laneW = laneWidth();
  let w = 46, h = 84;
  let x = roadLeft() + laneIndex * laneW + (laneW - w) / 2;
  let y = -h - 12;
  let vy = baseSpeed + rand(27, 52);
  return {x, y, w, h, vy, vx: 0, type: 'lifeSaver', lane: laneIndex, driftDir: 0};
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

// =========== Game Update ===========
function update(dt) {
  const speedFactor = boostTimer > 0 ? 1.52 : 1.0;
  const rl = roadLeft(), rr = roadRight(), laneW = laneWidth();

  // Player movement (keyboard/touch)
  player.vx = 0;
  if (keys['ArrowLeft'] || touchMove < 0) player.vx -= player.speed;
  if (keys['ArrowRight'] || touchMove > 0) player.vx += player.speed;
  player.x += player.vx * dt;
  player.x = clamp(player.x, rl, rr - player.w);

  // Lane snap (for indicator)
  let lane = Math.round((player.x - rl) / laneW);
  lane = clamp(lane, 0, LANE_COUNT-1);
  player.lastLane = player.lane;
  player.lane = lane;

  // Road scroll
  scroll += baseSpeed * speedFactor * 0.57 * dt;
  if (scroll > 60) scroll -= 60;

  // Obstacles (drift cars, indicator)
  for (const o of obstacles) {
    o.y += o.vy * speedFactor * dt;
    o.x += o.vx * dt;
    if (o.x < rl) { o.x = rl; o.vx *= -1; o.driftDir *= -1; }
    if (o.x + o.w > rr) { o.x = rr - o.w; o.vx *= -1; o.driftDir *= -1; }
  }
  obstacles = obstacles.filter(o => o.y < (canvas.height / DPR) + 130);

  // Coins (magnet)
  const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
  for (const c of coins) {
    c.y += (c.vy * speedFactor) * dt;
    if (magnetTimer > 0) {
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
  for (const p of powerups) p.y += (p.vy * speedFactor) * dt;
  powerups = powerups.filter(p => p.y < (canvas.height / DPR) + 60);

  // Collisions
  handleCollisions();

  // Timers
  if (magnetTimer > 0) magnetTimer -= dt;
  if (boostTimer > 0) boostTimer -= dt;
  if (lifeSaverBlink > 0) lifeSaverBlink -= dt;
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
      if (o.type === 'lifeSaver' && !hasLifeSaver) {
        // collect life saver car
        hasLifeSaver = true;
        lifeSaverCount = 1;
        lifeSaverBlink = 1.2;
        obstacles.splice(obstacles.indexOf(o), 1);
        continue;
      }
      hit = true;
      break;
    }
  }
  if (hit) {
    if (hasLifeSaver && lifeSaverCount > 0) {
      hasLifeSaver = false;
      lifeSaverCount = 0;
      lifeSaverBlink = 1.1;
      // survive crash, brief invuln
      player.invincible = 1.1;
    } else if (!player.invincible || player.invincible <= 0) {
      endGame();
    }
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

// =========== Drawing ===========
function draw() {
  // Road
  drawRoad();
  // Obstacles
  for (const o of obstacles) drawVehicle(o);
  // Coins
  for (const c of coins) drawCoin(c);
  // Powerups
  for (const p of powerups) drawPowerup(p);
  // Player
  drawPlayer();
  // Fuel blink if low
  if (fuel < 24 && Math.floor(performance.now() / 250) % 2 === 0)
    ctx.fillStyle = "rgba(255,60,60,0.14)", ctx.fillRect(0,0,canvas.width/DPR,canvas.height/DPR);
}

function drawRoad() {
  // gradient road
  const w = canvas.width / DPR, h = canvas.height / DPR;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, getVar('--road-bg-top', '#2d2d38'));
  grad.addColorStop(1, getVar('--road-bg-bottom', '#181b21'));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // road edges
  ctx.fillStyle = getVar('--hud-bg', '#23242c');
  ctx.fillRect(ROAD_MARGIN, 0, ROAD_EDGE, h);
  ctx.fillRect(w - ROAD_MARGIN - ROAD_EDGE, 0, ROAD_EDGE, h);

  // lanes
  ctx.save();
  ctx.strokeStyle = getVar('--white', '#fff');
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 4;
  const rl = roadLeft(), laneW = laneWidth();
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = rl + i * laneW;
    ctx.setLineDash([36, 28]);
    ctx.beginPath();
    ctx.moveTo(x, (scroll % 60) - 60);
    ctx.lineTo(x, h + 60);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawVehicle(v) {
  ctx.save();
  if (v.type === 'bus') {
    drawBus(v);
  } else if (v.type === 'car') {
    drawObstacleCar(v);
  } else if (v.type === 'lifeSaver') {
    drawLifeSaverCar(v);
  }
  // Turn indicator (if drifting)
  if (v.driftDir && Math.abs(v.vx) > 0.5) {
    let blink = Math.floor(performance.now()/220)%2===0;
    if (blink) {
      ctx.fillStyle = getVar('--indicator', '#ffbb33');
      let s = 13;
      if (v.driftDir > 0) {
        ctx.beginPath();
        ctx.moveTo(v.x+v.w, v.y+v.h/2-s);
        ctx.lineTo(v.x+v.w+s, v.y+v.h/2);
        ctx.lineTo(v.x+v.w, v.y+v.h/2+s);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(v.x, v.y+v.h/2-s);
        ctx.lineTo(v.x-s, v.y+v.h/2);
        ctx.lineTo(v.x, v.y+v.h/2+s);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  ctx.restore();
}
function drawObstacleCar(v) {
  // stylized vector car
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(v.x+8, v.y+v.h-8);
  ctx.lineTo(v.x+v.w-8, v.y+v.h-8);
  ctx.lineTo(v.x+v.w-2, v.y+18);
  ctx.lineTo(v.x+v.w/2+19, v.y+5);
  ctx.lineTo(v.x+v.w/2-19, v.y+5);
  ctx.lineTo(v.x+2, v.y+18);
  ctx.closePath();
  ctx.fillStyle = getVar('--obstacle-car-main','#4da3ff');
  ctx.shadowColor = "#1f5fa3";
  ctx.shadowBlur = 11;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff8";
  ctx.fillRect(v.x+8, v.y+15, v.w-16, 11);
  ctx.fillStyle = "#bbb9";
  ctx.fillRect(v.x+8, v.y+v.h-22, v.w-16, 13);
  ctx.restore();
}
function drawBus(v) {
  // stylized vector bus
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(v.x+11, v.y+v.h-11);
  ctx.lineTo(v.x+v.w-11, v.y+v.h-11);
  ctx.lineTo(v.x+v.w-3, v.y+24);
  ctx.lineTo(v.x+v.w/2+24, v.y+7);
  ctx.lineTo(v.x+v.w/2-24, v.y+7);
  ctx.lineTo(v.x+3, v.y+24);
  ctx.closePath();
  ctx.fillStyle = getVar('--bus-main','#ffd74b');
  ctx.shadowColor = "#bd9a1b";
  ctx.shadowBlur = 9;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff8";
  ctx.fillRect(v.x+11, v.y+18, v.w-22, 14);
  ctx.fillStyle = "#cdb900";
  ctx.fillRect(v.x+11, v.y+v.h-28, v.w-22, 15);
  ctx.restore();
}
function drawLifeSaverCar(v) {
  // white "ambulance" with cross
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(v.x+9, v.y+v.h-9);
  ctx.lineTo(v.x+v.w-9, v.y+v.h-9);
  ctx.lineTo(v.x+v.w-3, v.y+16);
  ctx.lineTo(v.x+v.w/2+16, v.y+7);
  ctx.lineTo(v.x+v.w/2-16, v.y+7);
  ctx.lineTo(v.x+3, v.y+16);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#87e3fd";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  // red cross
  ctx.save();
  ctx.translate(v.x+v.w/2, v.y+v.h/2);
  ctx.rotate(-0.03);
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(-6, -2, 12, 4);
  ctx.fillRect(-2, -6, 4, 12);
  ctx.restore();
  ctx.restore();
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
  // Body
  ctx.save();
  ctx.shadowColor = "#c43b2b";
  ctx.shadowBlur = 13;
  drawRoundRect(player.x, player.y, player.w, player.h, 12);
  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "#d3c3c3";
  ctx.lineWidth = 2;
  ctx.strokeRect(player.x, player.y, player.w, player.h);
  ctx.restore();
  // Window
  ctx.fillStyle = "#fff2";
  ctx.fillRect(player.x+7, player.y+15, player.w-14, 16);
  // Taillights (brake)
  if (!keys['ArrowLeft'] && !keys['ArrowRight'] && !touchMove) {
    ctx.save();
    ctx.shadowColor = "#ff4b4b";
    ctx.shadowBlur = 7;
    ctx.fillStyle = "#ff4b4b";
    ctx.fillRect(player.x+8, player.y+player.h-12, 9, 7);
    ctx.fillRect(player.x+player.w-17, player.y+player.h-12, 9, 7);
    ctx.restore();
  }
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
  // Life saver halo or invincible blink
  if ((hasLifeSaver && lifeSaverCount > 0) || (player.invincible && Math.floor(performance.now()/110)%2===0)) {
    let blink = player.invincible ? Math.floor(performance.now()/110)%2===0 : true;
    if (blink) {
      ctx.save();
      ctx.strokeStyle = "rgba(141,245,141,0.94)";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#8df58d";
      ctx.shadowBlur = 12;
      drawRoundRect(player.x-7, player.y-7, player.w+14, player.h+14, 18, false, true);
      ctx.restore();
    }
  }
}

function drawCoin(c) {
  ctx.save();
  ctx.shadowColor = getVar('--coin','#ffd24d');
  ctx.shadowBlur = 12;
  ctx.fillStyle = getVar('--coin','#ffd24d');
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
    ctx.fillStyle = getVar('--magnet','#ff6b6b');
    ctx.fillRect(p.x+7, p.y+7, 7, p.h-14);
    ctx.fillRect(p.x+p.w-14, p.y+7, 7, p.h-14);
    ctx.fillRect(p.x+6, p.y+7, p.w-12, 7);
  } else if (p.kind === 'boost') {
    ctx.fillStyle = getVar('--boost','#66e0ff');
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

function getVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// =========== UI Update ===========
function updateHUD() {
  scoreSpan.textContent = Math.floor(score);
  coinsSpan.textContent = coinCount;
  fuelBar.style.width = clamp(fuel, 0, 100) * 0.6 + "px";
  fuelBar.style.background = fuel > 30 ? "var(--fuel-green)" : "var(--fuel-red)";
  lifeSaverHud.style.display = hasLifeSaver && lifeSaverCount > 0 ? "" : "none";
  lifeSaverCountSpan.textContent = lifeSaverCount;
  // Powerup timers
  if (magnetTimer > 0) {
    magnetPower.hidden = false;
    magnetTimerSpan.textContent = Math.ceil(magnetTimer);
  } else magnetPower.hidden = true;
  if (boostTimer > 0) {
    boostPower.hidden = false;
    boostTimerSpan.textContent = Math.ceil(boostTimer);
  } else boostPower.hidden = true;
}

// =========== Game Loop ===========
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

// =========== State Handlers ===========
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

// =========== Controls ===========
document.addEventListener('keydown', e => {
  if (e.key === " " || e.key === "Spacebar") {
    if (gameState === STATE.MENU || gameState === STATE.GAMEOVER) startGame();
    else if (gameState === STATE.PLAYING || gameState === STATE.PAUSED) togglePause();
  }
  if (gameState !== STATE.PLAYING) return;
  if (e.key === "ArrowLeft" || e.key === "a") keys['ArrowLeft'] = true;
  if (e.key === "ArrowRight" || e.key === "d") keys['ArrowRight'] = true;
});
document.addEventListener('keyup', e => {
  if (e.key === "ArrowLeft" || e.key === "a") keys['ArrowLeft'] = false;
  if (e.key === "ArrowRight" || e.key === "d") keys['ArrowRight'] = false;
});
leftBtn.addEventListener('touchstart', e => { e.preventDefault(); touchMove = -1; }, {passive:false});
leftBtn.addEventListener('touchend', e => { e.preventDefault(); touchMove = 0; }, {passive:false});
rightBtn.addEventListener('touchstart', e => { e.preventDefault(); touchMove = 1; }, {passive:false});
rightBtn.addEventListener('touchend', e => { e.preventDefault(); touchMove = 0; }, {passive:false});
pauseBtn.addEventListener('click', togglePause);

canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 1) swipeStart = e.touches[0].clientX;
});
canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && swipeStart !== null) {
    let dx = e.touches[0].clientX - swipeStart;
    if (Math.abs(dx) > 30) {
      touchMove = dx > 0 ? 1 : -1;
    }
  }
});
canvas.addEventListener('touchend', e => {
  swipeStart = null; touchMove = 0;
});

playBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', togglePause);

// =========== Mobile UI Show/Hide ===========
function updateMobileControls() {
  const mobile = window.innerWidth < 420;
  document.querySelector('.mobile-controls').style.display = mobile ? 'flex' : 'none';
}
updateMobileControls();
window.addEventListener('resize', updateMobileControls);

// =========== Start ===========
resetGame();
gameState = STATE.MENU;
menuOverlay.style.display = "";
gameOverOverlay.style.display = "none";
pauseOverlay.style.display = "none";
requestAnimationFrame(loop);
