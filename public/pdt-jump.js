(() => {
  const PLAYER_KEY = "pdt_jump_player_v1";

  const startPanel = document.getElementById("pdtStartPanel");
  const endPanel = document.getElementById("pdtEndPanel");
  const startBtn = document.getElementById("pdtStartBtn");
  const restartBtn = document.getElementById("pdtRestartBtn");
  const shareBtn = document.getElementById("pdtShareBtn");
  const errorBox = document.getElementById("pdtStartError");
  const nicknameInput = document.getElementById("pdtNickname");
  const rioneSelect = document.getElementById("pdtRione");
  const playerForm = document.getElementById("pdtPlayerForm");
  const lockedBox = document.getElementById("pdtLockedPlayer");
  const introText = document.getElementById("pdtIntroText");

  const overlay = document.getElementById("pdtGameOverlay");
  const canvas = document.getElementById("pdtCanvas");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("pdtScore");
  const coinsEl = document.getElementById("pdtCoins");
  const leaderboardEl = document.getElementById("pdtLeaderboard");
  const finalText = document.getElementById("pdtFinalText");

  let nickname = "";
  let rione = "";
  let running = false;
  let gameOver = false;
  let score = 0;
  let coins = 0;
  let cameraY = 0;
  let lastTime = 0;
  let platforms = [];
  let coinItems = [];
  let targetX = null;
  let highest = 0;

  const frog = {
    x: 210,
    y: 560,
    w: 44,
    h: 44,
    vx: 0,
    vy: 0
  };

  function loadLockedPlayer() {
    try {
      const saved = JSON.parse(localStorage.getItem(PLAYER_KEY) || "null");
      if (saved && saved.nickname && saved.rione) {
        nickname = saved.nickname;
        rione = saved.rione;
        playerForm.style.display = "none";
        lockedBox.style.display = "block";
        lockedBox.innerHTML = `Giocatore: <strong>${escapeHtml(nickname)}</strong><br>Rione: <strong>${escapeHtml(rione)}</strong>`;
        introText.textContent = "Giocatore già registrato su questo dispositivo.";
      }
    } catch (e) {}
  }

  function saveLockedPlayer() {
    localStorage.setItem(PLAYER_KEY, JSON.stringify({ nickname, rione }));
  }

  function setupCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function W() { return canvas.getBoundingClientRect().width; }
  function H() { return canvas.getBoundingClientRect().height; }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function addPlatform(worldY, center = false) {
    const width = W();
    const platformW = rand(92, 142);
    const x = center ? width / 2 - platformW / 2 : rand(12, Math.max(14, width - platformW - 12));
    const p = { x, y: worldY, w: platformW, h: 18, type: Math.random() > 0.86 ? "gold" : "stone" };
    platforms.push(p);

    if (!center && Math.random() > 0.38) {
      coinItems.push({
        x: x + platformW / 2,
        y: worldY - 34,
        r: 10,
        taken: false
      });
    }
  }

  function resetGame() {
    setupCanvasSize();

    const width = W();
    const height = H();

    score = 0;
    coins = 0;
    cameraY = 0;
    highest = 0;
    lastTime = 0;
    gameOver = false;
    running = true;
    targetX = width / 2;

    frog.x = width / 2 - frog.w / 2;
    frog.y = height - 110;
    frog.vx = 0;
    frog.vy = 0;

    platforms = [];
    coinItems = [];

    const baseY = height - 55;
    addPlatform(baseY, true);

    let y = baseY - 82;
    for (let i = 0; i < 40; i++) {
      addPlatform(y);
      y -= rand(78, 102);
    }

    scoreEl.textContent = "0";
    coinsEl.textContent = "0";
  }

  function setTargetFromClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const half = rect.left + rect.width / 2;

    if (clientX < half) {
      targetX = Math.max(8, frog.x - 105);
    } else {
      targetX = Math.min(W() - frog.w - 8, frog.x + 105);
    }
  }

  function pointerHandler(e) {
    e.preventDefault();
    setTargetFromClientX(e.clientX);
  }

  canvas.addEventListener("pointerdown", pointerHandler, { passive: false });
  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons) pointerHandler(e);
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (!running) return;
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
      targetX = Math.max(8, frog.x - 105);
    }
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
      targetX = Math.min(W() - frog.w - 8, frog.x + 105);
    }
  });

  window.addEventListener("resize", () => {
    if (running) setupCanvasSize();
  });

  function physics(dt) {
    const width = W();
    const height = H();

    const desiredX = targetX ?? frog.x;
    const dx = desiredX - frog.x;
    frog.vx += dx * 0.045;
    frog.vx *= 0.78;
    frog.vx = Math.max(-8, Math.min(8, frog.vx));
    frog.x += frog.vx;

    frog.vy += 0.52;
    frog.y += frog.vy;

    if (frog.x < -frog.w) frog.x = width;
    if (frog.x > width) frog.x = -frog.w;

    // La rana salta automaticamente SOLO quando atterra su una pietra.
    for (const p of platforms) {
      const falling = frog.vy > 0;
      const feetBefore = frog.y + frog.h - frog.vy;
      const feetNow = frog.y + frog.h;
      const overlapX = frog.x + frog.w > p.x && frog.x < p.x + p.w;

      if (falling && overlapX && feetBefore <= p.y + 6 && feetNow >= p.y && feetNow <= p.y + p.h + 16) {
        frog.y = p.y - frog.h;
        frog.vy = -12.6; // salto controllato, non razzo
        if (p.type === "gold") score += 10;
      }
    }

    const screenY = frog.y - cameraY;
    if (screenY < height * 0.42) {
      cameraY = frog.y - height * 0.42;
    }

    highest = Math.max(highest, Math.floor(Math.max(0, -cameraY) / 2));
    score = highest + coins * 40;

    let top = Math.min(...platforms.map(p => p.y));
    while (top - cameraY > -180) {
      addPlatform(top - rand(78, 106));
      top = Math.min(...platforms.map(p => p.y));
    }

    platforms = platforms.filter(p => p.y - cameraY < height + 180);
    coinItems = coinItems.filter(c => !c.taken && c.y - cameraY < height + 180);

    for (const c of coinItems) {
      const cx = c.x;
      const cy = c.y;
      const fx = frog.x + frog.w / 2;
      const fy = frog.y + frog.h / 2;
      const d = Math.hypot(fx - cx, fy - cy);
      if (d < 32) {
        c.taken = true;
        coins += 1;
        score += 40;
      }
    }

    if (frog.y - cameraY > height + 90) {
      endGame();
    }

    scoreEl.textContent = String(score);
    coinsEl.textContent = String(coins);
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  function draw() {
    const width = W();
    const height = H();

    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#083c2f");
    bg.addColorStop(0.35, "#0b6b4d");
    bg.addColorStop(1, "#bde77e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#FCBD16";
    for (let i = 0; i < 9; i++) {
      const x = (i * 97 + 35) % width;
      const y = (i * 141 + (-cameraY * 0.22)) % height;
      ctx.beginPath();
      ctx.arc(x, y, 16 + (i % 3) * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of platforms) {
      const y = p.y - cameraY;
      if (y < -50 || y > height + 60) continue;

      ctx.fillStyle = p.type === "gold" ? "#FCBD16" : "#e5e7eb";
      roundedRect(p.x, y, p.w, p.h, 10);
      ctx.strokeStyle = "#003129";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "rgba(0,49,41,.20)";
      roundedRect(p.x + 5, y + p.h - 4, p.w - 10, 5, 6);
    }

    for (const c of coinItems) {
      if (c.taken) continue;
      const y = c.y - cameraY;
      if (y < -40 || y > height + 40) continue;

      ctx.fillStyle = "#FCBD16";
      ctx.beginPath();
      ctx.arc(c.x, y, c.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#7c4a03";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fff8c5";
      ctx.beginPath();
      ctx.arc(c.x - 3, y - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const fx = frog.x;
    const fy = frog.y - cameraY;

    ctx.save();
    ctx.translate(fx + frog.w / 2, fy + frog.h / 2);

    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.ellipse(0, 5, 23, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(0, -8, 21, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-8, -17, 6, 0, Math.PI * 2);
    ctx.arc(8, -17, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#003129";
    ctx.beginPath();
    ctx.arc(-8, -17, 2.6, 0, Math.PI * 2);
    ctx.arc(8, -17, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#003129";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -7, 8, 0.12, Math.PI - 0.12);
    ctx.stroke();

    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.ellipse(-21, 13, 10, 6, -0.5, 0, Math.PI * 2);
    ctx.ellipse(21, 13, 10, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,.88)";
    ctx.font = "900 15px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SINISTRA  ←     →  DESTRA", width / 2, height - 24);
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min((ts - lastTime) / 1000 || 0.016, 0.033);
    lastTime = ts;

    physics(dt);
    draw();

    if (!gameOver) requestAnimationFrame(loop);
  }

  async function endGame() {
    if (gameOver) return;
    gameOver = true;
    running = false;
    overlay.style.display = "none";
    document.body.style.overflow = "";

    finalText.textContent = `${nickname}, hai fatto ${score} punti e raccolto ${coins} coin per il rione ${rione}.`;
    startPanel.style.display = "none";
    endPanel.style.display = "block";

    try {
      const res = await fetch("/api/pdt-jump/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, rione, score, coins, level_reached: 1 })
      });
      const data = await res.json();
      if (data.ok) renderLeaderboard(data.leaderboard);
    } catch (e) {}
  }

  function renderLeaderboard(rows) {
    if (!leaderboardEl) return;

    if (!rows || !rows.length) {
      leaderboardEl.innerHTML = `<li class="empty">Ancora nessun punteggio. Inizia tu!</li>`;
      return;
    }

    leaderboardEl.innerHTML = rows.map((row) => `
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
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }

  async function loadLeaderboard() {
    try {
      const res = await fetch("/api/pdt-jump/leaderboard");
      const data = await res.json();
      if (data.ok) renderLeaderboard(data.leaderboard);
    } catch (e) {}
  }

  function startGame() {
    if (!nickname || !rione) {
      nickname = nicknameInput.value.trim();
      rione = rioneSelect.value.trim();

      if (!nickname || !rione) {
        errorBox.textContent = "Inserisci nickname e rione per iniziare.";
        return;
      }

      saveLockedPlayer();
      loadLockedPlayer();
    }

    errorBox.textContent = "";
    startPanel.style.display = "none";
    endPanel.style.display = "none";

    overlay.style.display = "block";
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      resetGame();
      requestAnimationFrame(loop);
    }, 80);
  }

  async function shareScore() {
    const text = `Ho fatto ${score} punti su PDT JUMP 🐸🏆\nRione: ${rione}\nRiesci a superarmi?\nGioca anche tu sul sito del Palio della Torre!`;
    const shareData = {
      title: "PDT JUMP",
      text,
      url: window.location.origin + "/gioco"
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${shareData.url}`);
        alert("Risultato copiato. Ora puoi incollarlo su WhatsApp o social.");
      } catch (e) {
        alert(text);
      }
    }
  }

  startBtn?.addEventListener("click", startGame);
  restartBtn?.addEventListener("click", () => {
    endPanel.style.display = "none";
    startPanel.style.display = "block";
  });
  shareBtn?.addEventListener("click", shareScore);

  loadLockedPlayer();
  loadLeaderboard();
})();
