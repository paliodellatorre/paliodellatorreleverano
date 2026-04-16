# Palio della Torre — sito completo con database

Questo progetto è una versione completa del sito con:

- Home page con colori personalizzati
- Iscrizioni online
- Pannello admin
- Modifica / eliminazione iscrizioni
- Gestione sport e prezzi
- Apertura / chiusura iscrizioni
- Export Excel
- Database PostgreSQL persistente

## Stack

- Node.js + Express
- EJS
- PostgreSQL
- Express Session
- ExcelJS

## Avvio locale

1. Copia `.env.example` in `.env`
2. Inserisci la tua `DATABASE_URL`
3. Installa dipendenze:

```bash
npm install
```

4. Avvia:

```bash
npm start
```

Il server parte su `http://localhost:3000`

## Credenziali admin

Le credenziali admin si configurano in `.env`:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## Deploy su Render

### 1. Crea database PostgreSQL su Render
- Vai su Render
- Crea un nuovo PostgreSQL
- Copia la `Internal Database URL` oppure `External Database URL`

### 2. Crea Web Service
- Collega il repository GitHub
- Build Command:

```bash
npm install
```

- Start Command:

```bash
npm start
```

### 3. Variabili ambiente
Imposta queste variabili:

- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `NODE_ENV=production`

## Note importanti

- Le iscrizioni **non si perdono** perché vengono salvate su PostgreSQL.
- Al riavvio del server i dati restano.
- Il file `db/schema.sql` crea automaticamente tabelle e dati iniziali al primo avvio.

## Personalizzazioni consigliate

- Sostituire il placeholder logo
- Inserire storia ufficiale del Palio
- Inserire sponsor reali
- Collegare regolamenti PDF
- Aggiungere filtri di ricerca nel pannello admin
