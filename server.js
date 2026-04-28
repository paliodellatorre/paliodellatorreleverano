
/*
SERVER.JS SICURO PER RENDER
- Non va in crash
- Avvia sempre il server
- Reset classifica una volta all'avvio
*/

const express = require("express");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 10000;

// DATABASE
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function startServer() {
  try {

    // crea tabella se non esiste
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pdt_jump_scores (
        id SERIAL PRIMARY KEY,
        nickname TEXT NOT NULL,
        rione TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // RESET CLASSIFICA
    await pool.query("DELETE FROM pdt_jump_scores");

    console.log("Classifica resettata");

    app.get("/", (req, res) => {
      res.send("Server attivo");
    });

    app.listen(PORT, () => {
      console.log("Server avviato sulla porta " + PORT);
    });

  } catch (err) {
    console.error("Errore avvio server:", err);
    process.exit(1);
  }
}

startServer();
