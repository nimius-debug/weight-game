# ⚖️ Weight Game

A small, phone-friendly **weight-loss accountability game** for a group of
friends. Everyone logs their weight; a leaderboard ranks players by a **fair,
blended Game Score** that rewards how much they lose, their logging streak, and
their overall consistency. Runs as a **fixed challenge with a crowned winner**.

Built with Next.js (App Router) + Postgres (Drizzle ORM), deployable for free on
Vercel + Neon.

## How scoring works

`Game Score = weightPoints + consistencyPoints + streakPoints`

| Component | Formula | Notes |
|-----------|---------|-------|
| **Weight** | `% of baseline lost × 10` | The star. Uses *percentage* so a heavier person isn't favored. Gains go negative. |
| **Consistency** | `(daysLogged / daysElapsed) × 30` | Up to **+30 pts** for logging every expected day. |
| **Streak** | `min(currentStreak, 21) × 1` | Up to **+21 pts**. A missed day breaks it (1-day grace so "haven't weighed in yet today" doesn't). |

All constants live in `DEFAULT_CONFIG` in `src/lib/scoring.ts` — tweak the balance
there. The scoring engine is a pure function (`computeLeaderboard`) with full unit
tests in `src/lib/scoring.test.ts`.

## Project layout

- `src/lib/scoring.ts` — pure scoring engine (no DB/framework deps).
- `src/lib/weighins.ts` — **single** `logWeighIn` service used by both the web
  form and the future SMS webhook (the seam that makes SMS a small add-on).
- `src/lib/queries.ts` — read helpers + leaderboard assembly.
- `src/db/schema.ts` — Drizzle schema (`users`, `challenges`, `participants`, `weigh_ins`).
- `src/app/` — pages: `/` (home), `/leaderboard`, `/u/[token]` (personal dashboard),
  `/admin` (token-gated setup).
- `scripts/seed.ts` — demo challenge with 4 players.

## Local development

1. **Install**
   ```bash
   npm install
   ```
2. **Configure** — copy `.env.example` to `.env.local` and set `DATABASE_URL`
   (a free [Neon](https://neon.tech) Postgres works great) and a random `ADMIN_TOKEN`.
3. **Create tables**
   ```bash
   npm run db:push        # or: npm run db:generate && npm run db:migrate
   ```
   (drizzle-kit reads `DATABASE_URL` from the environment — export it or prefix the command.)
4. **Seed demo data (optional)**
   ```bash
   npm run db:seed
   ```
5. **Run**
   ```bash
   npm run dev
   ```
   - Set up a challenge at `/admin?token=YOUR_ADMIN_TOKEN`.
   - Hand each friend their personal link (`/u/<token>`) to bookmark.
   - Watch `/leaderboard`.

## Tests

```bash
npm run test
```

## Deploy (free tier)

1. Create a Neon Postgres database; copy its connection string.
2. Import the repo into Vercel. Set env vars: `DATABASE_URL`, `ADMIN_TOKEN`,
   `NEXT_PUBLIC_BASE_URL` (your Vercel URL), and optionally `APP_TIMEZONE`
   (e.g. `America/New_York`) so streaks flip at *local* midnight.
3. Run `npm run db:push` against the Neon DB once to create the tables.

## Roadmap: SMS hybrid ("text a number")

The architecture is ready for it: add `src/app/api/sms/route.ts` as a Twilio
webhook that parses a text like `182.4`, looks up the sender by `phone`, and calls
the **same** `logWeighIn({ phone, weight, source: "sms" })` service the web form
uses. Store each player's phone (already a field on `users`) when setting up the
challenge.
