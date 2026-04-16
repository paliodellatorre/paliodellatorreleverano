require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
});

async function runSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    store: new pgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'super-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 12,
      secure: isProd,
      sameSite: 'lax',
    },
  })
);

app.use(async (req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAuthenticated = !!req.session.admin;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

function requireAuth(req, res, next) {
  if (!req.session.admin) {
    setFlash(req, 'error', 'Devi accedere come admin.');
    return res.redirect('/admin/login');
  }
  next();
}

async function getSettingsMap() {
  const { rows } = await pool.query('SELECT key, value FROM site_settings');
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

app.get('/', async (req, res) => {
  const sports = await pool.query('SELECT * FROM sports WHERE is_open = true ORDER BY name');
  const settings = await getSettingsMap();
  res.render('home', {
    title: 'Palio della Torre',
    sports: sports.rows,
    settings,
    formData: {},
    errors: [],
  });
});

app.post('/iscrizioni', async (req, res) => {
  const { full_name, birth_date, phone, email, rione, sport_id, notes } = req.body;
  const errors = [];
  const settings = await getSettingsMap();
  const sports = await pool.query('SELECT * FROM sports WHERE is_open = true ORDER BY name');

  if (settings.registrations_open !== 'true') {
    errors.push('Le iscrizioni sono momentaneamente chiuse.');
  }
  if (!full_name?.trim()) errors.push('Inserisci nome e cognome.');
  if (!phone?.trim()) errors.push('Inserisci il telefono.');
  if (!email?.trim()) errors.push('Inserisci l\'email.');
  if (!rione?.trim()) errors.push('Inserisci il rione.');
  if (!sport_id) errors.push('Seleziona uno sport.');

  const selectedSport = sports.rows.find((s) => String(s.id) === String(sport_id));
  if (sport_id && !selectedSport) errors.push('Lo sport selezionato non è disponibile.');

  if (errors.length) {
    return res.status(400).render('home', {
      title: 'Palio della Torre',
      sports: sports.rows,
      settings,
      formData: req.body,
      errors,
    });
  }

  await pool.query(
    `INSERT INTO registrations (full_name, birth_date, phone, email, rione, sport_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [full_name.trim(), birth_date || null, phone.trim(), email.trim(), rione.trim(), sport_id, notes?.trim() || null]
  );

  setFlash(req, 'success', 'Iscrizione inviata correttamente.');
  res.redirect('/');
});

app.get('/admin/login', (req, res) => {
  res.render('admin-login', { title: 'Login Admin' });
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const usernameOk = username === adminUsername;
  const passwordOk = password === adminPassword || (adminPassword.startsWith('$2') && await bcrypt.compare(password, adminPassword));

  if (!usernameOk || !passwordOk) {
    setFlash(req, 'error', 'Credenziali non valide.');
    return res.redirect('/admin/login');
  }

  req.session.admin = { username };
  setFlash(req, 'success', 'Accesso effettuato con successo.');
  res.redirect('/admin');
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin', requireAuth, async (req, res) => {
  const registrations = await pool.query(`
    SELECT r.*, s.name AS sport_name, s.price AS sport_price
    FROM registrations r
    JOIN sports s ON s.id = r.sport_id
    ORDER BY r.created_at DESC
  `);
  const sports = await pool.query('SELECT * FROM sports ORDER BY name');
  const settings = await getSettingsMap();
  res.render('admin-dashboard', {
    title: 'Pannello Admin',
    registrations: registrations.rows,
    sports: sports.rows,
    settings,
    editItem: null,
  });
});

app.get('/admin/registrations/:id/edit', requireAuth, async (req, res) => {
  const registrations = await pool.query(`
    SELECT r.*, s.name AS sport_name, s.price AS sport_price
    FROM registrations r
    JOIN sports s ON s.id = r.sport_id
    ORDER BY r.created_at DESC
  `);
  const sports = await pool.query('SELECT * FROM sports ORDER BY name');
  const settings = await getSettingsMap();
  const editItem = await pool.query('SELECT * FROM registrations WHERE id = $1', [req.params.id]);
  if (!editItem.rows[0]) {
    setFlash(req, 'error', 'Iscrizione non trovata.');
    return res.redirect('/admin');
  }
  res.render('admin-dashboard', {
    title: 'Pannello Admin',
    registrations: registrations.rows,
    sports: sports.rows,
    settings,
    editItem: editItem.rows[0],
  });
});

app.post('/admin/registrations/:id/update', requireAuth, async (req, res) => {
  const { full_name, birth_date, phone, email, rione, sport_id, notes } = req.body;
  await pool.query(
    `UPDATE registrations
     SET full_name=$1, birth_date=$2, phone=$3, email=$4, rione=$5, sport_id=$6, notes=$7, updated_at=NOW()
     WHERE id=$8`,
    [full_name, birth_date || null, phone, email, rione, sport_id, notes || null, req.params.id]
  );
  setFlash(req, 'success', 'Iscrizione aggiornata con successo.');
  res.redirect('/admin');
});

app.post('/admin/registrations/:id/delete', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM registrations WHERE id = $1', [req.params.id]);
  setFlash(req, 'success', 'Iscrizione eliminata.');
  res.redirect('/admin');
});

app.post('/admin/sports/create', requireAuth, async (req, res) => {
  const { name, price } = req.body;
  if (!name?.trim()) {
    setFlash(req, 'error', 'Inserisci il nome dello sport.');
    return res.redirect('/admin');
  }
  await pool.query('INSERT INTO sports (name, price, is_open) VALUES ($1,$2,true)', [name.trim(), Number(price || 0)]);
  setFlash(req, 'success', 'Sport aggiunto correttamente.');
  res.redirect('/admin');
});

app.post('/admin/sports/:id/update', requireAuth, async (req, res) => {
  const { name, price, is_open } = req.body;
  await pool.query(
    'UPDATE sports SET name=$1, price=$2, is_open=$3, updated_at=NOW() WHERE id=$4',
    [name.trim(), Number(price || 0), is_open === 'on', req.params.id]
  );
  setFlash(req, 'success', 'Sport aggiornato.');
  res.redirect('/admin');
});

app.post('/admin/settings/update', requireAuth, async (req, res) => {
  const payload = {
    registrations_open: req.body.registrations_open === 'true' ? 'true' : 'false',
    contact_phone: req.body.contact_phone || '',
    contact_email: req.body.contact_email || '',
    contact_address: req.body.contact_address || '',
  };

  for (const [key, value] of Object.entries(payload)) {
    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1,$2,NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
  }
  setFlash(req, 'success', 'Impostazioni aggiornate.');
  res.redirect('/admin');
});

app.get('/admin/export/excel', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT r.id, r.full_name, r.birth_date, r.phone, r.email, r.rione, s.name AS sport, s.price,
           r.notes, r.created_at, r.updated_at
    FROM registrations r
    JOIN sports s ON s.id = r.sport_id
    ORDER BY r.created_at DESC
  `);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Iscrizioni');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Nome e cognome', key: 'full_name', width: 28 },
    { header: 'Data di nascita', key: 'birth_date', width: 16 },
    { header: 'Telefono', key: 'phone', width: 18 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Rione', key: 'rione', width: 18 },
    { header: 'Sport', key: 'sport', width: 18 },
    { header: 'Prezzo', key: 'price', width: 12 },
    { header: 'Note', key: 'notes', width: 32 },
    { header: 'Creato il', key: 'created_at', width: 24 },
    { header: 'Aggiornato il', key: 'updated_at', width: 24 },
  ];
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="iscrizioni-palio-della-torre.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Errore interno del server. Controlla la configurazione del database e delle variabili ambiente.');
});

runSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Errore avvio applicazione:', err);
    process.exit(1);
  });
