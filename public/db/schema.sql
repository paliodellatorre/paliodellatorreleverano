CREATE TABLE IF NOT EXISTS sports (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  full_name TEXT,
  birth_date DATE,
  phone TEXT,
  email TEXT,
  rione TEXT,
  sport_id INTEGER REFERENCES sports(id),
  notes TEXT,
  player1_full_name TEXT,
  player1_birth_date DATE,
  player1_tax_code TEXT,
  player1_phone TEXT,
  player1_rione_criteria TEXT,
  player1_rione_address TEXT,
  player1_shirt TEXT,
  player1_shirt_size TEXT,
  player2_full_name TEXT,
  player2_birth_date DATE,
  player2_tax_code TEXT,
  player2_phone TEXT,
  player2_rione_criteria TEXT,
  player2_rione_address TEXT,
  player2_shirt TEXT,
  player2_shirt_size TEXT,
  fee_confirmation TEXT,
  terms_rione_check TEXT,
  terms_organizer_confirmation TEXT,
  terms_privacy TEXT,
  terms_images TEXT,
  terms_liability TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_birth_date DATE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_birth_date DATE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_shirt_size TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_shirt_size TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS fee_confirmation TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_rione_check TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_organizer_confirmation TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_privacy TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_images TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_liability TEXT;

CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sponsors (
  id SERIAL PRIMARY KEY,
  nome TEXT,
  logo_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS regolamenti (
  id SERIAL PRIMARY KEY,
  titolo TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  titolo TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_media (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO site_settings (key, value, updated_at) VALUES
('registrations_open', 'true', NOW()),
('contact_email', 'info@paliodellatorre.it', NOW()),
('contact_facebook', 'Il Palio della Torre - Torneo dei Rioni Leverano', NOW()),
('contact_instagram', 'ilpaliodellatorreleverano', NOW()),
('site_regolamento_accesso', '', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO sports (name, price, is_open)
SELECT * FROM (VALUES
  ('Calcio King’s League', 10, true),
  ('Padel', 20, true),
  ('Tennis', 10, true),
  ('Ping Pong', 10, true),
  ('Tiro con l’Arco', 10, true),
  ('Burraco', 20, true),
  ('Scacchi', 10, true),
  ('Scopa', 20, true),
  ('Lupopoli', 10, true),
  ('Volley', 10, true),
  ('Biliardino', 20, true),
  ('Calcio 1vs1', 10, true)
) AS v(name, price, is_open)
WHERE NOT EXISTS (SELECT 1 FROM sports);


CREATE TABLE IF NOT EXISTS kids_registrations (
  id SERIAL PRIMARY KEY,
  child_full_name TEXT NOT NULL,
  child_birth_date DATE NOT NULL,
  child_tax_code TEXT NOT NULL,
  parent_full_name TEXT NOT NULL,
  parent_tax_code TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  privacy_consent TEXT NOT NULL,
  media_consent TEXT DEFAULT 'no',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS pdt_jump_scores (
  id SERIAL PRIMARY KEY,
  nickname TEXT NOT NULL,
  rione TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  level_reached INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- PDT JUMP: un solo punteggio per nickname+rione.
ALTER TABLE pdt_jump_scores
ADD CONSTRAINT pdt_jump_scores_unique_player UNIQUE (nickname, rione);
