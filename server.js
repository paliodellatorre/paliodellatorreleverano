
/*
SERVER.JS CORRETTO
- Mantiene le rotte
- Aggiunge /gioco
- Resetta classifica all'avvio
- Compatibile con Render
*/

const express = require("express");
const path = require("path");
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

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function init() {
  try {

    // CREA TABELLA SE NON ESISTE
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

    // HOME
    app.get("/", (req, res) => {
      res.render("index");
    });

    // GIOCO
    app.get("/gioco", (req, res) => {
      res.render("gioco");
    });

    app.listen(PORT, () => {
      console.log("Server avviato sulla porta " + PORT);
    });

  } catch (err) {
    console.error("Errore avvio server:", err);
    process.exit(1);
  }
}

init();
