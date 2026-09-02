# PalaRivals Watch

PalaRivals Watch is a browser-based autobattler featuring characters inspired by Marvel Rivals, Overwatch, and Paladins.

Created by Robert, Nick, and Azzy.

## Fan project notice

This is a fan-made project. Characters and related properties belong to NetEase Games, Blizzard Entertainment, and Hi-Rez Studios.

## Account setup

The sign-up and login form uses the server endpoint at `/api/auth`, so open the project through `npm start`, `vercel dev`, or a Vercel deployment instead of opening `Main.html` directly.

1. Copy `.env.example` to `.env.local` and fill in `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE`, and `DB_PORT`.
2. Run `database/migrations/001_secure_user_passwords.sql` once against the SQL Server database. It expands the password column for secure hashes and prevents duplicate usernames.
3. Run `npm install`, then `npm start` for local development.

For Vercel, add those same `DB_*` values under **Project Settings → Environment Variables**, enable them for the environments you use, and redeploy. Local `.env.local` values are intentionally not committed to GitHub.

Passwords are stored as salted scrypt hashes. Existing plaintext account passwords are upgraded automatically after a successful login.
