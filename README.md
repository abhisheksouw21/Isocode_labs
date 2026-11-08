# Kaapi Hills Estate: direct booking and enquiry routing

A booking website and staff workspace for a 76-key coffee-estate resort in Chikkamagaluru. Guests pick dates, see real prices with GST, and pay. Every enquiry, from the web form, email or WhatsApp, lands in one inbox, routed to the right person with a draft reply ready.

- **Setup, demo logins and deployment:** [`deployment.md`](./deployment.md)
- **Design decisions, data model and limits:** the Technical Design Document submitted with this repo (source in [`docs/TDD.md`](./docs/TDD.md))

## What to look at

- **No overbooking.** The website sells only an admin-set allotment. A Postgres `CHECK (sold + held <= allotment)` backs it up. A stay takes a 10-minute hold on every night at once, or on none. In a test, 20 simultaneous bookings for the last villa produce exactly 1 success ([`tests/booking.test.ts`](./tests/booking.test.ts)).
- **The AI is kept away from facts.** A local Naive Bayes model classifies and a rule-based extractor pulls out dates, guests and budget. Prices and availability in drafts come from the database, never from the model. Low confidence goes to an Unsorted lane, complaints alert the GM by rule, and nothing is sent automatically ([`src/lib/ai`](./src/lib/ai)).
- **GST comes from a table.** The slab is chosen per night by tariff, after discounts.

## Stack

Next.js 15 (App Router, TypeScript), PostgreSQL with Drizzle ORM, Tailwind CSS 4, Zod, jose (JWT session cookies), Vitest.

```bash
npm install && cp .env.example .env   # set DATABASE_URL and SESSION_SECRET
npm run db:migrate && npm run db:seed && npm run dev
```
