# CamPulse

**The pulse of your campus. Everything, in one place.**

Multi-tenant campus super-app (SRM = campus 1). Built localhost-first with
Next.js 14 (App Router) + TypeScript + Prisma + NextAuth.

> **Initiated by Abdul Rahman** ([@theabdlrah](https://github.com/theabdlrah)) —
> [LinkedIn](https://www.linkedin.com/in/theabdlrah/).

> Runs on `npm run dev` with **zero setup** (SQLite). For deploy, swap the
> Prisma provider to `postgresql` and set `DATABASE_URL` — the schema is
> otherwise identical. See `DEPLOY.md`.

## What's built

Multi-tenant from day one (every entity carries `campusId`, SRM = 1).

- **Auth** — email+password **and** passwordless OTP, with an inbox-ownership gate
  (domain allowlist `@srmist.edu.in` **+** OTP proof). Role-gated
  (`STUDENT | MODERATOR | ADMIN`).
- **Verification hardening** — legacy `/api/signup` bypass removed; OTP rate-limited
  (per-email + per-IP, 429 after 5/15m); enumeration-safe; constant-time code
  compare; password login rejects unverified accounts.
- **Feed** — compose, like, nested comments + comment likes, edit (15-min window,
  ✎ marker), soft-delete/recover, bookmarks + Saved tab, post detail page,
  copy-link/share, skeleton loaders, infinite scroll, personalised feed
  (following/all, hides blocked + muted + hidden posts).
- **Profile** — Twitter-style (`/u/@handle`), 14-day handle-change rule, avatar
  upload, edit bio/dept/batch.
- **Events** — curated SRM feed, student RSVP, owner-authenticated
  IG/Reddit ingest layer (failsafe → curated data).
- **Social graph (API)** — follow/unfollow, mute (user/hashtag/topic),
  block (mutual hide), repost/quote, notifications.
- **Admin (role-gated)** — users (ban/role), reports (resolve/dismiss),
  events (create/approve), approval-gated admin access.
- **Discovery** — hashtag/`@user` search, "What's hot in SRM" sidebar, trending.

> **Status:** V1 + Phase 1 (post engagement) + Phase 2 (verification hardening)
> + Phase 3 (social-graph API) are built, committed, and runtime-verified.
> Next: Phase 4 — social-graph UI (3-dot menus, notifications page, repost/quote
> modals, feed controls).

## Build process & history

The project was initiated by Abdul Rahman ([@theabdlrah](https://github.com/theabdlrah),
[LinkedIn](https://www.linkedin.com/in/theabdlrah/)) and built localhost-first with
Next.js 14 + TypeScript + Prisma + NextAuth. The path from idea to current state
included deliberate wrong turns that shaped the architecture:

- **Renamed SRM_One → CamPulse** — the working name had to signal "any campus,"
  not one institution, to match the multi-tenant goal.
- **Rejected the SRM-Academia portal proxy** — it returns HTML, not JSON, and is a
  security risk. Verification is email-OTP only.
- **Reverted a Vercel/Postgres attempt** — SQLite can't persist on Vercel's
  ephemeral filesystem and there was no hosted DB; we parked deploy and kept SQLite
  for zero-setup local dev (schema is portable to Postgres).
- **Rebuilt Events ingestion** — unauthenticated Reddit/IG scraping is bot-blocked
  (403); the feature is now curated seed data + optional owner-authenticated
  ingestion with a graceful failsafe.
- **Fixed a feed self-censorship bug** — blocking a user previously hid the
  viewer's *own* posts (the feed flattened both sides of each Block row). Corrected
  to hide only the other party. See commit `dfbc6c5`.

Lesson baked in: a green `npm run build` proves it compiles, not that it's correct —
every endpoint is exercised at runtime before being called done.

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
- **Study Hub is user-submitted only.** Resources are student-owned share links,
  admin-approved before public. CamPulse **never scrapes or imports** another
  site's library (THE HELPER, SRM VERSE, etc.). The competitive edge is the
  platform experience (discovery + community), not copying content.
- **Differentiator = discovery, not storage.** Files are a commodity anyone can
  collect. CamPulse's moat is finding the *right* resource in <10 seconds
  (search + dept/semester/type filters + tags + trust signals). Vision:
  *"THE HELPER stores resources. CamPulse helps you find the right resource."*

## Scripts

| command | what it does |
|---|---|
| `npm run dev` | dev server on :3000 |
| `npm run build` | production build (authoritative type-check) |
| `npm run db:seed` | seed campus + communities + admin |
| `npm run db:seed-all` | seed posts + events too |
| `npm run db:studio` | Prisma Studio |
