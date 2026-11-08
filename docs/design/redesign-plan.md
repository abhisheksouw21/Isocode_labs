# UI redesign plan

**Kind:** a place (a 76-key resort on a working coffee estate). **Main action:** book a room. **Second action:** plan a wedding or offsite.

Skills used together: *frontend-design* (direction, plan-then-critique), *taste* (the place plan: real pictures lead, one type moment, one button style, a phone bar, no captions, the hero enters once), and *ui-ux-pro-max* (UX checks: 4.5:1 contrast, 44px targets, errors beside their field, reduced motion).

## Palette

Taken from the estate in the monsoon: mist on the hills, the shade canopy over the coffee, the ripe cherry.

| Token | Hex | Role |
| --- | --- | --- |
| `mist` | `#E6EBE5` | Page ground: cool grey-green, the hills in mist (not cream) |
| `surface` | `#F8FAF6` | Forms, panels, the booking summary |
| `ink` | `#17301F` | Text: near-black canopy green, never pure black |
| `canopy` | `#1F3D2B` | The one button style, the hero panel, the footer |
| `leaf` | `#D5E0D5` | Quiet tinted panels (rate plans, notices) |
| `cherry` | `#9A2335` | The ripe coffee cherry: used **only** in the hero moment and for scarcity ("1 left") |

Status colours carry an icon and a word as well as the colour: `ok #245F3B`, `warn #7A5600`, `error #AF2A1E`. Muted text `#4A5E50` (5.8:1 on mist). Hairlines `#C5D0C6`; form fields use a darker `#7D8C80` border to reach 3:1.

## Type

- **Bricolage Grotesque** for display: slightly irregular, hand-cut letterforms that recall painted estate signage. It's set at opsz 48, weights 400–700, sentence case, tight tracking at large sizes.
- **Albert Sans** for text and UI: calm and readable at 16px. It's one of the few families whose files include the ₹ sign.
- Both are subset to Latin plus ₹ and bundled with `next/font/local` (68 KB in total), so every device renders the same letters, offline included.
- Scale: 14 / 16 / 18 / 22 / 30 / 44 / 64. Body line-height 1.55. Lines stay under 75 characters.

## Layout

- Left-aligned on one wrap (max 1200px, equal 20px edges on a phone, 32px on desktop).
- Photographs have square corners and no captions. Controls and panels use a 6px radius. One solid button style.
- Each section holds one idea. Composition differs between sections: a feature room row, a two-column room list, a large type line, a plain fact table.

```
┌──────────────────────────────────────────────┐
│ Kaapi Hills    Rooms  Weddings  +91…   [Book]│
├──────────────────────────────────────────────┤
│        estate image, full bleed, mist        │
│ ┌──────────────────────────────┐   drifts    │
│ │ Rooms and villas on a coffee │   once      │
│ │ estate in Chikkamagaluru     │             │
│ │ Stay from [20 Nov] to [22 Nov]│            │
│ │ for [2 adults] [0 children]   │            │
│ │ [See rooms]                   │            │
│ └──────────────────────────────┘             │
├──────────────────────────────────────────────┤
│ 76 rooms and villas, 20–22 Nov               │
│ [big photo: first room]  name, price, Book   │
│ [photo][photo]  [photo][photo] ...           │
├──────────────────────────────────────────────┤
│ Chikkamagaluru, Karnataka  (type moment)     │
│ check-in, check-out, phone, WhatsApp         │
├──────────────────────────────────────────────┤
│ Book direct: three rate plans (from the DB)  │
├──────────────────────────────────────────────┤
│ Weddings and offsites: lawn 400, hall 80 ... │
└──────────────────────────────────────────────┘
phone: sticky bar  [Call] [WhatsApp] [Book a room]
```

## The one memorable moment

**The booking sentence in the hero.** The date search is set as one sentence at display size on a deep canopy panel over the estate image: *"Stay from [20 Nov] to [22 Nov] for [2 adults] and [0 children]."* The fields sit inline with the words. A single mist band drifts across the picture once on load (2.4s); under reduced motion it rests. It is still a plain GET form, so it works before JavaScript loads. Cherry appears here, under the active field, and nowhere else apart from scarcity notices. Everything around it stays quiet.

## Checked against the brief, and what I changed

1. Taste's first dealt palette (*green-mat-chocolate*) has a bone `#E5E1D8` ground, which reads as cream again. I kept its green accent and its earth logic, but moved the ground to cool mist and the ink to canopy green.
2. Taste's first type pairing (EB Garamond / Jost) is a classical serif: the exact default the skills warn about and the look we're leaving. I replaced it with Bricolage (character) and Albert Sans (calm).
3. ui-ux-pro-max proposed teal, glassmorphism and Cinzel. That's a generic "luxury" kit with no link to coffee or hills, so I rejected it and kept only its UX checklist.
4. I removed the template chrome the skills list: all-caps eyebrows above every heading, meta strings joined by middle dots, one identical rounded card everywhere, and `→` on links.
5. The home page adds sections from real data only (`RESORT`, room types, rate plans in the database). No reviews, ratings, awards or invented facts.

## Accessibility and behaviour floor

