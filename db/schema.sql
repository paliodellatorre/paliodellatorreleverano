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
