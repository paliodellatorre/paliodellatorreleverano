(() => {
  const RIONI = [
    "Centro",
    "Chianca",
    "Consolazione",
    "Iana",
    "Patula Cupa - Quartararu",
    "Pozzolungo Nord",
    "Pozzolungo Sud",
    "Zita Rosa"
  ];

  const startPanel = document.getElementById("pdtStartPanel");
  const gamePanel = document.getElementById("pdtGamePanel");
  const endPanel = document.getElementById("pdtEndPanel");
  const startBtn = document.getElementById("pdtStartBtn");
  const restartBtn = document.getElementById("pdtRestartBtn");
  const shareBtn = document.getElementById("pdtShareBtn");
  const jumpBtn = document.getElementById("pdtJumpBtn");
  const errorBox = document.getElementById("pdtStartError");
  const nicknameInput = document.getElementById("pdtNickname");
  const rioneSelect = document.getElementById("pdtRione");
  const canvas = document.getElementById("pdtCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("pdtScore");
  const coinsEl = document.getElementById("pdtCoins");
  const levelEl = document.getElementById("pdtLevel");
  const leaderboardEl = document.getElementById("pdtLeaderboard");
  const finalText = document.getElementById("pdtFinalText");

  let nickname = "";
  let rione = "";
  let running = false;
  let saved = false;
  let animationId = null;
  let lastTime = 0;
  let score = 0;
  let coins = 0;
  let levelIndex = 0;
  let cameraY = 0;

  const frog = {
    x: 210,
    y: 520,
    r: 22,
    vx: 0,
    vy: 0,
    onPlatform: false
  };

  let platforms = [];
  let coinItems = [];

  function resizeCanvasForDisplay() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, Math.floor(rect.width * dpr));
    const height = Math.max(440, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function makePlatform(x, y, w, level) {
    return {
      x,
      y,
      w,
      h: 18,
      level
    };
  }

  function resetGame() {
    resizeCanvasForDisplay();
    const w = canvas.width;
    const h = canvas.height;

    running = true;
    saved = false;
    lastTime = performance.now();
    score = 0;
    coins = 0;
    levelIndex = 0;
    cameraY = 0;

    frog.x = w / 2;
    frog.y = h - 92;
    frog.vx = 0;
    frog.vy = -8;
    frog.r = Math.max(18, Math.min(26, w * 0.055));

    platforms = [];
    coinItems = [];

    platforms.push(makePlatform(w / 2 - 70, h - 55, 140, 0));

    let y = h - 145;
    for (let i = 1; i <= 85; i++) {
      const lvl = Math.min(7, Math.floor(i / 10));
      const pw = Math.max(72, 122 - lvl * 6);
      const x = rand(25, w - pw - 25);
      platforms.push(makePlatform(x, y, pw, lvl));

      if (i % 2 === 0) {
        coinItems.push({
          x: x + pw / 2,
          y: y - 38,
          r: 10,
          taken: false
        });
      }

      y -= rand(68, 92);
    }

    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = Math.floor(score);
    coinsEl.textContent = coins;
    levelEl.textContent = RIONI[levelIndex] || RIONI[7];
  }

  function jump() {
    if (!running) return;
    frog.vy = -12.5 - levelIndex * 0.18;
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function drawBackground(w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#8bdcff");
    sky.addColorStop(0.55, "#dff7ff");
    sky.addColorStop(1, "#d9f99d");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      const cx = (i * 130 + (cameraY * 0.08)) % (w + 150) - 80;
      const cy = 60 + i * 48;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 45, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 36, cy + 2, 35, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFrog(x, y, r) {
    ctx.save();

    // body
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.10, r * 0.95, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();

    // belly
    ctx.fillStyle = "#bbf7d0";
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.28, r * 0.48, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    // eyes
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(x - r * 0.45, y - r * 0.55, r * 0.34, 0, Math.PI * 2);
    ctx.arc(x + r * 0.45, y - r * 0.55, r * 0.34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x - r * 0.45, y - r * 0.57, r * 0.22, 0, Math.PI * 2);
    ctx.arc(x + r * 0.45, y - r * 0.57, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(x - r * 0.43, y - r * 0.56, r * 0.10, 0, Math.PI * 2);
    ctx.arc(x + r * 0.43, y - r * 0.56, r * 0.10, 0, Math.PI * 2);
    ctx.fill();

    // smile
    ctx.strokeStyle = "#064e3b";
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath();
    ctx.arc(x, y - r * 0.05, r * 0.35, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  function drawCoin(x, y, r) {
    ctx.save();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#fff7ad";
    ctx.font = `${r * 1.2}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", x, y + 1);
    ctx.restore();
  }

  function update(dt) {
    const w = canvas.width;
    const h = canvas.height;

    const gravity = 0.42 + levelIndex * 0.018;
    frog.vy += gravity;
    frog.y += frog.vy;
    frog.x += frog.vx;

    if (frog.x < -frog.r) frog.x = w + frog.r;
    if (frog.x > w + frog.r) frog.x = -frog.r;

    // simple auto side drift to make it playable on mobile
    frog.vx = Math.sin(performance.now() / 650) * (2.2 + levelIndex * 0.12);

    // camera follows frog upward
    const targetY = h * 0.42;
    if (frog.y < targetY) {
      const diff = targetY - frog.y;
      frog.y = targetY;
      cameraY += diff;
      platforms.forEach(p => p.y += diff);
      coinItems.forEach(c => c.y += diff);
      score += diff * 0.18;
    }

    // platform collision
    platforms.forEach(p => {
      if (
        frog.vy > 0 &&
        frog.x + frog.r * 0.65 > p.x &&
        frog.x - frog.r * 0.65 < p.x + p.w &&
        frog.y + frog.r > p.y &&
        frog.y + frog.r < p.y + p.h + frog.vy + 8
      ) {
        frog.y = p.y - frog.r;
        jump();
        const newLevel = Math.min(7, p.level);
        if (newLevel > levelIndex) levelIndex = newLevel;
      }
    });

    // coins
    coinItems.forEach(c => {
      if (!c.taken) {
        const dx = frog.x - c.x;
        const dy = frog.y - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < frog.r + c.r + 6) {
          c.taken = true;
          coins += 1;
          score += 80;
        }
      }
    });

    if (frog.y > h + 80) {
      endGame();
    }

    updateHud();
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;

    drawBackground(w, h);

    platforms.forEach(p => {
      if (p.y < -40 || p.y > h + 40) return;
      ctx.fillStyle = "#64748b";
      drawRoundedRect(p.x, p.y, p.w, p.h, 12);
      ctx.fillStyle = "#94a3b8";
      drawRoundedRect(p.x + 6, p.y + 3, p.w - 12, 5, 5);
      ctx.fillStyle = "rgba(0,49,41,.18)";
      ctx.fillRect(p.x + 8, p.y + p.h, p.w - 16, 4);
    });

    coinItems.forEach(c => {
      if (!c.taken && c.y > -30 && c.y < h + 30) drawCoin(c.x, c.y, c.r);
    });

    // level banner
    ctx.fillStyle = "rgba(0,49,41,.78)";
    ctx.fillRect(0, 0, w, 38);
    ctx.fillStyle = "#FCBD16";
    ctx.font = `bold ${Math.max(16, w * 0.04)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`Livello ${levelIndex + 1}/8 · ${RIONI[levelIndex]}`, w / 2, 19);

    drawFrog(frog.x, frog.y, frog.r);
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(32, now - lastTime);
    lastTime = now;
    update(dt);
    draw();
    animationId = requestAnimationFrame(loop);
  }

  async function saveScore() {
    if (saved) return;
    saved = true;

    try {
      const res = await fetch("/api/pdt-jump/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          rione,
          score: Math.floor(score),
          coins,
          level_reached: levelIndex + 1
        })
      });

      const data = await res.json();
      if (data && data.ok) renderLeaderboard(data.leaderboard || []);
    } catch (e) {}
  }

  function renderLeaderboard(rows) {
    if (!leaderboardEl) return;
    if (!rows.length) {
      leaderboardEl.innerHTML = `<li class="empty">Ancora nessun punteggio. Inizia tu!</li>`;
      return;
    }

    leaderboardEl.innerHTML = rows.map(row => `
      <li>
        <span>
          <strong>${escapeHtml(row.nickname)}</strong>
          <small>${escapeHtml(row.rione)}</small>
        </span>
        <b>${Number(row.score || 0)}</b>
      </li>
    `).join("");
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, s => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[s]));
  }

  async function refreshLeaderboard() {
    try {
      const res = await fetch("/api/pdt-jump/leaderboard");
      const data = await res.json();
      if (data && data.ok) renderLeaderboard(data.leaderboard || []);
    } catch (e) {}
  }

  function endGame() {
    running = false;
    cancelAnimationFrame(animationId);
    gamePanel.style.display = "none";
    endPanel.style.display = "block";
    finalText.innerHTML = `Hai fatto <strong>${Math.floor(score)}</strong> punti e raccolto <strong>${coins}</strong> coin.<br>Livello raggiunto: <strong>${levelIndex + 1}/8 · ${RIONI[levelIndex]}</strong>`;
    saveScore();
  }

  function startGame() {
    nickname = nicknameInput.value.trim();
    rione = rioneSelect.value.trim();

    if (!nickname || !rione) {
      errorBox.textContent = "Inserisci nickname e rione per iniziare.";
      return;
    }

    errorBox.textContent = "";
    startPanel.style.display = "none";
    endPanel.style.display = "none";
    gamePanel.style.display = "block";

    resetGame();
    animationId = requestAnimationFrame(loop);
  }

  function shareResult() {
    const text = `Ho fatto ${Math.floor(score)} punti su PDT JUMP 🐸🏆\nRione: ${rione}\nRiesci a superarmi?\nGioca anche tu sul sito del Palio della Torre Leverano!`;
    const shareData = {
      title: "PDT JUMP",
      text,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${text}\n${window.location.href}`);
      alert("Risultato copiato. Puoi incollarlo su WhatsApp o sui social.");
    }
  }

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", () => {
    endPanel.style.display = "none";
    startPanel.style.display = "block";
    refreshLeaderboard();
  });
  shareBtn.addEventListener("click", shareResult);
  jumpBtn.addEventListener("click", jump);
  canvas.addEventListener("pointerdown", jump);
  window.addEventListener("keydown", e => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      jump();
    }
  });
  window.addEventListener("resize", () => {
    if (running) resizeCanvasForDisplay();
  });

  refreshLeaderboard();
})();
