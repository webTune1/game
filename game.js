// game.js - Test Drive core game logic

// === SETTINGS ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const DPR = window.devicePixelRatio || 1;
// Responsive sizing
function fitCanvas() {
  let w = Math.min(window.innerWidth * 0.9, 480);
  let h = w * 1.65;
  // For very tall mobiles, fill more height
  if (window.innerHeight > h * 1.1) h = Math.min(window.innerHeight * 0.97, 800);
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

// === GLOBALS ===
const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3 };
let gameState = STATE.MENU;

let player, obstacles, coins, powerups, score, coinCount, fuel;
let baseSpeed, spawnObsTimer, spawnCoinTimer, spawnPowTimer;
let magnetTimer = 0, boostTimer = 0;
let hasLifeSaver = false, lifeSaverCount = 0, lifeSaverBlink = 0;
let keys = {}, touchMove = 0, holdingLeft = false, holdingRight = false;
let swipeStart = null, last = performance.now(), scroll = 0, level = 0, levelTimer = 0;
let dayNight = "day"; // or "night"
let dayNightTimer = 0;

// === UI Elements ===
const scoreSpan = document.getElementById('score');
const coinsSpan = document.getElementById('coins');
const fuelBar = document.getElementById('fuel-bar-inner');
const lifeSaverHud = document.getElementById('lifeSaverHud');
const lifeSaverCountSpan = document.getElementById('lifeSaverCount');
const magnetPower = document.getElementById('magnetPower');
const boostPower = document.getElementById('boostPower');
const magnetTimerSpan = document.getElementById('magnetTimer');
const boostTimerSpan = document.getElementById('boostTimer');
const levelLabel = document.getElementById('levelName');
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
const levelNotification = document.getElementById('levelNotification');
const toggleModeBtn = document.getElementById('toggleModeBtn');

// === ROAD SETTINGS ===
function roadLeft() {
  return (canvas.width / DPR) * 0.08;
}
function roadRight() {
  return (canvas.width / DPR) * 0.92;
}
function roadWidth() {
  return roadRight() - roadLeft();
}
function laneWidth() {
  return roadWidth() / 3;
}

// === INIT/RESET ===
function resetGame() {
  const laneW = laneWidth();
  level = 0; levelTimer = 0;
  selectLevel(0, true);
  player = {
    w: laneW * 0.7, h: laneW * 1.18,
    x: roadLeft() + laneW + (laneW - laneW*0.7) / 2,
    y: (canvas.height / DPR) - laneW * 1.4,
    vx: 0,
    lane: 1,
    lastLane: 1,
    invincible: 0,
    trail: [],
  };
  obstacles = [];
  coins = [];
  powerups = [];
  score = 0;
  coinCount = 0;
  fuel = 100;
  baseSpeed = 130;
  spawnObsTimer = 0;
  spawnCoinTimer = 0;
  spawnPowTimer = 0;
  magnetTimer = 0;
  boostTimer = 0;
  hasLifeSaver = false; lifeSaverCount = 0;
  lifeSaverBlink = 0;
  scroll = 0;
  dayNight = "day"; dayNightTimer = 0;
  updateHUD();
}

// === LEVELS & CAR MODELS ===
function selectLevel(lvl, force) {
  const L = window.LEVELS[lvl % window.LEVELS.length];
  level = lvl;
  baseSpeed = 130 * L.speed;
  showLevelNotification(L.name);
  // Change car model
  player && Object.assign(player, {carModel: L.car, carColor: window.CAR_MODELS[L.car].color});
  document.body.classList.toggle('day-mode', dayNight === "day");
  document.body.classList.toggle('night-mode', dayNight === "night");
  levelLabel.textContent = L.name;
}