- Contrast of 4.5:1 or more for all text. Status is never shown by colour alone.
- Touch targets of at least 44px. Keyboard focus is visible.
- `prefers-reduced-motion` is respected.
- Mobile: a full-screen menu that works without JavaScript (`<details>`). On the booking page, a collapsed summary at the top and a sticky total plus Continue.
- Per-field errors linked with `aria-describedby`. The hold countdown announces only at 5 min, 2 min, 1 min, 30 s and 0.
- Checked at 375px and 1280px.


## Results

Checked on the production build with a fresh seed.

- **Typecheck, lint, tests and build:** all pass. 28 of 28 tests pass. `src/lib`, `src/db`, `src/app/api`, `tests` and `scripts` are unchanged.
- **axe-core** (WCAG 2.1 AA plus best practice): no violations on any guest or staff page, at 375px and 1280px.
- **No sideways scroll at 375px** on any page. Two causes fixed: a grid item stretched by a wide table, and screen-reader-only labels escaping a scroller.
- **Without JavaScript:** the date search submits, the mobile menu opens, and check-out's minimum is rendered as check-in + 1. Pages no longer hang on a loading skeleton.
- **Reduced motion:** the mist band is removed and the entrance rests.
- **Lighthouse,** mobile, simulated slow 4G:

  | Page | Performance | Accessibility | Best practices | SEO |
  | --- | --- | --- | --- | --- |
  | Home | 92 (was 86) | 100 | 100 | 100 |
  | Room page | 88 (was 96) | 100 | 100 | 91 |

  The room page now ships the gallery and lightbox script and 68 KB of fonts. SEO 91 is Next.js streaming the room's meta description outside `<head>` for browsers; crawlers get it in the head.

## Before and after

| Page | 375px | 1280px |
| --- | --- | --- |
| Home | [before](screenshots/before/mobile-01-home.jpg) / [after](screenshots/after/mobile-01-home.jpg) | [before](screenshots/before/desktop-01-home.jpg) / [after](screenshots/after/desktop-01-home.jpg) |
| Room page | [before](screenshots/before/mobile-02-room.jpg) / [after](screenshots/after/mobile-02-room.jpg) | [before](screenshots/before/desktop-02-room.jpg) / [after](screenshots/after/desktop-02-room.jpg) |
| Booking: details | [before](screenshots/before/mobile-03-book-details.jpg) / [after](screenshots/after/mobile-03-book-details.jpg) | [before](screenshots/before/desktop-03-book-details.jpg) / [after](screenshots/after/desktop-03-book-details.jpg) |
| Booking: payment | [before](screenshots/before/mobile-04-book-pay.jpg) / [after](screenshots/after/mobile-04-book-pay.jpg) | [before](screenshots/before/desktop-04-book-pay.jpg) / [after](screenshots/after/desktop-04-book-pay.jpg) |
| Confirmation | [before](screenshots/before/mobile-05-confirmation.jpg) / [after](screenshots/after/mobile-05-confirmation.jpg) | [before](screenshots/before/desktop-05-confirmation.jpg) / [after](screenshots/after/desktop-05-confirmation.jpg) |
| Enquiry | [before](screenshots/before/mobile-06-enquire.jpg) / [after](screenshots/after/mobile-06-enquire.jpg) | [before](screenshots/before/desktop-06-enquire.jpg) / [after](screenshots/after/desktop-06-enquire.jpg) |
| Privacy | [before](screenshots/before/mobile-07-privacy.jpg) / [after](screenshots/after/mobile-07-privacy.jpg) | [before](screenshots/before/desktop-07-privacy.jpg) / [after](screenshots/after/desktop-07-privacy.jpg) |
| Staff sign-in | [before](screenshots/before/mobile-08-staff-login.jpg) / [after](screenshots/after/mobile-08-staff-login.jpg) | [before](screenshots/before/desktop-08-staff-login.jpg) / [after](screenshots/after/desktop-08-staff-login.jpg) |
| Staff inbox | [before](screenshots/before/mobile-09-staff-inbox.jpg) / [after](screenshots/after/mobile-09-staff-inbox.jpg) | [before](screenshots/before/desktop-09-staff-inbox.jpg) / [after](screenshots/after/desktop-09-staff-inbox.jpg) |
| Rates & allotment | [before](screenshots/before/mobile-10-staff-rates.jpg) / [after](screenshots/after/mobile-10-staff-rates.jpg) | [before](screenshots/before/desktop-10-staff-rates.jpg) / [after](screenshots/after/desktop-10-staff-rates.jpg) |
| Promos & GST | [before](screenshots/before/mobile-11-staff-promos.jpg) / [after](screenshots/after/mobile-11-staff-promos.jpg) | [before](screenshots/before/desktop-11-staff-promos.jpg) / [after](screenshots/after/desktop-11-staff-promos.jpg) |
| Bookings | [before](screenshots/before/mobile-12-staff-bookings.jpg) / [after](screenshots/after/mobile-12-staff-bookings.jpg) | [before](screenshots/before/desktop-12-staff-bookings.jpg) / [after](screenshots/after/desktop-12-staff-bookings.jpg) |
