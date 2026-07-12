# CamPulse

**The pulse of your campus. Everything, in one place.**

Multi-tenant campus super-app (SRM = campus 1). Built localhost-first with
Next.js 14 (App Router) + TypeScript + Prisma + NextAuth.

> Runs on `npm run dev` with **zero setup** (SQLite). For deploy, swap the
> Prisma provider to `postgresql` and set `DATABASE_URL` — the schema is
> otherwise identical. See `DEPLOY.md`.

## What's built (V1 + Phase 2)

- **Auth** — email+password **and** passwordless OTP, with a real inbox-ownership
  gate (domain allowlist `@srmist.edu.in` **+** OTP proof). Role-gated
  (`STUDENT | MODERATOR | ADMIN`).
- **Verification hardening (Phase 2)** — legacy `/api/signup` bypass removed;
  OTP rate-limited (per-email + per-IP, 429 after 5/15m); enumeration-safe;
  constant-time code compare; password login rejects unverified accounts.
- **Feed** — compose, like, nested comments + comment likes, edit (15-min window,
  ✎ marker), soft-delete/recover, bookmarks + Saved tab, copy-link/share,
  skeleton loaders, infinite scroll.
- **Profile** — Twitter-style (`/u/@handle`), 14-day handle-change rule, avatar
  upload, edit bio/dept/batch.
- **Events** — curated SRM feed, student RSVP, owner-authenticated
  IG/Reddit ingest layer (failsafe → curated data).
- **Admin (role-gated)** — users (ban/role), reports (resolve/dismiss),
  events (create/approve), approval-gated admin access.
- **Discovery** — hashtag/`@user` search, "What's hot in SRM" sidebar, trending.

## Quick start

```bash
cd campulse
npm install        # first time only
npm run dev        # → http://localhost:3000
```

Demo logins (password `demo1234`): `aarav.cse` (ADMIN), `meera.aiml`,
`karthik.ece`, `sara.design`.

## Project layout

```
app/            routes (feed, profile, events, admin, auth, api/*)
components/     AppShell, AdminShell, Avatar, BrandLogo
lib/            auth, otp, email, password, prisma, session
prisma/         schema.prisma, migrations, seed scripts
```

## Email / OTP

- Default dev mode (`EMAIL_MODE=console`) prints the OTP to the terminal **and**
  surfaces it on-screen so you can complete signup without a real inbox.
- For production deliverability, set `EMAIL_MODE=smtp` (or Resend/Postmark) + a
  verified domain. See `CampPulse-email-verification-brief.md` on the Desktop.

## Hard rules (architecture)

- Multi-tenant from day one: `campusId` on every entity. No cross-campus leakage.
- The SRM-Academia proxy (`campusweb.in`) is **rejected** — it breaks (returns
  HTML, not JSON). CamPulse never depends on it.
- `.env` is gitignored (never committed). `npm run build` is the authoritative
  type-check.

## Scripts

| command | what it does |
|---|---|
| `npm run dev` | dev server on :3000 |
| `npm run build` | production build (authoritative type-check) |
| `npm run db:seed` | seed campus + communities + admin |
| `npm run db:seed-all` | seed posts + events too |
| `npm run db:studio` | Prisma Studio |
