
/* RESET CLASSIFICA PDT JUMP UNA SOLA VOLTA */

async function resetLeaderboardOnce(pool) {
  try {
    const resetKey = 'reset_classifica_once';

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

      console.log('Classifica PDT Jump resettata.');
    }
  } catch (err) {
    console.error('Errore reset classifica:', err);
  }
}

module.exports = { resetLeaderboardOnce };
