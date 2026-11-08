# Technical Design Document

## Kaapi Hills Estate: direct booking and AI enquiry routing

**GitHub:** https://github.com/abhisheksouw21/Isocode_labs

**Live app:** https://resort-direct-6hjk.vercel.app

**Brief:** Problem 5, the hill resort's direct-booking website with AI enquiry routing (Company A, Chikkamagaluru)

Demo logins and run steps are in `deployment.md`. Every assumption is labelled **[A#]** and listed in section 12.

---

## 1. What I built

I built the CORE BUILD slice end to end, plus some of the optional depth.

| Area | Built |
| --- | --- |
| Guest site | Home with live availability and prices for chosen dates; room pages with photos, rate plans and a per-night GST breakdown; a 3-step booking (stay → details and consent → payment); a confirmation page; an enquiry form for weddings and offsites |
| Booking engine | Per-night allotment, a 10-minute hold, mock payment with idempotent callbacks, automatic hold expiry, promo codes, GST from a config table |
| Staff inbox | One inbox for web, email and WhatsApp (simulated); lanes for Rooms, Weddings, Offsites, Complaints and Unsorted; one-click re-route; a draft editor; a price guard; an audit history |
| Admin (GM) | A 14-day rates and allotment grid with bulk edits by date range and weekday; blackout dates; promo codes; GST slabs; a bookings list |
| Roles | Guest (no account), Reservations and Sales staff, General Manager (admin) |

I kept it to 8 screens, as the brief asked: home, room, details, payment, confirmation, inbox, rates, and promos & GST. Supporting pages are the enquiry form, sign-in, bookings and privacy.

## 2. The client's numbers

I rechecked the brief's maths and every figure adds up: 76 × 365 × 62% = 17,199 nights; 68% of that is 11,695 agency nights, worth ₹11.11 crore; 20% commission on that is ₹2.22 crore; 15% of the commission is ₹33.3 lakh; 36 lost events × ₹2 lakh = ₹72 lakh. Two points shape the product:

1. **The ₹33.3 lakh saving is gross.** Direct bookings pay a payment-gateway fee of roughly 2% **[A1]** instead of 20%, so the net saving is closer to ₹30 lakh. That still dwarfs the ₹8 lakh budget.
2. **The targets don't quite match.** Moving 15% of agency nights to direct shifts about 10 percentage points of total nights (15% × 68%). The success target is 12% → 20%, which is 8 points. Either is reachable. I'd agree with the GM which number we report against.

The larger share, ₹72 lakh, comes from slow event replies, not from commission. So the inbox gets as much care as the booking engine.

## 3. Architecture

```
Browser (guest / staff)
   │  HTML first; forms work before JS loads
   ▼
Next.js 15 app on Vercel ──────────────┐
 • Server components render pages      │
 • Route handlers /api/* (Zod-validated)│
 • middleware: staff routes need a JWT  │
   │                                    │
   ├── lib/booking   holds, payment, expiry (SQL transactions)
   ├── lib/ai        classify → extract → route → draft
   ├── lib/admin     rates, allotment, promos
   ▼
PostgreSQL (Neon)  CHECK (sold + held <= allotment)
```

**Why this shape:**

- **One deployable.** A single Next.js app with Postgres means one repo, one deploy and one set of types end to end. For one developer in 7 days, a separate API service would add wiring without adding value. The trade-off: web and API scale together. That's fine at 76 keys.
- **Postgres, because the hard part is a concurrency problem.** Row locks, conditional updates and CHECK constraints solve "never overbook" inside the database. A document store would push that logic into app code, where it's easy to get wrong.
- **Drizzle ORM.** It's typed, has a thin SQL layer and no binary engine. I write the locking queries as plain SQL, so a reviewer can read exactly what runs.
- **Server-rendered guest pages.** Hill-station networks are slow, so pages arrive as HTML. The date search is a plain GET form that works before JavaScript loads.

## 4. Data model

| Table | Key columns | Notes |
| --- | --- | --- |
| `room_types` | slug, kind (ROOM/VILLA), total_units, max adults/children/guests | 5 types: 64 rooms + 12 villas = 76 keys **[A2]** |
| `rate_plans` | room_type_id, code, adjustment_pct, refundable | Breakfast (base), Pay-now −10%, Breakfast+dinner +18% **[A3]** |
| `inventory` | room_type_id, **date**, rate, **allotment, sold, held**, closed | One row per room type per night. Unique (room_type_id, date). `CHECK (sold + held <= allotment)` |
| `tax_slabs` | min_tariff, max_tariff, rate_pct, effective_from | GST config; a new rate is a new row |
| `promo_codes` | code, percent_off, min_nights, valid_from/to, max_uses, uses | `CHECK percent_off BETWEEN 1 AND 50` |
| `bookings` | ref, room/plan, dates, guest name/email/phone, consent_at, status, hold_expires_at, totals, breakdown (JSON) | Status: HOLD → CONFIRMED / EXPIRED / PAYMENT_FAILED |
| `payments` | booking_id, **idempotency_key (unique)**, amount, status | Replayed callbacks return the first result |
| `enquiries` | channel, message, category, confidence, lane, classified_by, extracted (JSON), assignee, gm_alert, draft, draft_facts, retain_until | One row per enquiry from any channel |
| `enquiry_events` | type, actor, detail | Audit trail: classified, assigned, re-routed, edited, replied |
| `users` | email, password_hash (bcrypt), role (STAFF/GM), team | Reservations, Sales, Management |

Money is stored as whole rupees in integers, so there's no floating-point drift in totals.

## 5. The hard part: the site never overbooks

The website may only sell the allotment the GM sets. Agency stock is outside it, so the site can't oversell what the agencies hold.

**How a booking claims rooms** (`src/lib/booking.ts`):

1. In one transaction, `SELECT … FOR UPDATE` locks the inventory rows for every night, **in date order**. Two overlapping stays always lock in the same order, so they can't deadlock.
2. One conditional update claims a unit on every night where one is still free: `UPDATE inventory SET held = held + 1 WHERE … AND closed = false AND sold + held < allotment`.
3. If fewer rows update than there are nights, the whole transaction rolls back. A 3-night stay can't half-succeed.
4. The booking row is written as `HOLD`, expiring in 10 minutes.
5. On a successful payment, `held` moves to `sold` for each night. On a decline or expiry, `held` goes back down.
6. The database constraint `CHECK (sold + held <= allotment)` is the last line of defence. Even a bug, or a hand-written SQL update, can't oversell.

**Why a hold:** without one, two guests could both reach the payment page for the last villa, and one would pay for a room that's already gone. The hold reserves the unit during payment. If the guest walks away, it expires. Expired holds are released whenever anyone searches or books, plus once a day by cron. Correctness never waits for the cron.

**Payment callbacks** are idempotent on a unique key. A retried or duplicated callback returns the first result instead of confirming twice. If payment arrives after a hold expired, the room is not re-sold to that guest. The payment is marked `refund_pending` (in a real gateway, an automatic refund).

**Admin edits** can't push allotment below the rooms already sold or held. The API names the nights that block the change.

**Evidence** (`tests/booking.test.ts`, all passing):

| Test | Result |
| --- | --- |
| 20 simultaneous bookings for 1 remaining villa, 3 nights | **Exactly 1 succeeds, 19 get "sold out"**. Inventory ends at held = 1 on every night. Repeated runs give the same result. |
| 3-night stay where night 3 is full | Rejected. Nights 1 and 2 are untouched. |
| Direct SQL `UPDATE … SET sold = 2` on an allotment of 1 | Rejected by `inventory_never_oversold` |
| Expired hold | Units released; late payment refused |
| Duplicate payment callback | Confirmed once; the second call is a replay |
| Declined payment | Hold released |
| Allotment cut below sold | Rejected with the blocking dates |
| Blackout night inside a stay | Not bookable; shows as unavailable |

## 6. The AI part: how it works and what happens when it's wrong

**The AI never decides a fact.** It decides where an enquiry goes and what to ask. Prices and availability come from the database.

```
message ─► complaint rule (keywords) ──────────────┐
        ─► local classifier (Naive Bayes) ─► category + confidence
        ─► extractor (rules) ─► dates, nights, adults, children, guests, budget, room type, needs
                                                    ▼
                          route: complaint? → Complaints + GM alert
                                 confidence < 0.65? → Unsorted (GM)
                                 else → category lane → least-busy person on that team
                                                    ▼
                          draft: template tone + FACTS FROM CODE (availability query, rate table, GST)
                                                    ▼
                          staff edit → price guard → copy → "mark replied" (never auto-sent)
```

**Classifier.** A multinomial Naive Bayes model over words and word pairs, trained on 108 labelled enquiries in `data/enquiries.train.json`. They're written to sound like real guests, including WhatsApp shorthand and Hinglish. It runs in-process with no API key, so it works for every reviewer, costs nothing per message and answers in under a millisecond. Raw Naive Bayes is overconfident, so scores are softened with a temperature (1.5) and capped when a message has fewer than 3 known words. That's how "hello can u share details" lands at 29% and goes to Unsorted.

**Optional cloud model.** If `LLM_API_KEY` is set, any OpenAI-compatible model (Gemini by default) classifies and extracts instead. Its JSON is checked against a strict schema. On a timeout, a rate limit, malformed output or an unknown category, the local model is used and staff see a note saying so. Tests cover each failure.

**When it's wrong:**

- **Low confidence goes to the Unsorted lane**, which the GM sees, with the reason shown ("Few familiar words, so confidence is capped").
- **Re-route takes one click.** It reassigns the owner, rebuilds the draft for the new category and records who overrode the model.
- **Complaints alert the GM by rule, not by model.** Keywords like "refund", "dirty", "rude", "not working" or "charged twice" force the Complaints lane and a GM alert, even when the model says "room booking". A complaint hidden inside a rebooking request still reaches the GM (tested).
- **Drafts are never sent automatically.** Staff copy the reply into the original channel and mark it replied.
- **Prices in drafts come from the rate table.** The draft builder runs the same availability and pricing code as the booking site. For ENQ-4411 ("Is a villa free 14-16 Nov for 2 adults and a child?") it checks the villas for that party and those dates. The seed leaves one Coffee Bungalow Villa, so the draft quotes ₹41,890 including 18% GST (₹19,000 Saturday + ₹16,500 Sunday). If the villas are full, it says so and offers the room that is free.
- **Price guard.** If a staff member types a rupee amount into the draft that didn't come from the rate table, "mark replied" stops and asks them to confirm it.
- **Facts go stale, so they can be rechecked.** "Recheck prices" rebuilds the facts from live inventory. The panel shows when they were last checked.

**Measured on the held-out set** (`npm run ai:eval`; 27 enquiries the model never trained on, including the brief's three samples):

| Metric | Result |
| --- | --- |
| Top-1 category accuracy | 27 / 27 |
| Sent to Unsorted | 1 (an engagement party at 64%, just under the threshold) |
| Wrong **and** routed confidently | **0** |
| Sample enquiries ENQ-4410/4411/4412 | Wedding / Room / Offsite, all extracted correctly |

I'm honest about what this proves: both sets are small and I wrote them both, so 27/27 is a smoke test, not a production accuracy figure. The safety design doesn't depend on the number: the unsorted lane, the complaint rule, one-click re-route and human sending. The next step is to retrain on the resort's real, labelled enquiries; every re-route is already logged as a training label.

**Why a local model over an LLM by default:** the model's job is narrow (4 categories plus entities), the risky facts are already handled by code, and a local model is free, instant, private (guest messages don't leave the server) and doesn't fail when an API is down. An LLM would read messy free text better, so I kept it as an optional upgrade behind the same safety rails.

## 7. GST

GST is chosen **per night** from the `tax_slabs` table by that night's tariff, **after** any promo discount. **[A4]** I seeded the slabs from the rate change of 22 Sep 2025: exempt up to ₹1,000, **5% up to ₹7,500**, **18% above ₹7,500** **[A5]**. A weekend uplift can push one night of a stay into the higher slab, and the breakdown shows each slab separately. A future rate change is a new row with a new effective date, with no code change. The CA should confirm the slabs before launch.

## 8. Security and privacy

- **Auth:** staff sign in with email and password (bcrypt). The session is a signed JWT in an httpOnly, SameSite=Lax cookie. Middleware blocks `/staff/*` and `/api/staff/*` without a valid session. Rates, promos and bookings need the GM role. Only an enquiry's owner or the GM can edit its draft or mark it replied. Failed logins take the same time whether or not the email exists.
- **Validation:** every API input goes through a Zod schema (dates, counts, lengths, email, phone, promo format). The database enforces the critical rules again with CHECK and unique constraints. Queries are parameterised.
- **Abuse:** per-IP rate limits on holds, quotes, enquiries and login. The enquiry form has a honeypot field.
- **Secrets:** none in the repo. `.env` is git-ignored and `.env.example` lists names only.
- **DPDP Act 2023:** bookings collect only name, email, phone and optional requests, with an explicit consent checkbox that's timestamped on the booking. There's a plain-language privacy notice. Enquiries carry a `retain_until` date (6 months **[A6]**) and the daily job deletes expired ones. The confirmation page masks the email.
- **Form C and passports:** never collected online. The booking flow, the confirmation page and the privacy notice all say ID and Form C are handled at check-in.
- **Security headers:** X-Frame-Options DENY, nosniff, a strict referrer policy, and a Permissions-Policy.

## 9. UI and design decisions

The brief asks for minimal design that sells the experience: large photos, a quiet layout, and booking in three steps or fewer. The full plan is in `docs/design/redesign-plan.md`.

- **Palette:** taken from the estate in the monsoon. A cool mist ground (`#E6EBE5`), near-black canopy green for text, a deep canopy green for the one button style, and the ripe coffee cherry (`#9A2335`) used only in the hero and for scarcity ("1 left"). Status colours always come with an icon and a word, never colour alone.
- **Type:** Bricolage Grotesque for headings, whose slightly hand-cut letters recall painted estate signs, and Albert Sans for text, which includes the ₹ sign. Both are subset to Latin plus ₹ and bundled with `next/font/local` (68 KB in total), so every phone renders the same letters, offline included.
- **Home:** a split hero. The date search is set as one sentence on a canopy panel ("Stay from [20 Nov] to [22 Nov] for [2 adults] and [0 children]"), with the estate photograph beside it. It's a plain GET form, so it works before JavaScript loads. Below it: one featured room and a grid of the rest, each showing the **average nightly price including GST** for the chosen dates. Unavailable rooms explain why ("Sleeps up to 3", "Sold out", "Closed on some nights") instead of disappearing. Then the location, the three rate plans (from the database) and the event spaces. No reviews, ratings or invented facts.
- **Phone:** a sticky bar with Call, WhatsApp and Book a room, and a full-screen menu built on `<details>` that opens without JavaScript.
- **Room page:** a swipeable gallery on a phone and a three-photo grid on desktop, both opening a lightbox. Then the rate plans, each with its full price breakdown. The nightly rates sit behind a disclosure to keep the page calm.
- **Booking:** three numbered steps. The details step asks for only four things, says plainly "No ID needed online", and shows errors beside each field (linked with `aria-describedby`). On a phone the price summary collapses to the top and the total stays in a sticky bar with Continue. The payment step shows a hold countdown that screen readers hear only at 5 min, 2 min, 1 min, 30 s and 0, and test mode is labelled honestly.
- **Inbox:** the list on the left and the selected enquiry on the right; one column on a phone. Each row shows channel, lane, owner and a confidence bar with the threshold tick, so staff see at a glance why something went to Unsorted. Complaint alerts sit in a banner above everything for the GM.
- **Rates grid:** room types by 14 nights. Each cell shows the rate and sold/allotment, with full nights shaded and blackouts dark. Click a cell to edit it, or bulk-edit a range on chosen weekdays.
- **States:** every list has an empty state, staff pages have a loading state, and errors are written for the reader ("This room just sold out for these dates").
- **Accessibility floor:** text contrast of 4.5:1 or more, 44px touch targets, visible keyboard focus, and `prefers-reduced-motion` respected (the hero's mist band rests). axe-core reports no violations on any guest or staff page at 375px and 1280px, and no page scrolls sideways at 375px.

**Images:** the brief gives no photos, so the site uses stand-in photographs of coffee estates, hills and resort interiors, laid out in portrait frames so none is stretched past its source. They are served through `next/image` with explicit sizes, lazy loading and AVIF/WebP, and every photo has written alt text. They were collected from the web without a cleared licence, and a footer line marks them as stand-ins. **Assumption [A12]:** the resort supplies its own photography before launch; each file is replaced under the same name in `public/`.

## 10. Performance

Lighthouse, mobile, simulated slow 4G, on the production build with the stand-in photographs:

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Home | 85 | 100 | 100 | 100 |
| Room page | 93 | 100 | 100 | 100 |

The home page carries about 690 KB, most of it photographs that `next/image` resizes for each screen width. Contributing factors: server-rendered HTML, AVIF/WebP images with explicit sizes, two small self-hosted font files, no client-side data fetching for browsing, and about 102 KB of shared JS. The resort's own photographs, compressed for the web, would be the next gain; the main remaining cost after that is React hydration on a throttled CPU.

## 11. Testing

28 automated tests (Vitest, against a real Postgres):

- **Booking:** the concurrency test, all-or-nothing multi-night holds, the database constraint, blackouts, occupancy, allotment edits, expiry, idempotent payment, decline, pricing.
- **Pricing:** slab boundaries at ₹7,500 and ₹7,501, mixed slabs in one stay, slab after discount, plan adjustments.
- **AI:** the three brief samples classified and extracted, year rollover for past dates, lakh budgets, no confident misroutes on the held-out set, vague messages going to Unsorted, the complaint rule overriding the model, cloud-model failure and bad-output fallbacks, the price guard.

I also clicked through the whole flow in a headless browser: book the last villa, see it sold out, sign in as the GM, recheck the ENQ-4411 draft, re-route an unsorted enquiry. I checked there's no horizontal scroll at phone width.

## 12. Assumptions

| # | Assumption |
| --- | --- |
| A1 | Payment gateway fee about 2% of direct revenue |
| A2 | Room mix: Plantation View 28, Estate Deluxe 24, Valley Suite 12 (64 rooms); Coffee Bungalow Villa 8, Private Pool Villa 4 (12 villas) |
| A3 | Base rates ₹6,800 to ₹24,000, so the average is near the brief's ₹9,500; +15% on Fri/Sat, +30% from 20 Dec to 2 Jan, −15% in the monsoon (Jun–Aug); breakfast included in the base rate |
| A4 | The GST slab follows the per-night tariff after discount |
| A5 | GST slabs as above, effective 22 Sep 2025; to be confirmed by the resort's CA |
| A6 | Enquiries kept 6 months unless they become a booking |
| A7 | Website allotment starts at about 25–30% of each room type's units (8/6/3/2/1); the GM changes it per night |
| A8 | Free cancellation up to 72 hours before arrival on flexible rates |
| A9 | Venue capacity: lawns 400, conference hall 80, boardroom 16; about 170 guests sleep in-house |
| A10 | Online bookings up to 14 nights and up to 365 days ahead; max 6 adults and 4 children per search |
| A11 | Email forwarding and the WhatsApp Business API are simulated by a "Simulate incoming message" tool; booking confirmation emails are not sent in this build |
| A12 | The resort supplies its own photography before launch; the stand-in photos are replaced file for file |

## 13. What I cut, and what I'd do next

**Cut, on purpose:**

- A real payment gateway. MockPay sits behind one settle-payment function with an idempotency key, which is the same pattern a Razorpay webhook needs, so swapping it is one module.
- Real email and WhatsApp. They're simulated, but they enter through the same `ingestEnquiry` function a webhook would call.
- Cancellations and refunds from the guest side.
- Multi-room bookings in one checkout.
- A channel manager and loyalty programme (out of scope in the brief).

**Next, in order of value:**

1. **WhatsApp Business API and an email-forwarding webhook** into `ingestEnquiry`, plus a reply-time dashboard to track the brief's success measure (median first reply under 30 minutes).
2. **Razorpay test mode** with signed webhooks, then guest cancellation within policy.
3. **Retrain the classifier monthly on staff re-routes.** Every override is already logged. Then track accuracy and the unsorted rate per month.
4. **Durable rate limiting** (Upstash/Redis). The in-memory limiter only blunts bursts per serverless instance.
5. Multi-room checkout for families, and a group-block tool so Sales can hold rooms for a wedding from the inbox.

### Known limits

- The classifier's evaluation set is small and written by me (see section 6).
- The in-memory rate limit isn't shared across serverless instances.
- Booking reference links are unguessable (about 887 million combinations) but not tied to the guest's identity. A production build would add a short email verification step before showing booking details.
- The photographs are unlicensed stand-ins and must be replaced before launch [A12].
- `npm audit` still lists PostCSS and sharp, which ship inside Next.js 15. Here they only process the project's own CSS and image files, never user uploads; the fix is the Next.js 16 upgrade.
