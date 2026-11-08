# Deployment

Kaapi Hills Estate: a direct-booking site and enquiry inbox for Company A, built as one Next.js app with Postgres.

- **Repository:** https://github.com/abhisheksouw21/Isocode_labs
- **Live app:** https://resort-direct-6hjk.vercel.app

## Demo logins

Guests book without an account. Staff sign in at `/staff/login`.

| Role | Email | Can do |
| --- | --- | --- |
| General Manager (admin) | `gm@kaapihills.test` | Everything: inbox, unsorted lane, complaint alerts, rates, allotment, blackouts, promos, bookings |
| Reservations | `priya@kaapihills.test` | Inbox: room enquiries, re-route, edit drafts, mark replied |
| Reservations | `rahul@kaapihills.test` | Same as Priya |
| Events & Sales | `anita@kaapihills.test` | Inbox: wedding and offsite enquiries |

The password for all four is `estate-demo-2026`, unless `DEMO_PASSWORD` was set when the database was seeded. These are demo accounts on seeded data, not real credentials.

**Test payment:** the payment step is a mock gateway. Click **Pay** to confirm, or **Simulate declined card** to see the hold released. No card details are asked for.

**Promo codes:** `DIRECT10` (10% off), `LONGSTAY15` (15% off, 4+ nights, limited to 50 uses), `MONSOON20` (20% off, June to mid-September, 2+ nights).

**Try this first:**

1. On the home page, search the coming 14–16 Nov for 2 adults and 1 child. The seed leaves one Coffee Bungalow Villa and sells out the Pool Villa on those dates.
2. Book the villa. Search the same dates again: it's now sold out.
3. Sign in as the GM. Open ENQ-4411: the draft quotes the live villa price. Click **Recheck prices**: the draft now says the villas are full and offers the room that's still free.

## Run it locally

You need Node.js 20 or newer and PostgreSQL 14 or newer.

```bash
git clone <repo-url> resort-direct && cd resort-direct
npm install

# Postgres: use your own, or start one with Docker
docker compose up -d        # port 5432 taken? run: DB_PORT=5433 docker compose up -d, and use :5433 in DATABASE_URL

cp .env.example .env
# then set at least:
#   DATABASE_URL=postgresql://resort:resort@localhost:5432/resort
#   SESSION_SECRET=<any 32+ character random string>

npm run db:migrate     # creates tables and constraints
npm run db:seed        # rooms, 14 months of rates, sample bookings, sample enquiries
npm run dev            # http://localhost:3000
```

Running `npm run db:seed` again resets everything. Seeded dates are relative to the day you run it.

### Tests and checks

The tests need a separate, empty database. They run migrations on it themselves.

```bash
createdb resort_test            # or create it in your Postgres tool
TEST_DATABASE_URL=postgresql://resort:resort@localhost:5432/resort_test npm test

npm run ai:eval                 # routing accuracy on the held-out enquiry set
npm run typecheck && npm run lint
```

`TEST_DATABASE_URL` defaults to `postgresql://resort:resort@localhost:5432/resort_test`.

## How it is deployed

- **App:** Vercel, Next.js preset, project root at the top of the repo. The build command is `npm run vercel-build`, which applies migrations and then runs `next build`.
- **Database:** Neon Postgres (free tier). Use the pooled connection string with `?sslmode=require`.
- **Cron:** `vercel.json` calls `/api/cron/release-holds` once a day. It releases stale holds and deletes enquiries past their retention date. Holds are also released on every search and booking, so the app doesn't depend on the cron.

Steps:

1. Create a Neon project and copy its connection string.
2. Import the GitHub repo into Vercel and add the environment variables below.
3. Deploy. Then seed once from your machine: `DATABASE_URL=<neon url> npm run db:seed`.

## Environment variables

Names only. Never commit values.

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `SESSION_SECRET` | Yes | Signs staff session cookies (32+ characters) |
| `CRON_SECRET` | In production | Bearer token Vercel Cron sends to the cleanup route |
| `DEMO_PASSWORD` | No | Password for seeded demo staff accounts |
| `AI_CONFIDENCE_THRESHOLD` | No | Enquiries below this go to the Unsorted lane (default `0.65`) |
| `LLM_API_KEY` | No | Turns on the optional cloud model; leave empty to use only the local model |
| `LLM_BASE_URL` | No | Any OpenAI-compatible endpoint (defaults to Gemini's) |
| `LLM_MODEL` | No | Model name for that endpoint |
| `TEST_DATABASE_URL` | Tests only | Database the test suite may wipe |
