CREATE TABLE IF NOT EXISTS sports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  team_type VARCHAR(20) NOT NULL DEFAULT 'single',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE sports ADD COLUMN IF NOT EXISTS team_type VARCHAR(20) NOT NULL DEFAULT 'single';
ALTER TABLE sports ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE sports ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  sport_id INTEGER NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  email VARCHAR(150) NOT NULL,
  rione VARCHAR(120) NOT NULL,
  fee_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  player1_full_name VARCHAR(150) NOT NULL,
  player1_tax_code VARCHAR(32) NOT NULL,
  player1_phone VARCHAR(50) NOT NULL,
  player1_rione_criteria VARCHAR(120) NOT NULL,
  player1_rione_address TEXT NOT NULL,
  player1_shirt BOOLEAN NOT NULL DEFAULT FALSE,
  terms_rione_check BOOLEAN NOT NULL DEFAULT FALSE,
  terms_organizer_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  terms_privacy BOOLEAN NOT NULL DEFAULT FALSE,
  terms_images BOOLEAN NOT NULL DEFAULT FALSE,
  terms_liability BOOLEAN NOT NULL DEFAULT FALSE,
  player2_full_name VARCHAR(150),
  player2_tax_code VARCHAR(32),
  player2_phone VARCHAR(50),
  player2_rione_criteria VARCHAR(120),
  player2_rione_address TEXT,
  player2_shirt BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS fee_confirmation BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_full_name VARCHAR(150);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_tax_code VARCHAR(32);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_phone VARCHAR(50);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_rione_criteria VARCHAR(120);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_rione_address TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player1_shirt BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_rione_check BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_organizer_confirmation BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_privacy BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_images BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS terms_liability BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_full_name VARCHAR(150);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_tax_code VARCHAR(32);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_phone VARCHAR(50);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_rione_criteria VARCHAR(120);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_rione_address TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player2_shirt BOOLEAN DEFAULT FALSE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

INSERT INTO sports (name, team_type, price, is_open)
VALUES
  ('Calcio King''s League', 'single', 10, TRUE),
  ('Padel', 'pair', 20, TRUE),
  ('Tennis', 'single', 10, TRUE),
  ('Ping Pong', 'single', 10, TRUE),
  ('Tiro con l''Arco', 'single', 10, TRUE),
  ('Burraco', 'pair', 20, TRUE),
  ('Scacchi', 'single', 10, TRUE),
  ('Scopa', 'pair', 20, TRUE),
  ('Lupopoli', 'single', 10, TRUE),
  ('Volley', 'single', 10, TRUE),
  ('Biliardino', 'pair', 20, TRUE),
  ('Calcio 1 vs 1', 'single', 10, TRUE)
ON CONFLICT (name) DO NOTHING;

DELETE FROM sports WHERE name IN ('Calcio', 'Corsa');

UPDATE sports SET price = 10, team_type = 'single' WHERE name IN ('Calcio King''s League', 'Tennis', 'Ping Pong', 'Tiro con l''Arco', 'Scacchi', 'Lupopoli', 'Volley', 'Calcio 1 vs 1');
UPDATE sports SET price = 20, team_type = 'pair' WHERE name IN ('Padel', 'Burraco', 'Scopa', 'Biliardino');

INSERT INTO site_settings (key, value)
VALUES
  ('registrations_open', 'true'),
  ('contact_phone', '+39 000 000 0000'),
  ('contact_email', 'info@paliodellatorre.it'),
  ('contact_address', 'Leverano (LE)'),
  ('registration_fee_text', '___')
ON CONFLICT (key) DO NOTHING;
