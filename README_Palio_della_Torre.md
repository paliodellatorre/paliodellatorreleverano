# Palio della Torre Leverano --- Guida Rapida

Questo progetto è il sito ufficiale per la gestione delle iscrizioni,
novità, regolamenti e sponsor del **Palio della Torre Leverano**.

## Funzionalità principali

-   Iscrizioni online ai tornei
-   Pannello Admin per gestione iscrizioni
-   Upload locandine (Novità)
-   Upload video pubblicitario homepage
-   Upload regolamenti PDF
-   Gestione sponsor
-   Esportazione Excel iscrizioni divise per sport
-   Regolamento iniziale obbligatorio prima dell'accesso

------------------------------------------------------------------------

## Requisiti

-   Node.js 18 o superiore
-   Database PostgreSQL
-   Account Cloudinary

------------------------------------------------------------------------

## Variabili ambiente (.env)

Creare un file `.env` con:

DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

SESSION_SECRET=una_stringa_segreta

ADMIN_USERNAME=admin ADMIN_PASSWORD=password

CLOUDINARY_CLOUD_NAME=nome_cloud CLOUDINARY_API_KEY=chiave
CLOUDINARY_API_SECRET=segreto

NODE_ENV=production

------------------------------------------------------------------------

## Avvio locale

Installare dipendenze:

npm install

Avviare il server:

npm start

Il sito sarà disponibile su:

http://localhost:3000

------------------------------------------------------------------------

## Deploy su Render

1.  Caricare il progetto su GitHub
2.  Creare un nuovo Web Service su Render
3.  Collegare il repository
4.  Inserire le variabili ambiente
5.  Deploy automatico

------------------------------------------------------------------------

## Struttura progetto

server.js → logica principale

views/ home.ejs ingresso.ejs admin-dashboard.ejs

public/ styles.css logo-pdt.png

db/ schema.sql

------------------------------------------------------------------------

## Note operative

-   Le locandine vengono caricate nella sezione NOVITÀ
-   Il video pubblicitario appare automaticamente sulla homepage
-   Il video può essere eliminato dal pannello Admin
-   Le iscrizioni vengono salvate nel database in modo permanente

------------------------------------------------------------------------

## Supporto

Per modifiche o assistenza tecnica, contattare lo sviluppatore del
progetto.