// === SPAWN ===
function spawnObstacle() {
  const laneW = laneWidth();
  let laneIndex = Math.floor(Math.random() * 3);
  let type = "car";
  let model = (level % window.LEVELS.length);
  // For higher levels, mix in bikes, buses, etc.
  if (level >= 4 && Math.random() < 0.3) type = "bike";
  // Use car model of this level for variety
  let cm = window.CAR_MODELS[model];
  let w = laneW * (type === "bike" ? 0.45 : 0.7),
      h = laneW * (type === "bike" ? 0.9 : 1.18);
  let x = roadLeft() + laneIndex * laneW + (laneW - w) / 2,
      y = -h - 10;
  let vy = baseSpeed + Math.random() * 50;
  obstacles.push({x, y, w, h, vy, vx: 0, cm, type});
}
function spawnCoinLine() {
  const laneW = laneWidth();
  const laneIndex = Math.floor(Math.random() * 3);
  const startX = roadLeft() + laneIndex * laneW + laneW / 2;
  const gap = 28;
  for (let i = 0; i < 6; i++) {
    const y = -i * gap - 16;
    const r = 11;
    const vy = baseSpeed * 0.8 + Math.random() * 30;
    coins.push({x: startX, y, r, vy, vx: 0});
  }
}
function spawnPowerup() {
  const rw = roadWidth();
  const x = roadLeft() + Math.random() * (rw-40) + 20;
  const y = -28;
  const kind = ['magnet', 'boost'][Math.floor(Math.random()*2)];
  const vy = baseSpeed * 0.9 + Math.random() * 30;
  powerups.push({x, y, w: 32, h: 32, vy, kind});
}

