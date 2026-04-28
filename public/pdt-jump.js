
// Modifiche principali:
// - countdown 3 2 1
// - hint solo all'inizio
// - razzo casuale (non ogni 1500)
// - niente scritte extra

let rockets = [];

function shouldSpawnRocket() {
    // probabilità casuale bassa
    return Math.random() < 0.08;
}

function startCountdown(callback) {
    const el = document.getElementById("pdtCountdown");
    const hint = document.getElementById("pdtHint");

    let count = 3;
    el.style.display = "flex";

    function tick() {
        if (count > 0) {
            el.textContent = count;
            count--;
            setTimeout(tick, 700);
        } else {
            el.textContent = "GO";
            setTimeout(() => {
                el.style.display = "none";
                hint.style.display = "block";
                setTimeout(() => {
                    hint.style.display = "none";
                }, 2500);
                callback();
            }, 500);
        }
    }

    tick();
}
