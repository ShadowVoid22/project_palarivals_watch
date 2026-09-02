# PalaRivals Watch

PalaRivals Watch is a browser-based autobattler featuring characters inspired by Marvel Rivals, Overwatch, and Paladins.

Created by Robert, Nick, and Azzy.

## Fan project notice

This is a fan-made project. Characters and related properties belong to NetEase Games, Blizzard Entertainment, and Hi-Rez Studios.

## Account setup

The sign-up and login form uses the server endpoint at `/api/auth`, so open the project through `npm start`, `vercel dev`, or a Vercel deployment instead of opening `Main.html` directly.

1. Copy `.env.example` to `.env.local` and fill in `AUTH_SESSION_SECRET`, `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE`, and `DB_PORT`.
2. Run `database/migrations/001_secure_user_passwords.sql` once against the SQL Server database. It expands the password column for secure hashes and prevents duplicate usernames.
3. Run `npm install`, then `npm start` for local development.

The authentication API also performs this small migration automatically when needed. Running the SQL file manually is still recommended; automatic migration requires the configured database user to have `ALTER TABLE` and `CREATE INDEX` permission.

For Vercel, add those same `DB_*` values and `AUTH_SESSION_SECRET` under **Project Settings → Environment Variables**, enable them for the environments you use, and redeploy. Local `.env.local` values are intentionally not committed to GitHub. If `AUTH_SESSION_SECRET` is omitted, the app temporarily falls back to `DB_PASSWORD`, but a separate long random secret is recommended.

Passwords are stored as salted scrypt hashes. Existing plaintext account passwords are upgraded automatically after a successful login.

## Career profile tracking

Completed Standard, Online Operations, Ability Draft, Leader Protocol, and Hero Chess matches update the signed-in player's wins, losses, matches played, win rate, and most-used heroes. Run `database/migrations/003_profile_stats.sql` against the account database before deployment. The production database user needs `SELECT`, `INSERT`, and `UPDATE` permission on `ProfileMatches` and `ProfileHeroUsage`. The API can create the tables automatically when its database user has schema-creation permission.

Players who signed in before profile tracking was added must log out and sign back in once to receive a signed account session.

## Online Operations mode

Online Operations is the main menu's real-player mode and is separate from Arcade. Matches support eight commanders. Players joining the same queue are placed together, and any open seats are filled by AI after the queue countdown or when a player chooses **Launch now with AI**.

The mode uses an authoritative SQL Server match record and short polling so it can run on the existing Vercel deployment without a permanent WebSocket server. Purchases, movement, ready state, combat, health, and eliminations are all validated by the server. A disconnected player can reconnect with the locally stored match token; after the disconnect grace period, AI takes control of that seat.

Before deploying the mode, run `database/migrations/002_online_matches.sql` against the same SQL Server database used for accounts. The production database user needs `SELECT`, `INSERT`, and `UPDATE` permission on `OnlineMatches`. The API will try to create this table automatically when it is missing, but the migration is recommended because automatic setup also requires schema-creation permissions.

For local multiplayer testing, make sure the `DB_*` variables in `.env.local` point to a development database, start the app with `npm start`, then open `/OnlineLobby.html` in two browser sessions. Without those variables, the page intentionally shows a database-setup message rather than starting a fake online match.
