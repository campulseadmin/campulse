# Deploying CamPulse to Vercel

SQLite does NOT work on Vercel (serverless FS is read-only + ephemeral). The
schema is already Postgres (`provider = "postgresql"` in prisma/schema.prisma),
so the only real requirement is a hosted Postgres database.

## 1. One-time: install CLI + login
```
npm i -g vercel
vercel login
```

## 2. Deploy (from the project root)
```
vercel
```
- When prompted for "Database" / Storage, choose **Postgres** (Vercel Postgres)
  — this auto-injects `DATABASE_URL` and sets `NEXTAUTH_URL` to the deploy URL.
- Framework preset: Next.js (auto-detected).
- Build command: `npm run vercel-build` (already in package.json). It runs
  `prisma generate && prisma db push && seed && seed-events && next build`, so a
  FRESH database launches with the SRM campus, communities, an admin, and the
  16 seeded events already populated.

## 3. Set environment variables (Vercel Dashboard → Project → Settings → Env)
Required:
- `NEXTAUTH_SECRET` — `openssl rand -base64 32` (random string)
- `EMAIL_MODE` — `smtp` (or `console` for a no-email test deploy)
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — only if EMAIL_MODE=smtp
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_HANDLE` — bootstrap the first admin
  (idempotent; change from the dev defaults!)
Optional (event sync from your own handles):
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_SUBREDDIT`
- `IG_USER_ID`, `IG_ACCESS_TOKEN`, `IG_HANDLE`

If you used Vercel Postgres, `DATABASE_URL` is already set — do NOT override it
unless you're pointing at Neon/Supabase instead.

## 4. Redeploy after adding env vars
```
vercel --prod
```

## 5. First login
Sign in with the admin email/handle you set in step 3, or create a new account
via OTP (needs EMAIL_MODE=smtp). Admin panel is at `/admin`.

## Notes
- `db push` (not migrations) is used so the schema stays simple; fine for V1.
- Local dev: set the schema provider back to `sqlite` and `DATABASE_URL=file:./dev.db`
  if you want to run locally without Postgres.
- After deploy, rotate any tokens you pasted into chat (GitHub PAT, etc.).