// === GAME UPDATE ===
function update(dt) {
  // Auto day-night cycle: every 45s
  dayNightTimer += dt;
  if ((dayNight === "day" && dayNightTimer > 45) || (dayNight === "night" && dayNightTimer > 45)) {
    dayNight = (dayNight === "day") ? "night" : "day";
    document.body.classList.toggle('day-mode', dayNight === "day");
    document.body.classList.toggle('night-mode', dayNight === "night");
    dayNightTimer = 0;
    showLevelNotification(dayNight === "night" ? "Night Driving" : "Sunrise!");
  }

  // Difficulty and level up every X score
  levelTimer += dt;
  if (score > (level+1) * 350) {
    selectLevel(level+1, false);
  }

  // Controls
  player.vx = 0;
  if (keys['ArrowLeft'] || holdingLeft) player.vx -= playerSpeed();
  if (keys['ArrowRight'] || holdingRight) player.vx += playerSpeed();
  player.x += player.vx * dt;
  // Clamp to road
  player.x = Math.max(roadLeft(), Math.min(roadRight()-player.w, player.x));

  // Lane snap
  let lane = Math.round((player.x - roadLeft()) / laneWidth());
  lane = Math.max(0, Math.min(2, lane));
  player.lastLane = player.lane;
  player.lane = lane;

  // Road scroll
  scroll += baseSpeed * (boostTimer>0?1.6:1.0) * 0.58 * dt;
  if (scroll > 60) scroll -= 60;

  // Obstacles
  for (const o of obstacles) {
    o.y += o.vy * (boostTimer>0?1.5:1.0) * dt;
  }
  obstacles = obstacles.filter(o => o.y < (canvas.height/DPR) + 130);

  // Coins
  for (const c of coins) {
    c.y += (c.vy * (boostTimer>0?1.4:1.0)) * dt;
    if (magnetTimer > 0) {
      const pcx = player.x + player.w/2, pcy = player.y + player.h/2;
      const dx = pcx - c.x, dy = pcy - c.y;
      const dist = Math.hypot(dx, dy) || 1;
      const pull = Math.max(0.7, Math.min(6, 230 / dist));
      c.x += dx * pull * dt;
      c.y += dy * pull * dt;
    }
  }
  coins = coins.filter(c => c.y < (canvas.height/DPR) + 50);

  // Powerups
  for (const p of powerups) p.y += (p.vy * (boostTimer>0?1.3:1.0)) * dt;
  powerups = powerups.filter(p => p.y < (canvas.height/DPR) + 60);

  // Collisions
  handleCollisions();

  // Timers
  if (magnetTimer > 0) magnetTimer -= dt;
  if (boostTimer > 0) boostTimer -= dt;
  if (lifeSaverBlink > 0) lifeSaverBlink -= dt;
  score += dt * 60 * (boostTimer>0?1.5:1.0);
  baseSpeed += dt * 2.3;

  // Fuel
  fuel -= dt * (boostTimer>0?2.3:1.5);
  if (fuel <= 0) {
    fuel = 0;
    endGame();
  }

  // Spawning
  spawnObsTimer += dt;
  spawnCoinTimer += dt;
  spawnPowTimer += dt;
  if (spawnObsTimer > 1.0) { spawnObsTimer = 0; spawnObstacle(); }
  if (spawnCoinTimer > 1.4) { spawnCoinTimer = 0; if (Math.random()<0.7) spawnCoinLine(); }
  if (spawnPowTimer > 5.0) { spawnPowTimer = 0; if (Math.random()<0.7) spawnPowerup(); }

  // Player trail (for boost effect)
  player.trail.push({x: player.x, y: player.y, w: player.w, h: player.h, t: 0.33});
  if (player.trail.length > 11) player.trail.shift();
  for (const t of player.trail) t.t -= dt;
}
function playerSpeed() {
  let speed = 310 * (window.LEVELS[level%window.LEVELS.length].speed || 1.0);
  if (boostTimer > 0) speed *= 1.24;
  return speed;
}
function handleCollisions() {
  let hit = false;
  for (const o of obstacles) {
    if (o.x < player.x + player.w && o.x + o.w > player.x &&
      o.y < player.y + player.h && o.y + o.h > player.y) {
      hit = true; break;
    }
  }
  if (hit) {
    if (hasLifeSaver && lifeSaverCount > 0) {
      hasLifeSaver = false;
      lifeSaverCount = 0;
      lifeSaverBlink = 1.1;
      player.invincible = 1.1;
      showLevelNotification("Life Saver Used!", "#ffbb33");
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
    const nx = Math.max(player.x, Math.min(player.x + player.w, c.x));
    const ny = Math.max(player.y, Math.min(player.y + player.h, c.y));
    const dx = c.x - nx, dy = c.y - ny;
    if (dx * dx + dy * dy < c.r * c.r) {
      coins.splice(i, 1);
      coinCount += 1;
      score += 8;
      fuel = Math.min(100, fuel + 3);
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

// === DRAWING ===
function draw() {
  drawRoad();
  for (const o of obstacles) drawCarOrBike(o);
  for (const c of coins) drawCoin(c);
  for (const p of powerups) drawPowerup(p);
  drawPlayer();
  // Fuel blink if low
  if (fuel < 19 && Math.floor(performance.now() / 230) % 2 === 0)
    ctx.fillStyle = "rgba(255,60,60,0.12)", ctx.fillRect(0,0,canvas.width/DPR,canvas.height/DPR);
}
function drawRoad() {
  const w = canvas.width / DPR, h = canvas.height / DPR;
  let grad = ctx.createLinearGradient(0, 0, 0, h);
  if (dayNight === "day") {
    grad.addColorStop(0, getVar('--road-top-day','#b7becd'));
    grad.addColorStop(1, getVar('--road-bottom-day','#7d8aad'));
  } else {
    grad.addColorStop(0, getVar('--road-top','#373b48'));
    grad.addColorStop(1, getVar('--road-bottom','#292b36'));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(roadLeft()-30, 0, roadWidth()+60, h);

  // road edges
  ctx.fillStyle = "#222b";
  ctx.fillRect(roadLeft()-6, 0, 7, h);
  ctx.fillRect(roadRight()-1, 0, 7, h);

  // lanes
  ctx.save();
  ctx.strokeStyle = "#fff9";
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 5;
  let dash = 36, gap = 32;
  for (let i = 1; i < 3; i++) {
    const x = roadLeft() + i * laneWidth();
    ctx.setLineDash([dash, gap]);
    ctx.beginPath();
    ctx.moveTo(x, (scroll % (dash+gap)) - (dash+gap));
    ctx.lineTo(x, h + (dash+gap));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // Night: vignette and side lights
  if (dayNight === "night") {
    let vgrad = ctx.createRadialGradient(w/2, h*0.8, w*0.33, w/2, h*0.8, w*0.86);
    vgrad.addColorStop(0, "rgba(0,0,0,0)");
    vgrad.addColorStop(1, "rgba(0,0,0,0.44)");
    ctx.fillStyle = vgrad; ctx.fillRect(0,0,w,h);
  }
}
function drawCarOrBike(o) {
  // Draw obstacle car/bike using its car model
  o.cm.draw(ctx, o.x, o.y, o.w, o.h, {headlights: (dayNight==="night")});
}
function drawPlayer() {
  // Boost trail
  if (boostTimer > 0) {
    for (const t of player.trail) {
      if (t.t <= 0) continue;
      const a = Math.max(0, Math.min(0.24, t.t * 0.38));
      ctx.fillStyle = `rgba(102,224,255,${a})`;
      drawRoundRect(t.x, t.y + 9, t.w, t.h - 18, 14);
    }
  }
  // Draw car model
  let cm = window.CAR_MODELS[window.LEVELS[level%window.LEVELS.length].car];
  cm.draw(ctx, player.x, player.y, player.w, player.h, {
    color: cm.color,
    shadow: cm.shadow,
    headlights: (dayNight==="night")
  });
  // Magnet aura
  if (magnetTimer > 0) {
    let alpha = 0.15 + 0.13 * Math.sin(performance.now() / 160);
    ctx.save();
    ctx.strokeStyle = `rgba(255,107,107,${alpha})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(player.x + player.w / 2, player.y + player.h / 2, 62, 64, 0, 0, Math.PI * 2);
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
      ctx.shadowBlur = 9;
      drawRoundRect(player.x-7, player.y-7, player.w+14, player.h+14, 15, false, true);
      ctx.restore();
    }
  }
}
function drawCoin(c) {
  ctx.save();
  ctx.shadowColor = getVar('--coin','#ffd24d');
  ctx.shadowBlur = 10;
  ctx.fillStyle = getVar('--coin','#ffd24d');
  ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff7";
  ctx.beginPath(); ctx.arc(c.x-3, c.y-3, c.r*0.55, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawPowerup(p) {
  ctx.save();
  ctx.fillStyle = "#190b";
  drawRoundRect(p.x, p.y, p.w, p.h, 7);
  if (p.kind === 'magnet') {
    ctx.fillStyle = getVar('--magnet','#ff6b6b');
    ctx.fillRect(p.x+8, p.y+8, 7, p.h-16);
    ctx.fillRect(p.x+p.w-15, p.y+8, 7, p.h-16);
    ctx.fillRect(p.x+7, p.y+8, p.w-14, 8);
  } else if (p.kind === 'boost') {
    ctx.fillStyle = getVar('--boost','#66e0ff');
    ctx.beginPath();
    ctx.moveTo(p.x+p.w/2-5, p.y+7);
    ctx.lineTo(p.x+p.w/2+3, p.y+7);
    ctx.lineTo(p.x+p.w/2-3, p.y+p.h-7);
    ctx.lineTo(p.x+p.w/2+5, p.y+p.h-7);
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

// === UI UPDATE ===
function updateHUD() {
  scoreSpan.textContent = Math.floor(score);
  coinsSpan.textContent = coinCount;
  fuelBar.style.width = Math.max(0, Math.min(100, fuel)) * 0.58 + "px";
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

// === GAME LOOP ===
function loop(now) {
  const dt = Math.max(0.016, Math.min((now - last) / 1000, 0.04));
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

// === STATE HANDLERS ===
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
function showLevelNotification(text, color) {
  if (!text) return;
  levelNotification.textContent = text;
  levelNotification.style.opacity = 1;
  levelNotification.style.background = color ? color : "";
  setTimeout(()=>{levelNotification.style.opacity = 0;}, 1800);
}

// === CONTROLS (FIX: prevent screen shake) ===
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

toggleModeBtn.addEventListener('click', ()=>{
  dayNight = (dayNight==="day")?"night":"day";
  dayNightTimer = 0;
  document.body.classList.toggle('day-mode', dayNight==="day");
  document.body.classList.toggle('night-mode', dayNight==="night");
});

// Mobile controls show/hide
function updateMobileControls() {
  const mobile = window.innerWidth < 500;
  document.querySelector('.mobile-controls').style.display = mobile ? 'flex' : 'none';
}
updateMobileControls();
window.addEventListener('resize', updateMobileControls);

// === INIT & START ===
resetGame();
gameState = STATE.MENU;
menuOverlay.style.display = "";
gameOverOverlay.style.display = "none";
pauseOverlay.style.display = "none";
requestAnimationFrame(loop);
