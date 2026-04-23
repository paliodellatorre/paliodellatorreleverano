require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const RIONI = [
  'POZZOLUNGO SUD',
  'POZZOLUNGO NORD',
  'PATURA CUPA QUARTARARU',
  'IANA',
  'CENTRO',
  'CHIANCA',
  'ZITA ROSA',
  'CONSOLAZIONE'
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false
});

async function runSchema() {
  const schemaPath = path.join(__dirname, 'db', 'schema.sql');

  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
  } else {
    console.warn('db/schema.sql non trovato, avvio senza esecuzione schema.');
      await pool.query(`
    CREATE TABLE IF NOT EXISTS site_media (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sponsors (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      logo_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE sponsors
    ADD COLUMN IF NOT EXISTS nome TEXT
  `);

  await pool.query(`
    ALTER TABLE sponsors
    ADD COLUMN IF NOT EXISTS logo_url TEXT
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS regolamenti (
      id SERIAL PRIMARY KEY,
      titolo TEXT NOT NULL,
      file_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE regolamenti
    ADD COLUMN IF NOT EXISTS titolo TEXT
  `);

  await pool.query(`
    ALTER TABLE regolamenti
    ADD COLUMN IF NOT EXISTS file_url TEXT
  `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      titolo TEXT,
      image_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
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
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'super-secret-change-me',
    resave: false,
    saveUninitialized: false,
    proxy: isProd,
    cookie: {
      maxAge: 1000 * 60 * 60 * 12,
      secure: isProd,
      sameSite: 'lax'
    }
  })
);

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAuthenticated = !!req.session.admin;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

