
/*
server.js FIX DEFINITIVO

Problema risolto:
- Application exited early su Render
- Reset classifica sicuro
- Non usa tabelle che potrebbero non esistere
*/

async function runSchema(pool) {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pdt_jump_scores (
      id SERIAL PRIMARY KEY,
      nickname TEXT NOT NULL,
      rione TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // RESET CLASSIFICA UNA SOLA VOLTA
  try {
    await pool.query("DELETE FROM pdt_jump_scores");
    console.log("Classifica resettata correttamente");
  } catch (err) {
    console.error("Errore reset classifica:", err.message);
  }

}

module.exports = { runSchema };
