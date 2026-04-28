
/* public/pdt-jump.js - fix controlli sinistra/destra + reset player */

const PLAYER_KEY = "pdt_jump_player_v1";

// reset registrazione locale una sola volta
const RESET_PLAYER_KEY = "pdt_reset_player_v2";

if (localStorage.getItem(RESET_PLAYER_KEY) !== "done") {
  localStorage.removeItem(PLAYER_KEY);
  localStorage.setItem(RESET_PLAYER_KEY, "done");
}

const canvas = document.getElementById("pdtCanvas");
const ctx = canvas.getContext("2d");

let frogX = canvas.width / 2;
let speed = 6;

// CLICK / TOUCH SINISTRA DESTRA
function handleMove(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

  if (x < rect.width / 2) {
    frogX -= speed;
  } else {
    frogX += speed;
  }
}

canvas.addEventListener("click", handleMove);
canvas.addEventListener("touchstart", handleMove);

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(frogX, canvas.height / 2, 30, 0, Math.PI * 2);
  ctx.fill();

  requestAnimationFrame(loop);
}

loop();
