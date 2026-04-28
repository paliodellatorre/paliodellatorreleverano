
/* server.js - reset classifica una sola volta */

async function runSchema(pool) {

  await pool.query(`CREATE TABLE IF NOT EXISTS pdt_jump_scores (
    id SERIAL PRIMARY KEY,
    nickname TEXT NOT NULL,
    rione TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 0,
    level_reached INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // RESET TOTALE CLASSIFICA UNA SOLA VOLTA
  const resetKey = 'pdt_jump_reset_v2';
  const check = await pool.query(
    'SELECT value FROM site_settings WHERE key = $1',
    [resetKey]
  );

  if (check.rows.length === 0) {
    await pool.query('DELETE FROM pdt_jump_scores');

    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, 'done', NOW())
       ON CONFLICT (key) DO NOTHING`,
      [resetKey]
    );
  }

}
