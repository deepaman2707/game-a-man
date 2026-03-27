const game = document.getElementById("game");
const player = document.getElementById("player");
const playerImg = document.getElementById("playerImg");
const previewImg = document.getElementById("previewImg");
const previewPlaceholder = document.getElementById("previewPlaceholder");

const skylineBack = document.getElementById("skylineBack");
const skylineFront = document.getElementById("skylineFront");

const playerNameInput = document.getElementById("playerNameInput");
const playerNameDisplay = document.getElementById("playerNameDisplay");
const photoInput = document.getElementById("photoInput");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const jumpBtn = document.getElementById("jumpBtn");
const shootBtn = document.getElementById("shootBtn");
const soundBtn = document.getElementById("soundBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const installBtn = document.getElementById("installBtn");
const installHelpBtn = document.getElementById("installHelpBtn");
const installHelp = document.getElementById("installHelp");
const closeInstallHelpBtn = document.getElementById("closeInstallHelpBtn");

const setupScreen = document.getElementById("setupScreen");
const startMessage = document.getElementById("startMessage");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const gameOverText = document.getElementById("gameOverText");

const scoreEl = document.getElementById("score");
const coinsEl = document.getElementById("coins");
const totalCoinsEl = document.getElementById("totalCoins");
const levelEl = document.getElementById("level");
const timeEl = document.getElementById("time");
const highScoreEl = document.getElementById("highScore");
const livesDisplay = document.getElementById("livesDisplay");
const shieldStatusEl = document.getElementById("shieldStatus");
const shieldRing = document.getElementById("shieldRing");
const bossStatusEl = document.getElementById("bossStatus");
const bossBarWrap = document.getElementById("bossBarWrap");
const bossHealthEl = document.getElementById("bossHealth");

let deferredPrompt = null;

let setupDone = false;
let gameStarted = false;
let gameOver = false;
let paused = false;

let playerName = localStorage.getItem("spaceRunnerPlayerName") || "";
let savedPhoto = localStorage.getItem("spaceRunnerPlayerPhoto") || "";

let playerBottom = 80;
let isJumping = false;
let velocityY = 0;
let gravity = 0.82;

let score = 0;
let coins = 0;
let level = 1;
let elapsedTime = 0;
let lives = 3;

let highScore = Number(localStorage.getItem("spaceRunnerHighScore") || 0);
let totalCoins = Number(localStorage.getItem("spaceRunnerTotalCoins") || 0);

let obstacleSpeed = 6.3;
let obstacleSpawnRate = 1450;
let coinSpawnRate = 2100;
let powerupSpawnRate = 8500;

let shieldActive = false;
let shieldTimeLeft = 0;

let soundOn = localStorage.getItem("spaceRunnerSound") !== "off";
let audioCtx = null;

let obstacles = [];
let bullets = [];
let coinItems = [];
let powerups = [];
let bossProjectiles = [];

let boss = null;
let bossActive = false;
let bossSpawnedThisLevel = false;
let bossShootTick = 0;

let lastSpawnTime = 0;
let lastCoinSpawnTime = 0;
let lastPowerupSpawnTime = 0;
let lastTime = 0;
let timerTick = 0;
let levelTick = 0;
let invincibleTime = 0;

let skylineBackItems = [];
let skylineFrontItems = [];

playerNameInput.value = playerName;
playerNameDisplay.textContent = playerName || "Player";
highScoreEl.textContent = highScore;
totalCoinsEl.textContent = totalCoins;
soundBtn.textContent = soundOn ? "SOUND ON" : "SOUND OFF";

if (savedPhoto) {
  playerImg.src = savedPhoto;
  previewImg.src = savedPhoto;
  previewImg.style.display = "block";
  previewPlaceholder.style.display = "none";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add("hidden");
});

photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const data = event.target.result;
    playerImg.src = data;
    previewImg.src = data;
    previewImg.style.display = "block";
    previewPlaceholder.style.display = "none";
    localStorage.setItem("spaceRunnerPlayerPhoto", data);
  };
  reader.readAsDataURL(file);
});

function ensureAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function beep(freq, duration, type = "sine", volume = 0.03) {
  if (!soundOn) return;
  ensureAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();

  setTimeout(() => {
    try { osc.stop(); } catch (e) {}
  }, duration);
}

function setLivesDisplay() {
  livesDisplay.textContent = "❤️".repeat(Math.max(0, lives));
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function showInstallHelp() {
  installHelp.style.display = "flex";
}

function hideInstallHelp() {
  installHelp.style.display = "none";
}

function finishSetup() {
  playerName = playerNameInput.value.trim() || "Player";
  localStorage.setItem("spaceRunnerPlayerName", playerName);
  playerNameDisplay.textContent = playerName;

  if (!playerImg.src) {
    const defaultFace =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
          <rect width="100" height="100" rx="16" fill="#111827"/>
          <circle cx="50" cy="42" r="22" fill="#6cf0ff"/>
          <rect x="30" y="68" width="40" height="12" rx="6" fill="#94a3b8"/>
        </svg>
      `);
    playerImg.src = defaultFace;
  }

  setupDone = true;
  setupScreen.classList.add("hidden");
  startMessage.classList.remove("hidden");
}

function maybeAutoSkipSetup() {
  if (playerName && savedPhoto) {
    setupDone = true;
    playerNameDisplay.textContent = playerName;
    setupScreen.classList.add("hidden");
    startMessage.classList.remove("hidden");
  }
}

function startGame() {
  if (!setupDone || gameStarted || paused) return;

  gameStarted = true;
  gameOver = false;
  paused = false;

  startMessage.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");

  player.classList.add("running");

  lastTime = performance.now();
  lastSpawnTime = lastTime;
  lastCoinSpawnTime = lastTime;
  lastPowerupSpawnTime = lastTime;
  timerTick = 0;
  levelTick = 0;

  requestAnimationFrame(gameLoop);
}

function clearObjects(list) {
  list.forEach(item => item.el.remove());
}

function clearAllObjects() {
  clearObjects(obstacles);
  clearObjects(bullets);
  clearObjects(coinItems);
  clearObjects(powerups);
  clearObjects(bossProjectiles);

  obstacles = [];
  bullets = [];
  coinItems = [];
  powerups = [];
  bossProjectiles = [];

  if (boss && boss.el) boss.el.remove();
  boss = null;
  bossActive = false;
  bossSpawnedThisLevel = false;
  bossShootTick = 0;

  bossBarWrap.classList.add("hidden");
  bossStatusEl.textContent = "NO";
}

function resetGame() {
  clearAllObjects();

  score = 0;
  coins = 0;
  level = 1;
  elapsedTime = 0;
  lives = 3;

  obstacleSpeed = 6.3;
  obstacleSpawnRate = 1450;
  coinSpawnRate = 2100;
  powerupSpawnRate = 8500;

  shieldActive = false;
  shieldTimeLeft = 0;
  invincibleTime = 0;

  scoreEl.textContent = score;
  coinsEl.textContent = coins;
  totalCoinsEl.textContent = totalCoins;
  levelEl.textContent = level;
  timeEl.textContent = elapsedTime;
  highScoreEl.textContent = highScore;
  shieldStatusEl.textContent = "OFF";
  setLivesDisplay();

  shieldRing.classList.add("hidden");

  gameStarted = false;
  gameOver = false;
  paused = false;

  playerBottom = 80;
  velocityY = 0;
  isJumping = false;
  player.style.bottom = playerBottom + "px";
  player.style.opacity = "1";
  player.classList.remove("running");

  lastSpawnTime = 0;
  lastCoinSpawnTime = 0;
  lastPowerupSpawnTime = 0;
  lastTime = 0;
  timerTick = 0;
  levelTick = 0;

  startMessage.classList.remove("hidden");
  gameOverScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
}

function pauseGame() {
  if (!gameStarted || gameOver) return;
  paused = true;
  gameStarted = false;
  player.classList.remove("running");
  pauseScreen.classList.remove("hidden");
}

function resumeGame() {
  if (!paused || gameOver) return;
  paused = false;
  pauseScreen.classList.add("hidden");
  startGame();
}

function jump() {
  if (!isJumping && !gameOver) {
    isJumping = true;
    velocityY = 15.4;
    beep(420, 80, "square", 0.04);
  }
}

function shoot() {
  if (!gameStarted || gameOver || paused) return;

  const bullet = document.createElement("div");
  bullet.className = "bullet";
  bullet.style.left = "136px";
  bullet.style.bottom = (playerBottom + 48) + "px";
  game.appendChild(bullet);

  bullets.push({
    el: bullet,
    x: 136,
    y: playerBottom + 48,
    width: 16,
    height: 6
  });

  beep(760, 70, "sawtooth", 0.025);
}

function randomAsteroidSize() {
  const r = Math.random();
  if (r < 0.36) return { size: 30, score: 1 };
  if (r < 0.72) return { size: 48, score: 2 };
  return { size: 68, score: 3 };
}

function createObstacle() {
  const obstacle = document.createElement("div");
  obstacle.className = "obstacle";

  const data = randomAsteroidSize();
  const size = data.size;

  obstacle.style.width = size + "px";
  obstacle.style.height = size + "px";
  obstacle.style.left = game.clientWidth + "px";
  obstacle.style.bottom = "86px";
  game.appendChild(obstacle);

  obstacles.push({
    el: obstacle,
    x: game.clientWidth,
    width: size,
    height: size,
    bottom: 86,
    points: data.score,
    rotation: Math.random() * 360,
    spin: (Math.random() * 2 + 0.5) * (Math.random() < 0.5 ? -1 : 1),
    hitInset: Math.max(6, size * 0.16)
  });
}

function createCoin() {
  const coin = document.createElement("div");
  coin.className = "coin";
  const bottom = 120 + Math.random() * 120;
  coin.style.left = game.clientWidth + "px";
  coin.style.bottom = bottom + "px";
  game.appendChild(coin);

  coinItems.push({
    el: coin,
    x: game.clientWidth,
    width: 24,
    height: 24,
    bottom: bottom
  });
}

function createPowerup() {
  const p = document.createElement("div");
  p.className = "powerup";
  const bottom = 130 + Math.random() * 95;
  p.style.left = game.clientWidth + "px";
  p.style.bottom = bottom + "px";
  game.appendChild(p);

  powerups.push({
    el: p,
    x: game.clientWidth,
    width: 28,
    height: 28,
    bottom: bottom
  });
}

function spawnBoss() {
  if (bossActive || bossSpawnedThisLevel) return;

  const el = document.createElement("div");
  el.className = "boss";
  game.appendChild(el);

  boss = {
    el,
    x: game.clientWidth + 70,
    yBottom: 120,
    width: 170,
    height: 100,
    health: 18 + level * 4,
    maxHealth: 18 + level * 4,
    targetX: game.clientWidth - 220,
    floatDir: 1
  };

  bossActive = true;
  bossSpawnedThisLevel = true;
  bossShootTick = 0;
  bossStatusEl.textContent = "YES";
  bossBarWrap.classList.remove("hidden");
  updateBossBar();
  beep(180, 120, "sawtooth", 0.05);
  setTimeout(() => beep(140, 160, "sawtooth", 0.05), 100);
}

function createBossProjectile() {
  if (!boss) return;

  const el = document.createElement("div");
  el.className = "boss-projectile";
  game.appendChild(el);

  const x = boss.x + 10;
  const yBottom = boss.yBottom + 40;

  el.style.left = x + "px";
  el.style.bottom = yBottom + "px";

  bossProjectiles.push({
    el,
    x: x,
    bottom: yBottom,
    width: 20,
    height: 20,
    speedX: 6.5 + level * 0.2
  });

  beep(260, 70, "sawtooth", 0.025);
}

function updateBossBar() {
  if (!boss) return;
  const pct = Math.max(0, (boss.health / boss.maxHealth) * 100);
  bossHealthEl.style.width = pct + "%";
}

function updatePlayer() {
  if (isJumping) {
    velocityY -= gravity;
    playerBottom += velocityY;

    if (playerBottom <= 80) {
      playerBottom = 80;
      velocityY = 0;
      isJumping = false;
    }
  }

  player.style.bottom = playerBottom + "px";

  if (invincibleTime > 0) {
    player.style.opacity = (Math.floor(invincibleTime / 100) % 2 === 0) ? "0.45" : "1";
  } else {
    player.style.opacity = "1";
  }
}

function getPlayerRect() {
  const gameHeight = game.clientHeight;
  return {
    left: 86,
    right: 122,
    top: gameHeight - playerBottom - 84,
    bottom: gameHeight - playerBottom
  };
}

function getRect(item) {
  const gameHeight = game.clientHeight;
  const inset = item.hitInset || 0;

  return {
    left: item.x + inset,
    right: item.x + item.width - inset,
    top: gameHeight - item.bottom - item.height + inset,
    bottom: gameHeight - item.bottom - inset
  };
}

function collides(a, b) {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}

function hitPlayer() {
  if (invincibleTime > 0) return;

  if (shieldActive) {
    shieldActive = false;
    shieldTimeLeft = 0;
    shieldRing.classList.add("hidden");
    shieldStatusEl.textContent = "OFF";
    invincibleTime = 700;
    beep(220, 120, "square", 0.05);
    return;
  }

  lives--;
  setLivesDisplay();
  invincibleTime = 1200;
  beep(180, 180, "sawtooth", 0.05);

  if (lives <= 0) {
    endGame();
  }
}

function updateObstacles() {
  const playerRect = getPlayerRect();

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= obstacleSpeed;
    obs.rotation += obs.spin;
    obs.el.style.left = obs.x + "px";
    obs.el.style.transform = `rotate(${obs.rotation}deg)`;

    if (collides(playerRect, getRect(obs))) {
      obs.el.remove();
      obstacles.splice(i, 1);
      hitPlayer();
      if (gameOver) return;
      continue;
    }

    if (obs.x + obs.width < 0) {
      obs.el.remove();
      obstacles.splice(i, 1);
      score += obs.points;
      scoreEl.textContent = score;
    }
  }
}

function updateCoins() {
  const playerRect = getPlayerRect();

  for (let i = coinItems.length - 1; i >= 0; i--) {
    const coin = coinItems[i];
    coin.x -= obstacleSpeed;
    coin.el.style.left = coin.x + "px";

    if (collides(playerRect, getRect(coin))) {
      coin.el.remove();
      coinItems.splice(i, 1);
      coins++;
      totalCoins++;
      localStorage.setItem("spaceRunnerTotalCoins", String(totalCoins));
      coinsEl.textContent = coins;
      totalCoinsEl.textContent = totalCoins;
      score += 2;
      scoreEl.textContent = score;
      beep(900, 60, "triangle", 0.03);
      continue;
    }

    if (coin.x + coin.width < 0) {
      coin.el.remove();
      coinItems.splice(i, 1);
    }
  }
}

function updatePowerups() {
  const playerRect = getPlayerRect();

  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.x -= obstacleSpeed;
    p.el.style.left = p.x + "px";

    if (collides(playerRect, getRect(p))) {
      p.el.remove();
      powerups.splice(i, 1);
      shieldActive = true;
      shieldTimeLeft = 8000;
      shieldRing.classList.remove("hidden");
      shieldStatusEl.textContent = "ON";
      beep(520, 80, "triangle", 0.03);
      setTimeout(() => beep(760, 100, "triangle", 0.03), 90);
      continue;
    }

    if (p.x + p.width < 0) {
      p.el.remove();
      powerups.splice(i, 1);
    }
  }
}

function updateBoss(deltaTime) {
  if (!bossActive || !boss) return;

  if (boss.x > boss.targetX) {
    boss.x -= 3.5;
  } else {
    boss.yBottom += boss.floatDir * 0.8;
    if (boss.yBottom > 210) boss.floatDir = -1;
    if (boss.yBottom < 110) boss.floatDir = 1;
  }

  bossShootTick += deltaTime;
  if (bossShootTick >= 1800) {
    createBossProjectile();
    bossShootTick = 0;
  }

  boss.el.style.left = boss.x + "px";
  boss.el.style.bottom = boss.yBottom + "px";

  const playerRect = getPlayerRect();
  const bossRect = {
    left: boss.x + 12,
    right: boss.x + boss.width - 12,
    top: game.clientHeight - boss.yBottom - boss.height + 10,
    bottom: game.clientHeight - boss.yBottom - 8
  };

  if (collides(playerRect, bossRect)) {
    hitPlayer();
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const bulletRect = {
      left: bullet.x,
      right: bullet.x + bullet.width,
      top: game.clientHeight - bullet.y - bullet.height,
      bottom: game.clientHeight - bullet.y
    };

    if (collides(bulletRect, bossRect)) {
      bullet.el.remove();
      bullets.splice(i, 1);
      boss.health -= 1;
      updateBossBar();
      beep(320, 60, "square", 0.03);

      if (boss.health <= 0) {
        score += 25;
        scoreEl.textContent = score;
        boss.el.remove();
        boss = null;
        bossActive = false;
        bossStatusEl.textContent = "NO";
        bossBarWrap.classList.add("hidden");
        beep(880, 120, "triangle", 0.04);
      }
    }
  }
}

function updateBossProjectiles() {
  const playerRect = getPlayerRect();

  for (let i = bossProjectiles.length - 1; i >= 0; i--) {
    const p = bossProjectiles[i];
    p.x -= p.speedX;
    p.el.style.left = p.x + "px";

    if (collides(playerRect, getRect(p))) {
      p.el.remove();
      bossProjectiles.splice(i, 1);
      hitPlayer();
      continue;
    }

    if (p.x + p.width < 0) {
      p.el.remove();
      bossProjectiles.splice(i, 1);
    }
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.x += 10;
    bullet.el.style.left = bullet.x + "px";

    let hit = false;

    for (let j = obstacles.length - 1; j >= 0; j--) {
      const obs = obstacles[j];
      const bulletRect = {
        left: bullet.x,
        right: bullet.x + bullet.width,
        top: game.clientHeight - bullet.y - bullet.height,
        bottom: game.clientHeight - bullet.y
      };

      if (collides(bulletRect, getRect(obs))) {
        obs.el.remove();
        bullet.el.remove();
        obstacles.splice(j, 1);
        bullets.splice(i, 1);
        score += obs.points + 1;
        scoreEl.textContent = score;
        beep(300, 70, "square", 0.03);
        hit = true;
        break;
      }
    }

    if (hit) continue;

    if (bullet.x > game.clientWidth + 30) {
      bullet.el.remove();
      bullets.splice(i, 1);
    }
  }
}

function increaseLevel() {
  level++;
  levelEl.textContent = level;
  obstacleSpeed += 1.15;
  obstacleSpawnRate = Math.max(650, obstacleSpawnRate - 120);
  coinSpawnRate = Math.max(1000, coinSpawnRate - 75);
  powerupSpawnRate = Math.max(5200, powerupSpawnRate - 220);
  bossSpawnedThisLevel = false;
  beep(660, 100, "triangle", 0.03);
}

function updateShield(deltaTime) {
  if (!shieldActive) return;
  shieldTimeLeft -= deltaTime;
  if (shieldTimeLeft <= 0) {
    shieldActive = false;
    shieldTimeLeft = 0;
    shieldRing.classList.add("hidden");
    shieldStatusEl.textContent = "OFF";
  }
}

function updateTimers(deltaTime) {
  timerTick += deltaTime;
  levelTick += deltaTime;

  if (timerTick >= 1000) {
    elapsedTime++;
    timeEl.textContent = elapsedTime;
    timerTick = 0;
  }

  if (levelTick >= 30000) {
    increaseLevel();
    levelTick = 0;
  }

  if (invincibleTime > 0) {
    invincibleTime -= deltaTime;
    if (invincibleTime < 0) invincibleTime = 0;
  }
}

function maybeSpawnBoss() {
  if (!bossActive && !bossSpawnedThisLevel && level > 0 && level % 3 === 0) {
    spawnBoss();
  }
}

function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("spaceRunnerHighScore", String(highScore));
    highScoreEl.textContent = highScore;
  }
}

function endGame() {
  gameOver = true;
  gameStarted = false;
  paused = false;
  player.classList.remove("running");
  saveHighScore();

  gameOverText.innerHTML = `
    ${playerName || "Player"}, Game Over!<br>
    Final Score: ${score}<br>
    Coins This Run: ${coins}<br>
    Total Coins: ${totalCoins}<br>
    Level: ${level}<br>
    High Score: ${highScore}
  `;

  gameOverScreen.classList.remove("hidden");
  pauseScreen.classList.add("hidden");
  beep(150, 220, "sawtooth", 0.05);
}

function gameLoop(timestamp) {
  if (!gameStarted || gameOver || paused) return;

  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  updatePlayer();
  updateSkyline(deltaTime);
  updateObstacles();
  updateCoins();
  updatePowerups();
  updateBullets();
  updateBoss(deltaTime);
  updateBossProjectiles();
  updateShield(deltaTime);
  updateTimers(deltaTime);

  if (!bossActive) {
    if (timestamp - lastSpawnTime > obstacleSpawnRate) {
      createObstacle();
      lastSpawnTime = timestamp;
    }
  }

  if (timestamp - lastCoinSpawnTime > coinSpawnRate) {
    createCoin();
    lastCoinSpawnTime = timestamp;
  }

  if (timestamp - lastPowerupSpawnTime > powerupSpawnRate) {
    createPowerup();
    lastPowerupSpawnTime = timestamp;
  }

  maybeSpawnBoss();

  requestAnimationFrame(gameLoop);
}

function createBuildingElement(x, width, height, tower = false) {
  const b = document.createElement("div");
  b.className = "building" + (tower ? " tower" : "");
  b.style.width = width + "px";
  b.style.height = height + "px";
  b.style.left = x + "px";

  if (tower) {
    const light = document.createElement("div");
    light.className = "tower-light";
    b.appendChild(light);
  }

  return b;
}

function fillSkyline(layerEl, items, config) {
  layerEl.innerHTML = "";
  items.length = 0;

  let x = 0;
  const totalWidth = game.clientWidth * 2.2;

  while (x < totalWidth) {
    const width = config.minWidth + Math.random() * (config.maxWidth - config.minWidth);
    const isTall = Math.random() < config.tallChance;
    const height = isTall
      ? config.tallMin + Math.random() * (config.tallMax - config.tallMin)
      : config.shortMin + Math.random() * (config.shortMax - config.shortMin);

    const tower = isTall && Math.random() < 0.35;

    const building = createBuildingElement(x, width, height, tower);
    layerEl.appendChild(building);

    items.push({
      el: building,
      x: x,
      width: width,
      height: height,
      speed: config.speed
    });

    x += width + config.gapMin + Math.random() * (config.gapMax - config.gapMin);
  }
}

function initSkyline() {
  fillSkyline(skylineBack, skylineBackItems, {
    minWidth: 24,
    maxWidth: 62,
    shortMin: 70,
    shortMax: 150,
    tallMin: 180,
    tallMax: 280,
    tallChance: 0.42,
    gapMin: 4,
    gapMax: 12,
    speed: 0.55
  });

  fillSkyline(skylineFront, skylineFrontItems, {
    minWidth: 28,
    maxWidth: 78,
    shortMin: 100,
    shortMax: 190,
    tallMin: 220,
    tallMax: 330,
    tallChance: 0.48,
    gapMin: 4,
    gapMax: 10,
    speed: 1.05
  });
}

function recycleBuilding(items, layerEl, config) {
  let maxX = 0;
  for (const item of items) {
    const right = item.x + item.width;
    if (right > maxX) maxX = right;
  }

  const width = config.minWidth + Math.random() * (config.maxWidth - config.minWidth);
  const isTall = Math.random() < config.tallChance;
  const height = isTall
    ? config.tallMin + Math.random() * (config.tallMax - config.tallMin)
    : config.shortMin + Math.random() * (config.shortMax - config.shortMin);

  const tower = isTall && Math.random() < 0.35;
  const newX = maxX + config.gapMin + Math.random() * (config.gapMax - config.gapMin);

  const el = createBuildingElement(newX, width, height, tower);
  layerEl.appendChild(el);

  items.push({
    el,
    x: newX,
    width,
    height,
    speed: config.speed
  });
}

function updateSkyline(deltaTime) {
  const backConfig = {
    minWidth: 24,
    maxWidth: 62,
    shortMin: 70,
    shortMax: 150,
    tallMin: 180,
    tallMax: 280,
    tallChance: 0.42,
    gapMin: 4,
    gapMax: 12,
    speed: 0.55
  };

  const frontConfig = {
    minWidth: 28,
    maxWidth: 78,
    shortMin: 100,
    shortMax: 190,
    tallMin: 220,
    tallMax: 330,
    tallChance: 0.48,
    gapMin: 4,
    gapMax: 10,
    speed: 1.05
  };

  const scale = deltaTime / 16.67;

  for (let i = skylineBackItems.length - 1; i >= 0; i--) {
    const item = skylineBackItems[i];
    item.x -= item.speed * scale;
    item.el.style.left = item.x + "px";

    if (item.x + item.width < 0) {
      item.el.remove();
      skylineBackItems.splice(i, 1);
      recycleBuilding(skylineBackItems, skylineBack, backConfig);
    }
  }

  for (let i = skylineFrontItems.length - 1; i >= 0; i--) {
    const item = skylineFrontItems[i];
    item.x -= item.speed * scale;
    item.el.style.left = item.x + "px";

    if (item.x + item.width < 0) {
      item.el.remove();
      skylineFrontItems.splice(i, 1);
      recycleBuilding(skylineFrontItems, skylineFront, frontConfig);
    }
  }
}

function toggleSound() {
  soundOn = !soundOn;
  localStorage.setItem("spaceRunnerSound", soundOn ? "on" : "off");
  soundBtn.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
}

function addTap(el, handler) {
  let touched = false;

  el.addEventListener("touchend", function(e) {
    e.preventDefault();
    touched = true;
    handler();
    setTimeout(() => {
      touched = false;
    }, 250);
  }, false);

  el.addEventListener("click", function(e) {
    if (touched) return;
    e.preventDefault();
    handler();
  }, false);
}

addTap(startBtn, finishSetup);
addTap(restartBtn, function() {
  resetGame();
  startGame();
});
addTap(soundBtn, toggleSound);
addTap(pauseBtn, pauseGame);
addTap(resumeBtn, resumeGame);
addTap(installHelpBtn, showInstallHelp);
addTap(closeInstallHelpBtn, hideInstallHelp);

addTap(jumpBtn, function() {
  ensureAudio();
  if (!gameStarted && !paused) startGame();
  if (!paused) jump();
});

addTap(shootBtn, function() {
  ensureAudio();
  if (!gameStarted && !paused) startGame();
  if (!paused) shoot();
});

playerNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") finishSetup();
});

document.body.addEventListener("touchstart", function() {}, { passive: true });

window.addEventListener("resize", initSkyline);

player.style.bottom = playerBottom + "px";
setLivesDisplay();
initSkyline();
maybeAutoSkipSetup();

if (isIOS()) {
  installBtn.classList.add("hidden");
}