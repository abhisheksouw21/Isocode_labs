# Kaapi Hills Estate: direct booking and AI enquiry routing

A booking website and staff workspace for a 76-key coffee-estate resort in Chikkamagaluru, Karnataka. Guests pick dates, see real prices with GST, and pay. Every enquiry, whether it comes from the web form, email or WhatsApp, lands in one inbox and goes to the right person with a draft reply ready.

Built for Isocode Labs, Problem 5: "Hill resort's direct-booking website with AI enquiry routing".

- **Live app:** https://resort-direct-6hjk.vercel.app
- **Staff login:** https://resort-direct-6hjk.vercel.app/staff/login
- **Repository:** https://github.com/abhisheksouw21/Isocode_labs
- **Deployment, demo logins and environment variables:** [`deployment.md`](./deployment.md)
- **Design decisions, data model, assumptions and limits:** [`docs/TDD.md`](./docs/TDD.md)

---

## What we built

### For guests

- **Home page.** Every room and villa is shown with live availability and the average nightly price, including GST, for the dates picked.
- **Room pages.** Each has a photo gallery, details and three rate plans: with breakfast, pay now for 10% off, or breakfast and dinner. Each plan shows a full price breakdown, night by night, with GST.
- **Booking in 3 steps:**
  1. Stay: dates and room.
  2. Details: name, email and phone, a consent checkbox and an optional promo code.
  3. Payment: a test-mode payment, with the room held for 10 minutes while the guest pays.
- **Confirmation page,** with check-in information. ID and Form C are handled at the front desk, never online.
- **Enquiry form** for weddings, offsites and general questions.

### For staff (Reservations, Events & Sales)

- **One inbox** for web, email and WhatsApp messages. Email and WhatsApp are simulated in this build.
- **AI routing.** Each enquiry is classified as a room booking, wedding, offsite or complaint, with a confidence score. The dates, guest count, budget and room type are pulled out of the message, and the enquiry is assigned to the least-busy person on the right team.
- **Draft replies.** The prices and availability in a draft come from the database, never from the AI. A **Recheck prices** button rebuilds them from live data.
- **One-click re-route** when the AI gets it wrong. Every override is logged.
- **A price guard.** If someone types a rupee amount that didn't come from the rate table, they're asked to confirm it before marking the enquiry replied.
- **Nothing is ever sent automatically.** Staff copy the reply into the original channel.

### For the General Manager (admin)

- **Unsorted lane** for low-confidence enquiries, and **complaint alerts**. Complaints are flagged by keyword rules, so they reach the GM even when the AI misses them.
- **Rates & allotment grid,** 14 nights at a glance. Edit the rate, the number of rooms the website may sell, and blackout dates, for one night or in bulk by date range and weekday.
- **Promo codes,** and **GST slabs** read from a config table.
- **Bookings list,** including live holds and failed payments.

### The hard part: the site never overbooks

- The website sells only the **allotment** the GM sets per room type per night, so agency stock is never touched.
- A booking claims every night of the stay **in one database transaction**, or none of them. A 3-night stay can't half-succeed.
- A **10-minute hold** stops two guests paying for the last room at the same time. Expired holds release automatically.
- Postgres enforces `CHECK (sold + held <= allotment)`, so even a bug in the app code can't oversell.
- **Tested:** 20 simultaneous bookings for the last villa produce exactly 1 success, every run.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 15** (App Router) + **React 19** + **TypeScript** | Frontend and backend in one codebase and one deploy; pages are rendered on the server for fast loads |
| Styling | **Tailwind CSS 4** | A small, consistent design system with no extra CSS framework |
| Database | **PostgreSQL 16** | Row locks, transactions and CHECK constraints solve the overbooking problem inside the database |
| ORM / migrations | **Drizzle ORM** + **drizzle-kit** | Typed queries with readable SQL for the locking logic; no binary engine |
| Validation | **Zod** | Every API input is checked against a schema |
| Auth | **jose** (signed JWT in an httpOnly cookie) + **bcryptjs** | Simple, secure staff sessions with roles |
| AI | **Naive Bayes classifier** (built in, trained on `data/`) + a **rule-based extractor** | Runs locally, needs no API key, is free and fast; an optional cloud model (any OpenAI-compatible API) can be switched on |
| Images | **next/image**, WebP/AVIF | Compressed, lazy-loaded, fixed sizes for slow hill-station networks |
| Testing | **Vitest** against a real Postgres | Concurrency, pricing, AI routing and fallback tests |
| Hosting | **Vercel** + **Neon Postgres** | Free tiers; a daily cron cleans up expired holds and old enquiries |

