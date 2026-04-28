(() => {
  const startPanel = document.getElementById("pdtStartPanel");
  const gamePanel = document.getElementById("pdtGamePanel");
  const endPanel = document.getElementById("pdtEndPanel");
  const startBtn = document.getElementById("pdtStartBtn");
  const restartBtn = document.getElementById("pdtRestartBtn");
  const shareBtn = document.getElementById("pdtShareBtn");
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
  let gameOver = false;
  let score = 0;
  let coins = 0;
  let cameraY = 0;
  let lastTime = 0;
  let platforms = [];
  let coinItems = [];
  let keys = { left: false, right: false };
  let autoJumpCooldown = 0;
  let speedScale = 1;

  const frog = {
    x: 210,
    y: 560,
    w: 42,
    h: 42,
    vx: 0,
    vy: -12,
    onGround: false
  };

  function resizeCanvasInternal() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function W() { return canvas.getBoundingClientRect().width; }
  function H() { return canvas.getBoundingClientRect().height; }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function resetGame() {
    resizeCanvasInternal();
    const width = W();
    const height = H();

    score = 0;
    coins = 0;
    cameraY = 0;
    lastTime = 0;
    gameOver = false;
    running = true;
    autoJumpCooldown = 0;
    speedScale = 1;

    frog.x = width / 2 - 21;
    frog.y = height - 120;
    frog.vx = 0;
    frog.vy = -14;
    frog.onGround = false;

    platforms = [];
    coinItems = [];

    const startY = height - 70;
    platforms.push({ x: width / 2 - 70, y: startY, w: 140, h: 18, type: "start" });

    let y = startY - 85;
    for (let i = 0; i < 28; i++) {
      addPlatform(y);
      y -= rand(72, 104);
    }

    scoreEl.textContent = "0";
    coinsEl.textContent = "0";
    levelEl.textContent = "INFINITO";
  }

  function addPlatform(worldY) {
    const width = W();
    const platformW = rand(82, 132);
    const x = rand(12, Math.max(14, width - platformW - 12));
    const p = { x, y: worldY, w: platformW, h: 18, type: Math.random() > 0.82 ? "gold" : "stone" };
    platforms.push(p);

    if (Math.random() > 0.35) {
      coinItems.push({
        x: x + platformW / 2 - 10,
        y: worldY - 34,
        r: 10,
        taken: false
      });
    }
  }

  function updateInputFromPointer(clientX) {
    const rect = canvas.getBoundingClientRect();
    const center = rect.left + rect.width / 2;

    if (clientX < center) {
      keys.left = true;
      keys.right = false;
    } else {
      keys.left = false;
      keys.right = true;
    }
  }

  function clearPointerInput() {
    keys.left = false;
    keys.right = false;
  }

  function handleCanvasPointer(e) {
    updateInputFromPointer(e.clientX || (e.touches && e.touches[0]?.clientX) || 0);
  }

  canvas.addEventListener("pointerdown", handleCanvasPointer);
  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons) handleCanvasPointer(e);
  });
  canvas.addEventListener("pointerup", clearPointerInput);
  canvas.addEventListener("pointercancel", clearPointerInput);
  canvas.addEventListener("pointerleave", clearPointerInput);

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.left = true;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.right = true;
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.left = false;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.right = false;
  });

  window.addEventListener("resize", () => {
    if (running) resizeCanvasInternal();
  });

  function physics(dt) {
    const width = W();
    const height = H();

    speedScale = 1 + Math.min(score / 2500, 1.4);

    const moveAccel = 0.9 * speedScale;
    const friction = 0.88;
    const maxVx = 7.5 * speedScale;

    if (keys.left) frog.vx -= moveAccel;
    if (keys.right) frog.vx += moveAccel;

    frog.vx *= friction;
    frog.vx = Math.max(-maxVx, Math.min(maxVx, frog.vx));

    frog.x += frog.vx;
    frog.vy += 0.48;
    frog.y += frog.vy;

    if (frog.x < -frog.w) frog.x = width;
    if (frog.x > width) frog.x = -frog.w;

    frog.onGround = false;

    for (const p of platforms) {
      const wasAbove = frog.y + frog.h - frog.vy <= p.y + 6;
      const overlapX = frog.x + frog.w > p.x && frog.x < p.x + p.w;
      const falling = frog.vy > 0;
      const hitY = frog.y + frog.h >= p.y && frog.y + frog.h <= p.y + p.h + 18;

      if (falling && wasAbove && overlapX && hitY) {
        frog.y = p.y - frog.h;
        frog.vy = -14.8 - Math.min(score / 1200, 3.5);
        frog.onGround = true;
        autoJumpCooldown = 0.08;
        if (p.type === "gold") score += 8;
      }
    }

    autoJumpCooldown -= dt;

    // La rana salta sempre da sola anche se tocca una piattaforma.
    if (frog.onGround && autoJumpCooldown <= 0) {
      frog.vy = -14.8 - Math.min(score / 1200, 3.5);
      autoJumpCooldown = 0.08;
    }

    // Camera segue la rana verso l'alto.
    const screenY = frog.y - cameraY;
    if (screenY < height * 0.38) {
      cameraY = frog.y - height * 0.38;
    }

    // Score infinito basato sull'altezza raggiunta.
    const heightScore = Math.max(0, Math.floor((-cameraY) / 2));
    if (heightScore > score) score = heightScore + coins * 25;

    // Genera nuove piattaforme sopra.
    const topMost = Math.min(...platforms.map(p => p.y));
    while (topMost - cameraY > -200 || platforms.length < 32) {
      const currentTop = Math.min(...platforms.map(p => p.y));
      addPlatform(currentTop - rand(74, Math.max(90, 112 - Math.min(score / 220, 34))));
      if (platforms.length > 60) break;
    }

    // Rimuove piattaforme/coin troppo sotto.
    platforms = platforms.filter(p => p.y - cameraY < height + 160);
    coinItems = coinItems.filter(c => !c.taken && c.y - cameraY < height + 160);

    // Coin collision.
    for (const c of coinItems) {
      const dx = (frog.x + frog.w / 2) - (c.x + c.r);
      const dy = (frog.y + frog.h / 2) - (c.y + c.r);
      if (Math.sqrt(dx * dx + dy * dy) < 34) {
        c.taken = true;
        coins++;
        score += 50;
      }
    }

    // Game over se cade.
    if (frog.y - cameraY > height + 90) {
      endGame();
    }

    scoreEl.textContent = String(score);
    coinsEl.textContent = String(coins);
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  function render() {
    const width = W();
    const height = H();

    ctx.clearRect(0, 0, width, height);

    // Sfondo
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, "#9be7c5");
    g.addColorStop(0.55, "#ecfccb");
    g.addColorStop(1, "#bde77e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Decorazioni
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#003129";
    for (let i = 0; i < 9; i++) {
      const x = (i * 91 + 30) % width;
      const y = (i * 137 + (-cameraY * 0.25)) % height;
      ctx.beginPath();
      ctx.arc(x, y, 14 + (i % 3) * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Piattaforme
    for (const p of platforms) {
      const y = p.y - cameraY;
      if (y < -40 || y > height + 60) continue;

      ctx.fillStyle = p.type === "gold" ? "#FCBD16" : "#6b7f5c";
      drawRoundedRect(p.x, y, p.w, p.h, 10);

      ctx.fillStyle = "rgba(0,49,41,.25)";
      drawRoundedRect(p.x + 4, y + p.h - 4, p.w - 8, 5, 6);
    }

    // Coin
    for (const c of coinItems) {
      if (c.taken) continue;
      const y = c.y - cameraY;
      if (y < -30 || y > height + 30) continue;

      ctx.fillStyle = "#FCBD16";
      ctx.beginPath();
      ctx.arc(c.x + c.r, y + c.r, c.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#a16207";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fff7cc";
      ctx.beginPath();
      ctx.arc(c.x + c.r - 3, y + c.r - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rana
    const fx = frog.x;
    const fy = frog.y - cameraY;

    ctx.save();
    ctx.translate(fx + frog.w / 2, fy + frog.h / 2);

    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.ellipse(0, 4, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(0, -9, 20, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-8, -17, 6, 0, Math.PI * 2);
    ctx.arc(8, -17, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#003129";
    ctx.beginPath();
    ctx.arc(-8, -17, 2.5, 0, Math.PI * 2);
    ctx.arc(8, -17, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#003129";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -7, 8, 0.15, Math.PI - 0.15);
    ctx.stroke();

    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.ellipse(-21, 12, 10, 6, -0.5, 0, Math.PI * 2);
    ctx.ellipse(21, 12, 10, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Istruzione dentro canvas
    ctx.fillStyle = "rgba(0,49,41,.72)";
    ctx.font = "800 14px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("← tocca sinistra | tocca destra →", width / 2, height - 18);
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min((ts - lastTime) / 1000 || 0.016, 0.033);
    lastTime = ts;

    physics(dt);
    render();

    if (!gameOver) requestAnimationFrame(loop);
  }

  async function endGame() {
    if (gameOver) return;
    gameOver = true;
    running = false;

    finalText.textContent = `${nickname}, hai fatto ${score} punti e raccolto ${coins} coin per il rione ${rione}.`;

    gamePanel.style.display = "none";
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

    setTimeout(() => {
      resetGame();
      requestAnimationFrame(loop);
    }, 50);
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

  loadLeaderboard();
})();
