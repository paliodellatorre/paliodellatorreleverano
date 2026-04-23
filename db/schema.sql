CREATE TABLE IF NOT EXISTS sports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  birth_date DATE,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(150) NOT NULL,
  rione VARCHAR(120) NOT NULL,
  sport_id INTEGER NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO sports (name, price, is_open)
VALUES
  ('Calcio', 10, TRUE),
  ('Padel', 15, TRUE),
  ('Volley', 8, TRUE),
  ('Corsa', 5, TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO site_settings (key, value)
VALUES
  ('registrations_open', 'true'),
  ('contact_phone', '+39 000 000 0000'),
  ('contact_email', 'info@paliodellatorre.it'),
  ('contact_address', 'Leverano (LE)')
ON CONFLICT (key) DO NOTHING;

-- SPONSOR
CREATE TABLE IF NOT EXISTS sponsors (
  id SERIAL PRIMARY KEY,
  nome TEXT,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- REGOLAMENTI
CREATE TABLE IF NOT EXISTS regolamenti (
  id SERIAL PRIMARY KEY,
  titolo TEXT,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IMPOSTAZIONI GENERALI
CREATE TABLE IF NOT EXISTS impostazioni (
  id SERIAL PRIMARY KEY,
  chiave TEXT UNIQUE,
  valore TEXT
);

-- Inserimenti base
INSERT INTO impostazioni (chiave, valore)
VALUES
('logo_palio', ''),
('mappa_url', '')
ON CONFLICT (chiave) DO NOTHING;

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_full_name TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_tax_code TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_phone TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_rione_criteria TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_rione_address TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_shirt TEXT;

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_full_name TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_tax_code TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_phone TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_rione_criteria TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_rione_address TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_shirt TEXT;

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS fee_confirmation TEXT;

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_rione_check TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_organizer_confirmation TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_privacy TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_images TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_liability TEXT;

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_shirt_size TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_shirt_size TEXT;


CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  titolo TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