---

## System architecture

```mermaid
flowchart TD
    G[Guest browser]
    S[Staff browser]
    CRON[Vercel Cron, daily]

    subgraph APP[Next.js app on Vercel]
        MW[Middleware: staff routes need a valid session]
        P[Server-rendered pages]
        API["API routes /api/* (Zod-validated)"]
        BK["booking.ts: search, hold, pay, expire"]
        AI["ai/: classify, extract, route, draft"]
        EQ["enquiries.ts: inbox, re-route, reply"]
        AD["admin.ts: rates, allotment, promos"]
    end

    DB[("PostgreSQL<br/>CHECK sold + held ≤ allotment")]
    LLM["Cloud LLM (optional, off by default)"]

    G --> P
    G --> API
    S --> MW
    MW --> P
    MW --> API
    CRON --> API
    P --> BK
    API --> BK
    API --> EQ
    API --> AD
    EQ --> AI
    AI --> BK
    BK --> DB
    EQ --> DB
    AD --> DB
    AI -.-> LLM
```

### How a booking works

```mermaid
sequenceDiagram
    participant Guest
    participant App as Next.js API
    participant DB as Postgres
    Guest->>App: Continue to payment (dates, room, details, consent)
    App->>DB: BEGIN, lock inventory rows for every night (in date order)
    App->>DB: UPDATE held = held + 1 WHERE sold + held < allotment
    alt every night claimed
        App->>DB: insert booking (HOLD, expires in 10 min), COMMIT
        App-->>Guest: payment page with countdown
        Guest->>App: Pay (test mode, with an idempotency key)
        App->>DB: move held to sold, booking CONFIRMED
        App-->>Guest: confirmation
    else any night full
        App->>DB: ROLLBACK (nothing changes)
        App-->>Guest: "This room just sold out for these dates"
    end
```

### How an enquiry is routed

```
message ─► complaint keyword rule ───────────────┐
        ─► Naive Bayes classifier ─► category + confidence
        ─► rule-based extractor ─► dates, nights, adults, children, guests, budget, room type
                                                  ▼
            complaint?          → Complaints lane + GM alert
            confidence < 0.65?  → Unsorted lane (GM decides)
            otherwise           → Rooms / Weddings / Offsites → least-busy person on that team
                                                  ▼
            draft = friendly template + facts from the database (availability, rate table, GST)
                                                  ▼
            staff edit → price guard → copy into WhatsApp/email → mark replied
```

### Project structure

```
src/
  app/
    (site)/          guest pages: home, rooms/[slug], book, book/[ref], booking/[ref], enquire, privacy
    staff/           staff login and workspace: inbox, rates, promos, bookings
    api/             route handlers: quote, holds, payments/mock, enquiries, auth, staff/*, cron
  components/        UI components (guest + staff)
  db/                Drizzle schema and connection
  lib/
    booking.ts       availability, holds, payment settlement, hold expiry
    pricing.ts       per-night pricing and GST slabs
    admin.ts         rates, allotment, blackouts, promos
    enquiries.ts     inbox, assignment, re-route, drafts, reply
    ai/              classifier, extractor, complaint rule, draft builder, optional LLM
    auth.ts          staff sessions and roles
    validation.ts    Zod schemas for every input
drizzle/             SQL migrations (including the CHECK constraints)
data/                labelled enquiries for training and evaluation
scripts/             migrate, seed, classifier evaluation, image generation
tests/               Vitest suites
docs/TDD.md          Technical Design Document
```

