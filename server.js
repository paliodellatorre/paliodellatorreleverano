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

const RIONI = [
  'POZZOLUNGO SUD',
  'POZZOLUNGO NORD',
  'PATURA CUPA QUARTARARU',
  'IANA',
  'CENTRO',
  'CHIANCA',
  'ZITA ROSA',
  'CONSOLAZIONE',
];

const RIONE_CRITERIA = [
  'Residenza',
  'Domicilio',
  'Legame familiare',
  'Altro criterio approvato'
];

if (isProd) app.set('trust proxy', 1);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
});

async function runSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);

  // Compatibilità con database più vecchi
  await pool.query(`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(150)
  `);

  await pool.query(`
    UPDATE registrations
    SET full_name = COALESCE(full_name, player1_full_name)
    WHERE full_name IS NULL AND player1_full_name IS NOT NULL
  `);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'super-secret-change-me',
    resave: false,
    saveUninitialized: false,
    proxy: isProd,
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

function renderHome(res, { sports, settings, formData = {}, errors = [] }) {
  res.render('home', {
    title: 'Palio della Torre Leverano',
    sports,
    settings,
    formData,
    errors,
    rioni: RIONI,
    rioneCriteria: RIONE_CRITERIA,
  });
}

app.get('/', async (req, res, next) => {
  try {
    const sports = await pool.query('SELECT * FROM sports WHERE is_open = true ORDER BY name');
    const settings = await getSettingsMap();
    renderHome(res, { sports: sports.rows, settings });
  } catch (err) {
    next(err);
  }
});

app.get('/admin/login', (req, res) => {
  res.render('admin-login', { title: 'Login Admin' });
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const usernameOk = username === adminUsername;
  const passwordOk =
    password === adminPassword ||
    (adminPassword.startsWith('$2') && (await bcrypt.compare(password, adminPassword)));

  if (!usernameOk || !passwordOk) {
    setFlash(req, 'error', 'Credenziali non valide.');
    return res.redirect('/admin/login');
  }

  req.session.admin = { username };
  setFlash(req, 'success', 'Accesso effettuato con successo.');
  return req.session.save(() => {
    res.redirect('/admin');
  });
});