app.use((req, res, next) => {
  const allowedPaths = [
    '/ingresso',
    '/ingresso/continua',
    '/admin',
    '/admin/login',
    '/admin/logout'
  ];

  const isStatic =
    req.path.startsWith('/styles.css') ||
    req.path.startsWith('/logo-pdt.png') ||
    req.path.startsWith('/favicon') ||
    req.path.startsWith('/public/');

  const isAdmin = req.path.startsWith('/admin');

  if (isStatic || isAdmin || allowedPaths.includes(req.path)) {
    return next();
  }

  if (req.query.ok === '1') {
    return next();
  }

  return res.redirect('/ingresso');
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

app.get('/ingresso', async (req, res, next) => {
  try {
    const settings = await getSettingsMap();

    res.render('ingresso', {
      title: 'Regolamento di accesso',
      settings
    });
  } catch (err) {
    next(err);
  }
});

app.post('/ingresso/continua', (req, res) => {
  const { regolamento_ok } = req.body;

  if (regolamento_ok !== 'yes') {
    req.session.flash = {
      type: 'error',
      message: 'Devi leggere il regolamento prima di proseguire.'
    };
    return res.redirect('/ingresso');
  }

  return res.redirect('/?ok=1');
});

/* HOME */
app.get('/', async (req, res, next) => {
  try {
    const sports = await pool.query(
      'SELECT * FROM sports WHERE is_open = true ORDER BY name'
    );
    const sponsors = await pool.query(
      'SELECT * FROM sponsors ORDER BY id DESC'
    );
   const regulations = await pool.query(
  'SELECT * FROM regolamenti ORDER BY id DESC'
);
const news = await pool.query(
  'SELECT * FROM news ORDER BY created_at DESC, id DESC'
);
const mediaRows = await pool.query(
  'SELECT key, value FROM site_media'
);
const settings = await getSettingsMap();

const media = mediaRows.rows.reduce((acc, row) => {
  acc[row.key] = row.value;
  return acc;
}, {});

    res.render('home', {
  title: 'Palio della Torre',
  sports: sports.rows,
  sponsors: sponsors.rows,
  regulations: regulations.rows,
  news: news.rows,
  media,
  settings,
  rioni: RIONI,
  formData: {},
  errors: []
});
  } catch (err) {
    next(err);
  }
});

/* ISCRIZIONI */
app.post('/iscrizioni', async (req, res, next) => {
  try {
    const {
  full_name,
  birth_date,
  phone,
  email,
  rione,
  sport_id,
  notes,
  player1_full_name,
  player1_tax_code,
  player1_phone,
  player1_rione_criteria,
  player1_rione_address,
  player1_shirt,
  player1_shirt_size,
  player2_full_name,
  player2_tax_code,
  player2_phone,
  player2_rione_criteria,
  player2_rione_address,
  player2_shirt,
  player2_shirt_size,
  fee_confirmation,
  terms_rione_check,
  terms_organizer_confirmation,
  terms_privacy,
  terms_images,
  terms_liability
} = req.body;

    const errors = [];
    const settings = await getSettingsMap();
    const sports = await pool.query(
      'SELECT * FROM sports WHERE is_open = true ORDER BY name'
    );
    const sponsors = await pool.query(
      'SELECT * FROM sponsors ORDER BY id DESC'
    );
    const regulations = await pool.query(
      'SELECT * FROM regolamenti ORDER BY id DESC'
    );

    if (settings.registrations_open !== 'true') {
      errors.push('Le iscrizioni sono momentaneamente chiuse.');
    }

    if (!email?.trim()) errors.push("Inserisci l'email.");
    if (!rione?.trim()) errors.push('Inserisci il rione.');
    if (!sport_id) errors.push('Seleziona uno sport.');
    if (!fee_confirmation || fee_confirmation !== 'yes') {
      errors.push('Devi confermare la quota.');
    }

    if (!player1_full_name?.trim()) errors.push('Inserisci nome e cognome del 1° giocatore.');
    if (!player1_tax_code?.trim()) errors.push('Inserisci il codice fiscale del 1° giocatore.');
    if (!player1_phone?.trim()) errors.push('Inserisci il numero di telefono del 1° giocatore.');
    if (!player1_rione_criteria?.trim()) errors.push('Seleziona il criterio di appartenenza del 1° giocatore.');
    if (!player1_rione_address?.trim()) errors.push("Inserisci l'indirizzo di appartenenza del 1° giocatore.");
    if (!player1_shirt) errors.push('Seleziona se il 1° giocatore vuole la maglia.');

    if (terms_rione_check !== 'yes') errors.push('Devi accettare il controllo appartenenza al rione.');
    if (terms_organizer_confirmation !== 'yes') errors.push("Devi accettare la conferma dell'iscrizione dagli organizzatori.");
    if (terms_privacy !== 'yes') errors.push('Devi accettare il trattamento dei dati personali.');
    if (terms_images !== 'yes') errors.push('Devi accettare la pubblicazione delle immagini.');
    if (terms_liability !== 'yes') errors.push('Devi accettare la clausola di responsabilità.');

    const selectedSport = sports.rows.find((s) => String(s.id) === String(sport_id));
    if (sport_id && !selectedSport) {
      errors.push('Lo sport selezionato non è disponibile.');
    }

    const lowerName = String(selectedSport?.name || '').toLowerCase();
    const isPair =
      lowerName.includes('coppia') ||
      ['padel', 'burraco', 'scopa', 'biliardino'].some(k => lowerName.includes(k));

    if (isPair) {
      if (!player2_full_name?.trim()) errors.push('Inserisci nome e cognome del 2° giocatore.');
      if (!player2_tax_code?.trim()) errors.push('Inserisci il codice fiscale del 2° giocatore.');
      if (!player2_phone?.trim()) errors.push('Inserisci il numero di telefono del 2° giocatore.');
      if (!player2_rione_criteria?.trim()) errors.push('Seleziona il criterio di appartenenza del 2° giocatore.');
      if (!player2_rione_address?.trim()) errors.push("Inserisci l'indirizzo di appartenenza del 2° giocatore.");
      if (!player2_shirt) errors.push('Seleziona se il 2° giocatore vuole la maglia.');
    }

    if (errors.length) {
      return res.status(400).render('home', {
        title: 'Palio della Torre',
        sports: sports.rows,
        sponsors: sponsors.rows,
        regulations: regulations.rows,
        settings,
        rioni: RIONI,
        formData: req.body,
        errors
      });
    }

    await pool.query(
  `INSERT INTO registrations (
    full_name, birth_date, phone, email, rione, sport_id, notes,
    player1_full_name, player1_tax_code, player1_phone, player1_rione_criteria, player1_rione_address, player1_shirt, player1_shirt_size,
    player2_full_name, player2_tax_code, player2_phone, player2_rione_criteria, player2_rione_address, player2_shirt, player2_shirt_size,
    fee_confirmation,
    terms_rione_check, terms_organizer_confirmation, terms_privacy, terms_images, terms_liability
  )
  VALUES (
    $1,$2,$3,$4,$5,$6,$7,
    $8,$9,$10,$11,$12,$13,$14,
    $15,$16,$17,$18,$19,$20,$21,
    $22,
    $23,$24,$25,$26,$27
  )`,
      [
  player1_full_name?.trim() || full_name?.trim() || null,
  birth_date || null,
  player1_phone?.trim() || phone?.trim() || null,
  email.trim(),
  rione.trim(),
  sport_id,
  notes?.trim() || null,

  player1_full_name?.trim() || null,
  player1_tax_code?.trim() || null,
  player1_phone?.trim() || null,
  player1_rione_criteria?.trim() || null,
  player1_rione_address?.trim() || null,
  player1_shirt || null,
  player1_shirt_size || null,

  isPair ? (player2_full_name?.trim() || null) : null,
  isPair ? (player2_tax_code?.trim() || null) : null,
  isPair ? (player2_phone?.trim() || null) : null,
  isPair ? (player2_rione_criteria?.trim() || null) : null,
  isPair ? (player2_rione_address?.trim() || null) : null,
  isPair ? (player2_shirt || null) : null,
  isPair ? (player2_shirt_size || null) : null,

  fee_confirmation || null,
  terms_rione_check || null,
  terms_organizer_confirmation || null,
  terms_privacy || null,
  terms_images || null,
  terms_liability || null
]
    );

    setFlash(req, 'success', 'Iscrizione inviata correttamente.');
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

/* LOGIN ADMIN */
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
    (adminPassword.startsWith('$2') && await bcrypt.compare(password, adminPassword));

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

/* DASHBOARD ADMIN */
app.get('/admin', requireAuth, async (req, res, next) => {
  try {
    const registrations = await pool.query(`
      SELECT r.*, s.name AS sport_name, s.price AS sport_price
      FROM registrations r
      JOIN sports s ON s.id = r.sport_id
      ORDER BY r.created_at DESC
    `);

    const sports = await pool.query('SELECT * FROM sports ORDER BY name');
    const sponsors = await pool.query('SELECT * FROM sponsors ORDER BY id DESC');
    const regulations = await pool.query('SELECT * FROM regolamenti ORDER BY id DESC');
const news = await pool.query('SELECT * FROM news ORDER BY created_at DESC, id DESC');
    const mediaRows = await pool.query('SELECT key, value FROM site_media');
const media = mediaRows.rows.reduce((acc, row) => {
  acc[row.key] = row.value;
  return acc;
}, {});
const settings = await getSettingsMap();

    res.render('admin-dashboard', {
  title: 'Pannello Admin',
  registrations: registrations.rows,
  sports: sports.rows,
  sponsors: sponsors.rows,
  regulations: regulations.rows,
  news: news.rows,
  media,
  settings,
  editItem: null
});
  } catch (err) {
    next(err);
  }
});

/* EDIT ISCRIZIONE */
app.get('/admin/registrations/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const registrations = await pool.query(`
      SELECT r.*, s.name AS sport_name, s.price AS sport_price
      FROM registrations r
      JOIN sports s ON s.id = r.sport_id
      ORDER BY r.created_at DESC
    `);
    const sports = await pool.query('SELECT * FROM sports ORDER BY name');
    const sponsors = await pool.query('SELECT * FROM sponsors ORDER BY id DESC');
   const regulations = await pool.query('SELECT * FROM regolamenti ORDER BY id DESC');
const news = await pool.query('SELECT * FROM news ORDER BY created_at DESC, id DESC');
    const mediaRows = await pool.query('SELECT key, value FROM site_media');
const media = mediaRows.rows.reduce((acc, row) => {
  acc[row.key] = row.value;
  return acc;
}, {});
const settings = await getSettingsMap();
    const editItem = await pool.query(
      'SELECT * FROM registrations WHERE id = $1',
      [req.params.id]
    );

    if (!editItem.rows[0]) {
      setFlash(req, 'error', 'Iscrizione non trovata.');
      return res.redirect('/admin');
    }

    res.render('admin-dashboard', {
      title: 'Pannello Admin',
      registrations: registrations.rows,
      sports: sports.rows,
      sponsors: sponsors.rows,
      regulations: regulations.rows,
      news: news.rows,
      media,
      settings,
      editItem: editItem.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

app.post('/admin/registrations/:id/update', requireAuth, async (req, res, next) => {
  try {
    const { full_name, birth_date, phone, email, rione, sport_id, notes } = req.body;

    await pool.query(
      `UPDATE registrations
       SET full_name=$1, birth_date=$2, phone=$3, email=$4, rione=$5, sport_id=$6, notes=$7, updated_at=NOW()
       WHERE id=$8`,
      [full_name, birth_date || null, phone, email, rione, sport_id, notes || null, req.params.id]
    );

    setFlash(req, 'success', 'Iscrizione aggiornata con successo.');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/registrations/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM registrations WHERE id = $1', [req.params.id]);
    setFlash(req, 'success', 'Iscrizione eliminata.');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

/* SPORT */
app.post('/admin/sports/create', requireAuth, async (req, res, next) => {
  try {
    const { name, price } = req.body;

    if (!name?.trim()) {
      setFlash(req, 'error', 'Inserisci il nome dello sport.');
      return res.redirect('/admin');
    }

    await pool.query(
      'INSERT INTO sports (name, price, is_open) VALUES ($1,$2,true)',
      [name.trim(), Number(price || 0)]
    );

    setFlash(req, 'success', 'Sport aggiunto correttamente.');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/sports/:id/update', requireAuth, async (req, res, next) => {
  try {
    const { name, price, is_open } = req.body;

    await pool.query(
      'UPDATE sports SET name=$1, price=$2, is_open=$3, updated_at=NOW() WHERE id=$4',
      [name.trim(), Number(price || 0), is_open === 'on', req.params.id]
    );

    setFlash(req, 'success', 'Sport aggiornato.');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

/* SETTINGS */
app.post('/admin/settings/update', requireAuth, async (req, res, next) => {
  try {
    const payload = {
  registrations_open: req.body.registrations_open === 'true' ? 'true' : 'false',
  contact_email: req.body.contact_email || '',
  contact_facebook: req.body.contact_facebook || '',
  contact_instagram: req.body.contact_instagram || '',
  site_regolamento_accesso: req.body.site_regolamento_accesso || ''
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

/* SPONSOR CLOUDINARY */
app.post('/admin/sponsors/create', requireAuth, upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) {
      setFlash(req, 'error', 'Seleziona un logo sponsor.');
      return res.redirect('/admin');
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'palio/sponsors',
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg']
        },
        (error, uploaded) => {
          if (error) return reject(error);
          resolve(uploaded);
        }
      );
      stream.end(req.file.buffer);
    });

    await pool.query(
      'INSERT INTO sponsors (nome, logo_url) VALUES ($1, $2)',
      [req.body.nome || '', result.secure_url]
    );

    setFlash(req, 'success', 'Sponsor caricato con successo.');
    res.redirect('/admin');
  } catch (err) {
    console.error('Errore upload sponsor:', err);
    next(err);
  }
});

app.post('/admin/sponsors/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM sponsors WHERE id = $1', [req.params.id]);
    setFlash(req, 'success', 'Sponsor eliminato.');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

/* REGOLAMENTI CLOUDINARY */
app.post('/admin/regolamenti/create', requireAuth, upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) {
      setFlash(req, 'error', 'Seleziona un file PDF.');
      return res.redirect('/admin');
    }

    const titolo = (req.body.titolo || 'Regolamento').trim();

    const safeTitle = titolo
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'palio/regolamenti',
          resource_type: 'raw',
          public_id: `${safeTitle}-${Date.now()}`,
          format: 'pdf'
        },
        (error, uploaded) => {
          if (error) return reject(error);
          resolve(uploaded);
        }
      );
      stream.end(req.file.buffer);
    });

    await pool.query(
      'INSERT INTO regolamenti (titolo, file_url) VALUES ($1, $2)',
      [titolo, result.secure_url]
    );

    setFlash(req, 'success', 'Regolamento caricato con successo.');
    res.redirect('/admin');
  } catch (err) {
    console.error('Errore upload regolamento:', err);
    next(err);
  }
});

app.post('/admin/regolamenti/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM regolamenti WHERE id = $1', [req.params.id]);
    setFlash(req, 'success', 'Regolamento eliminato.');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

/* EXPORT EXCEL */
app.get('/admin/export/excel', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        r.id,
        r.birth_date,
        r.email,
        r.rione,
        s.name AS sport,
        s.price,
        r.notes,
        r.created_at,
        r.updated_at,

        r.player1_full_name,
        r.player1_tax_code,
        r.player1_phone,
        r.player1_rione_criteria,
        r.player1_rione_address,
        r.player1_shirt,
        r.player1_shirt_size,

        r.player2_full_name,
        r.player2_tax_code,
        r.player2_phone,
        r.player2_rione_criteria,
        r.player2_rione_address,
        r.player2_shirt,
        r.player2_shirt_size,

        r.fee_confirmation,
        r.terms_rione_check,
        r.terms_organizer_confirmation,
        r.terms_privacy,
        r.terms_images,
        r.terms_liability

      FROM registrations r
      JOIN sports s ON s.id = r.sport_id
      ORDER BY s.name ASC, r.created_at DESC
    `);

    function formatMaglia(value, size) {
      if (!value) return 'NO';
      const v = String(value).toLowerCase();
      if (v === 'true' || v === 'yes' || v === 'si') {
        return size ? `SI - ${size}` : 'SI';
      }
      return 'NO';
    }

    const workbook = new ExcelJS.Workbook();
    const grouped = {};

    rows.forEach((row) => {
      if (!grouped[row.sport]) grouped[row.sport] = [];

      grouped[row.sport].push({
        nome_cognome: row.player1_full_name || '',
        data_nascita: row.birth_date ? new Date(row.birth_date).toLocaleDateString('it-IT') : '',
        cf: row.player1_tax_code || '',
        telefono: row.player1_phone || '',
        email: row.email || '',
        maglietta: formatMaglia(row.player1_shirt, row.player1_shirt_size),
        rione: row.rione || '',
        sport: row.sport || '',
        prezzo: row.price != null ? Number(row.price).toFixed(2) : '',
        criterio_rione: row.player1_rione_criteria || '',
        indirizzo_rione: row.player1_rione_address || '',
        conferma_quota: row.fee_confirmation || '',
        controllo_rione: row.terms_rione_check || '',
        conferma_organizzatori: row.terms_organizer_confirmation || '',
        privacy: row.terms_privacy || '',
        immagini: row.terms_images || '',
        responsabilita: row.terms_liability || '',
        note: row.notes || '',
        creato_il: row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : ''
      });

      if (row.player2_full_name && String(row.player2_full_name).trim() !== '') {
        grouped[row.sport].push({
          nome_cognome: row.player2_full_name || '',
          data_nascita: row.birth_date ? new Date(row.birth_date).toLocaleDateString('it-IT') : '',
          cf: row.player2_tax_code || '',
          telefono: row.player2_phone || '',
          email: row.email || '',
          maglietta: formatMaglia(row.player2_shirt, row.player2_shirt_size),
          rione: row.rione || '',
          sport: row.sport || '',
          prezzo: row.price != null ? Number(row.price).toFixed(2) : '',
          criterio_rione: row.player2_rione_criteria || '',
          indirizzo_rione: row.player2_rione_address || '',
          conferma_quota: row.fee_confirmation || '',
          controllo_rione: row.terms_rione_check || '',
          conferma_organizzatori: row.terms_organizer_confirmation || '',
          privacy: row.terms_privacy || '',
          immagini: row.terms_images || '',
          responsabilita: row.terms_liability || '',
          note: row.notes || '',
          creato_il: row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : ''
        });
      }
    });

    Object.keys(grouped).forEach((sportName) => {
      const safeSheetName = sportName.substring(0, 31);
      const sheet = workbook.addWorksheet(safeSheetName);

      sheet.columns = [
        { header: 'NOME COGNOME', key: 'nome_cognome', width: 28 },
        { header: 'DATA DI NASCITA', key: 'data_nascita', width: 18 },
        { header: 'CF', key: 'cf', width: 22 },
        { header: 'NUMERO TELEFONO', key: 'telefono', width: 18 },
        { header: 'EMAIL', key: 'email', width: 28 },
        { header: 'MAGLIETTA', key: 'maglietta', width: 16 },
        { header: 'RIONE', key: 'rione', width: 20 },
        { header: 'SPORT', key: 'sport', width: 24 },
        { header: 'PREZZO', key: 'prezzo', width: 12 },
        { header: 'CRITERIO RIONE', key: 'criterio_rione', width: 22 },
        { header: 'INDIRIZZO RIONE', key: 'indirizzo_rione', width: 28 },
        { header: 'CONFERMA QUOTA', key: 'conferma_quota', width: 18 },
        { header: 'CONTROLLO RIONE', key: 'controllo_rione', width: 18 },
        { header: 'CONFERMA ORGANIZZATORI', key: 'conferma_organizzatori', width: 24 },
        { header: 'PRIVACY', key: 'privacy', width: 12 },
        { header: 'IMMAGINI', key: 'immagini', width: 12 },
        { header: 'RESPONSABILITÀ', key: 'responsabilita', width: 16 },
        { header: 'NOTE', key: 'note', width: 30 },
        { header: 'CREATO IL', key: 'creato_il', width: 22 }
      ];

      grouped[sportName].forEach((item) => sheet.addRow(item));

      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    });

    if (Object.keys(grouped).length === 0) {
      const sheet = workbook.addWorksheet('Iscrizioni');
      sheet.columns = [{ header: 'Messaggio', key: 'msg', width: 30 }];
      sheet.addRow({ msg: 'Nessuna iscrizione presente' });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="iscrizioni-palio-divise-per-sport.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

app.post('/admin/news/create', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      setFlash(req, 'error', 'Seleziona una locandina.');
      return res.redirect('/admin');
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'palio/news',
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
        },
        (error, uploaded) => {
          if (error) return reject(error);
          resolve(uploaded);
        }
      );
      stream.end(req.file.buffer);
    });

    await pool.query(
      'INSERT INTO news (titolo, image_url) VALUES ($1, $2)',
      [req.body.titolo || '', result.secure_url]
    );

    setFlash(req, 'success', 'Locandina caricata con successo.');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/news/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);
    setFlash(req, 'success', 'Locandina eliminata.');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

app.post('/admin/media/video', requireAuth, upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      setFlash(req, 'error', 'Seleziona un video.');
      return res.redirect('/admin');
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'palio/video',
          resource_type: 'video',
          use_filename: true,
          unique_filename: true
        },
        (error, uploaded) => {
          if (error) return reject(error);
          resolve(uploaded);
        }
      );
      stream.end(req.file.buffer);
    });

    await pool.query(
      `INSERT INTO site_media (key, value, updated_at)
       VALUES ('homepage_video_url', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [result.secure_url]
    );

    setFlash(req, 'success', 'Video caricato con successo.');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

/* ERROR HANDLER */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Errore interno del server. Controlla la configurazione del database e delle variabili ambiente.');
});

runSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server avviato su http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Errore avvio applicazione:', err);
    process.exit(1);
  });