---

## Run it locally

**You need:** Node.js 20 or newer, and PostgreSQL 14 or newer (or Docker).

```bash
# 1. Get the code
git clone https://github.com/abhisheksouw21/Isocode_labs.git
cd Isocode_labs
npm install

# 2. Start Postgres (skip if you already have one running)
docker compose up -d        # port 5432 taken? run: DB_PORT=5433 docker compose up -d, and use :5433 in DATABASE_URL

# 3. Set environment variables
cp .env.example .env
```

Open `.env` and set at least these two:

```
DATABASE_URL=postgresql://resort:resort@localhost:5432/resort
SESSION_SECRET=any-random-string-of-at-least-32-characters
```

```bash
# 4. Create tables and load sample data
npm run db:migrate
npm run db:seed

# 5. Start the app
npm run dev
```

Open http://localhost:3000. The staff area is at http://localhost:3000/staff/login.

**Without Docker?** Create a database and a user in your own Postgres, then point `DATABASE_URL` at it.

To reset all data, run `npm run db:seed` again. Sample dates are relative to the day you seed.

### Demo logins

All four accounts use the password `estate-demo-2026`.

| Role | Email |
| --- | --- |
| General Manager (admin) | `gm@kaapihills.test` |
| Reservations | `priya@kaapihills.test` |
| Reservations | `rahul@kaapihills.test` |
| Events & Sales | `anita@kaapihills.test` |

**Test payment:** click **Pay**, or **Simulate declined card**. No card details are needed.
**Promo codes:** `DIRECT10`, `LONGSTAY15` (4+ nights), `MONSOON20` (June to mid-September).

### Try this

1. Search the coming 14–16 Nov for 2 adults and 1 child. One Coffee Bungalow Villa is left, and the Pool Villa is sold out.
2. Book the villa, then search again. It now shows as sold out.
3. Sign in as the GM and open ENQ-4411 ("Is a villa free 14-16 Nov…"). The draft quotes the real villa price. Click **Recheck prices**: the villas are now full, so the draft offers a room that is free instead.
4. Open the **Unsorted** lane. "hello can u share details" sits at 29% confidence. Re-route it in one click.

### Tests and checks

```bash
createdb resort_test        # an empty database the tests are allowed to wipe
npm test                    # 28 tests, including the 20-way concurrency test
npm run ai:eval             # classifier accuracy on the held-out enquiry set
npm run typecheck && npm run lint
```

The tests use `TEST_DATABASE_URL`, which defaults to `postgresql://resort:resort@localhost:5432/resort_test`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run db:seed` | Reset and load sample data |
| `npm test` | Run the test suite |
| `npm run ai:eval` | Evaluate the enquiry classifier |

---

## Notes and limits

- **Mocked in this build:** payments (MockPay), email and WhatsApp intake (use **Simulate incoming message** in the inbox), and confirmation emails.
- **GST slabs** (5% up to ₹7,500 a night, 18% above) are an assumption. They're stored in the `tax_slabs` table and should be confirmed with the resort's CA.
- **The classifier's test set** is small and was written by the developer, so its score is a smoke test, not a production accuracy figure. The safety rails (the unsorted lane, the complaint rule, re-route, human send) don't depend on it.
- **Photographs** are stand-ins collected from the web, with no licence cleared. Replace `public/hero.webp` and `public/rooms/*.webp` with the resort's own photos under the same names (and update their alt text in `src/components/site/photos.ts`) before any public launch.
- **Rate limiting** is in memory, so it limits per server instance rather than across the whole deployment.