app.post('/iscrizioni', async (req, res, next) => {
  try {
    const settings = await getSettingsMap();
    const sportsResult = await pool.query('SELECT * FROM sports WHERE is_open = true ORDER BY name');
    const sports = sportsResult.rows;
    const errors = [];

    const {
      sport_id,
      email,
      rione,
      fee_confirmation,
      player1_full_name,
      player1_tax_code,
      player1_phone,
      player1_rione_criteria,
      player1_rione_address,
      player1_shirt,
      terms_rione_check,
      terms_organizer_confirmation,
      terms_privacy,
      terms_images,
      terms_liability,
      player2_full_name,
      player2_tax_code,
      player2_phone,
      player2_rione_criteria,
      player2_rione_address,
      player2_shirt,
      notes,
    } = req.body;

    if (settings.registrations_open !== 'true') {
      errors.push('Le iscrizioni sono momentaneamente chiuse.');
    }

    const selectedSport = sports.find((s) => String(s.id) === String(sport_id));

    if (!selectedSport) errors.push('Seleziona uno sport valido.');
    if (!email?.trim()) errors.push("Inserisci l'email.");
    if (!rione?.trim()) errors.push('Seleziona il rione.');
    if (fee_confirmation !== 'yes') errors.push('Devi confermare la quota di iscrizione.');

    if (!player1_full_name?.trim()) errors.push('Inserisci nome e cognome del 1° giocatore.');
    if (!player1_tax_code?.trim()) errors.push('Inserisci il codice fiscale del 1° giocatore.');
    if (!player1_phone?.trim()) errors.push('Inserisci il telefono del 1° giocatore.');
    if (!player1_rione_criteria?.trim()) errors.push('Seleziona il criterio di appartenenza del 1° giocatore.');
    if (!player1_rione_address?.trim()) errors.push("Inserisci l'indirizzo di appartenenza del 1° giocatore.");

    if (selectedSport?.team_type === 'pair') {
      if (!player2_full_name?.trim()) errors.push('Inserisci nome e cognome del 2° giocatore.');
      if (!player2_tax_code?.trim()) errors.push('Inserisci il codice fiscale del 2° giocatore.');
      if (!player2_phone?.trim()) errors.push('Inserisci il telefono del 2° giocatore.');
      if (!player2_rione_criteria?.trim()) errors.push('Seleziona il criterio di appartenenza del 2° giocatore.');
      if (!player2_rione_address?.trim()) errors.push("Inserisci l'indirizzo di appartenenza del 2° giocatore.");
    }

    if (terms_rione_check !== 'yes') errors.push("Devi confermare la verifica dell'appartenenza al rione.");
    if (terms_organizer_confirmation !== 'yes') errors.push("Devi confermare che l'iscrizione sarà verificata dagli organizzatori.");
    if (terms_privacy !== 'yes') errors.push('Devi autorizzare il trattamento dei dati personali.');
    if (terms_images !== 'yes') errors.push('Devi autorizzare la diffusione gratuita delle immagini.');
    if (terms_liability !== 'yes') errors.push('Devi accettare la clausola di responsabilità.');

    if (errors.length) {
      return res.status(400).render('home', {
        title: 'Palio della Torre Leverano',
        sports,
        settings,
        formData: req.body,
        errors,
        rioni: RIONI,
        rioneCriteria: RIONE_CRITERIA,
      });
    }

    // Compatibilità col vecchio DB: valorizzo anche full_name
    const legacyFullName = player1_full_name.trim();

    await pool.query(
      `INSERT INTO registrations (
        sport_id, email, rione, fee_confirmation,
        full_name,
        player1_full_name, player1_tax_code, player1_phone, player1_rione_criteria, player1_rione_address, player1_shirt,
        terms_rione_check, terms_organizer_confirmation, terms_privacy, terms_images, terms_liability,
        player2_full_name, player2_tax_code, player2_phone, player2_rione_criteria, player2_rione_address, player2_shirt, notes,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,
        $5,
        $6,$7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,
        NOW()
      )`,
      [
        sport_id,
        email.trim(),
        rione.trim(),
        fee_confirmation === 'yes',
        legacyFullName,
        player1_full_name.trim(),
        player1_tax_code.trim().toUpperCase(),
        player1_phone.trim(),
        player1_rione_criteria.trim(),
        player1_rione_address.trim(),
        player1_shirt === 'yes',
        terms_rione_check === 'yes',
        terms_organizer_confirmation === 'yes',
        terms_privacy === 'yes',
        terms_images === 'yes',
        terms_liability === 'yes',
        selectedSport.team_type === 'pair' ? player2_full_name.trim() : null,
        selectedSport.team_type === 'pair' ? player2_tax_code.trim().toUpperCase() : null,
        selectedSport.team_type === 'pair' ? player2_phone.trim() : null,
        selectedSport.team_type === 'pair' ? player2_rione_criteria.trim() : null,
        selectedSport.team_type === 'pair' ? player2_rione_address.trim() : null,
        selectedSport.team_type === 'pair' ? player2_shirt === 'yes' : false,
        notes?.trim() || null,
      ]
    );

    setFlash(req, 'success', 'Iscrizione inviata correttamente.');
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin', requireAuth, async (req, res, next) => {
  try {
    const registrations = await pool.query(`
      SELECT r.*, s.name AS sport_name, s.team_type, s.price AS sport_price
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
  } catch (err) {
    next(err);
  }
});

app.post('/admin/sports/:id/update', requireAuth, async (req, res, next) => {
  try {
    const { name, price, is_open, team_type } = req.body;
    await pool.query(
      'UPDATE sports SET name=$1, team_type=$2, price=$3, is_open=$4, updated_at=NOW() WHERE id=$5',
      [name.trim(), team_type, Number(price || 0), is_open === 'on', req.params.id]
    );
    setFlash(req, 'success', 'Sport aggiornato.');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/settings/update', requireAuth, async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

app.get('/admin/export/excel', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id, s.name AS sport, r.email, r.rione,
        r.player1_full_name, r.player1_tax_code, r.player1_phone, r.player1_rione_criteria, r.player1_rione_address, r.player1_shirt,
        r.player2_full_name, r.player2_tax_code, r.player2_phone, r.player2_rione_criteria, r.player2_rione_address, r.player2_shirt,
        r.created_at
      FROM registrations r
      JOIN sports s ON s.id = r.sport_id
      ORDER BY r.created_at DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Iscrizioni');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Sport', key: 'sport', width: 22 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Rione', key: 'rione', width: 24 },
      { header: '1° giocatore', key: 'player1_full_name', width: 24 },
      { header: 'CF 1°', key: 'player1_tax_code', width: 18 },
      { header: 'Telefono 1°', key: 'player1_phone', width: 18 },
      { header: 'Criterio 1°', key: 'player1_rione_criteria', width: 18 },
      { header: 'Indirizzo 1°', key: 'player1_rione_address', width: 26 },
      { header: 'Maglia 1°', key: 'player1_shirt', width: 12 },
      { header: '2° giocatore', key: 'player2_full_name', width: 24 },
      { header: 'CF 2°', key: 'player2_tax_code', width: 18 },
      { header: 'Telefono 2°', key: 'player2_phone', width: 18 },
      { header: 'Criterio 2°', key: 'player2_rione_criteria', width: 18 },
      { header: 'Indirizzo 2°', key: 'player2_rione_address', width: 26 },
      { header: 'Maglia 2°', key: 'player2_shirt', width: 12 },
      { header: 'Creato il', key: 'created_at', width: 22 },
    ];

    rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="iscrizioni-palio-della-torre.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Errore interno del server.');
});

runSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Errore avvio applicazione:', err);
    process.exit(1);
  });
