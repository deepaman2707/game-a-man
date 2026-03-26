const game = document.getElementById("game");
const player = document.getElementById("player");
const playerImg = document.getElementById("playerImg");
const previewImg = document.getElementById("previewImg");
const previewPlaceholder = document.getElementById("previewPlaceholder");

const playerNameInput = document.getElementById("playerNameInput");
const playerNameDisplay = document.getElementById("playerNameDisplay");
const photoInput = document.getElementById("photoInput");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const jumpBtn = document.getElementById("jumpBtn");
const shootBtn = document.getElementById("shootBtn");

const setupScreen = document.getElementById("setupScreen");
const startMessage = document.getElementById("startMessage");
const gameOverScreen = document.getElementById("gameOverScreen");
const gameOverText = document.getElementById("gameOverText");

const scoreEl = document.getElementById("score");

let setupDone = false;
let gameStarted = false;
let gameOver = false;

let playerName = "Player";
let playerBottom = 80;
let isJumping = false;
let velocityY = 0;
let gravity = 0.8;

let score = 0;
let obstacleSpeed = 6;

let obstacles = [];
let bullets = [];

let lastSpawnTime = 0;
let lastTime = 0;

photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    playerImg.src = event.target.result;
    previewImg.src = event.target.result;
    previewImg.style.display = "block";
    previewPlaceholder.style.display = "none";
  };
  reader.readAsDataURL(file);
});

function finishSetup() {
  playerName = playerNameInput.value.trim() || "Player";
  playerNameDisplay.textContent = playerName;

  if (!playerImg.src) {
    playerImg.src =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
          <rect width="100" height="100" fill="#111827"/>
          <circle cx="50" cy="50" r="30" fill="#6cf0ff"/>
        </svg>
      `);
  }

  setupDone = true;
  setupScreen.classList.add("hidden");
  startMessage.classList.remove("hidden");
}

function startGame() {
  if (!setupDone) return;
  gameStarted = true;
  gameOver = false;
  startMessage.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function resetGame() {
  obstacles.forEach(o => o.el.remove());
  bullets.forEach(b => b.el.remove());
  obstacles = [];
  bullets = [];

  score = 0;
  scoreEl.textContent = score;

  gameStarted = false;
  gameOver = false;
  playerBottom = 80;
  velocityY = 0;
  isJumping = false;
  player.style.bottom = playerBottom + "px";

  startMessage.classList.remove("hidden");
  gameOverScreen.classList.add("hidden");
}

function jump() {
  if (!isJumping && !gameOver) {
    isJumping = true;
    velocityY = 15;
  }
}

function shoot() {
  if (!gameStarted || gameOver) return;

  const bullet = document.createElement("div");
  bullet.className = "bullet";
  bullet.style.left = "128px";
  bullet.style.bottom = (playerBottom + 28) + "px";
  game.appendChild(bullet);

  bullets.push({
    el: bullet,
    x: 128,
    y: playerBottom + 28,
    width: 16,
    height: 6
  });
}

function createObstacle() {
  const obstacle = document.createElement("div");
  obstacle.className = "obstacle";
  obstacle.style.left = game.clientWidth + "px";
  obstacle.style.bottom = "80px";
  game.appendChild(obstacle);

  obstacles.push({
    el: obstacle,
    x: game.clientWidth,
    width: 36,
    height: 36,
    bottom: 80
  });
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

    player.style.bottom = playerBottom + "px";
  }
}

function getPlayerRect() {
  return {
    left: 60,
    right: 124,
    top: window.innerHeight - playerBottom - 64,
    bottom: window.innerHeight - playerBottom
  };
}

function getRect(item) {
  return {
    left: item.x,
    right: item.x + item.width,
    top: window.innerHeight - item.bottom - item.height,
    bottom: window.innerHeight - item.bottom
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

function updateObstacles() {
  const playerRect = getPlayerRect();

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= obstacleSpeed;
    obs.el.style.left = obs.x + "px";

    if (collides(playerRect, getRect(obs))) {
      endGame();
      return;
    }

    if (obs.x + obs.width < 0) {
      obs.el.remove();
      obstacles.splice(i, 1);
      score++;
      scoreEl.textContent = score;
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
        top: window.innerHeight - bullet.y - bullet.height,
        bottom: window.innerHeight - bullet.y
      };

      if (collides(bulletRect, getRect(obs))) {
        obs.el.remove();
        bullet.el.remove();
        obstacles.splice(j, 1);
        bullets.splice(i, 1);
        score += 2;
        scoreEl.textContent = score;
        hit = true;
        break;
      }
    }

    if (hit) continue;

    if (bullet.x > game.clientWidth + 20) {
      bullet.el.remove();
      bullets.splice(i, 1);
    }
  }
}

function endGame() {
  gameOver = true;
  gameStarted = false;
  gameOverText.textContent = `${playerName}, Game Over! Final Score: ${score}`;
  gameOverScreen.classList.remove("hidden");
}

function gameLoop(timestamp) {
  if (!gameStarted || gameOver) return;

  updatePlayer();
  updateObstacles();
  updateBullets();

  if (timestamp - lastSpawnTime > 1600) {
    createObstacle();
    lastSpawnTime = timestamp;
  }

  requestAnimationFrame(gameLoop);
}

function addTap(el, handler) {
  let touched = false;

  el.addEventListener("touchend", function(e) {
    e.preventDefault();
    touched = true;
    handler();
    setTimeout(() => touched = false, 300);
  }, false);

  el.addEventListener("click", function(e) {
    if (touched) return;
    e.preventDefault();
    handler();
  }, false);
}

addTap(startBtn, finishSetup);
addTap(restartBtn, resetGame);
addTap(jumpBtn, function() {
  if (!gameStarted) startGame();
  jump();
});
addTap(shootBtn, function() {
  if (!gameStarted) startGame();
  shoot();
});

playerNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") finishSetup();
});

document.body.addEventListener("touchstart", function() {}, { passive: true });

player.style.bottom = playerBottom + "px";