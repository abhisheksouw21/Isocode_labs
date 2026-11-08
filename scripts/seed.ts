import "dotenv/config";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool, schema } from "../src/db";
import { extractEntities } from "../src/lib/ai/extract";
import { addDays, eachNight, todayAtResort, weekday } from "../src/lib/dates";
import { ingestEnquiry } from "../src/lib/enquiries";
import { quoteStay } from "../src/lib/pricing";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "estate-demo-2026";

const ROOMS = [
  {
    slug: "plantation-view-room",
    name: "Plantation View Room",
    kind: "ROOM" as const,
    tagline: "Wake up to rows of coffee and silver oak",
    description:
      "A calm, light-filled room facing the coffee rows. Teak floors, a reading nook by the window and a private sit-out for your morning filter coffee.",
    totalUnits: 28,
    maxAdults: 2,
    maxChildren: 1,
    maxGuests: 3,
    sizeSqm: 32,
    bed: "King or twin",
    view: "Coffee plantation",
    amenities: ["Private sit-out", "Rain shower", "Tea & coffee tray", "Wi-Fi", "Work desk"],
    baseRate: 6800,
    allotment: 8,
  },
  {
    slug: "estate-deluxe-room",
    name: "Estate Deluxe Room",
    kind: "ROOM" as const,
    tagline: "More room to unwind, with a balcony over the valley",
    description:
      "A larger room with a balcony over the valley, a deep bathtub and a daybed. Fits a family of three, with space for an extra bed.",
    totalUnits: 24,
    maxAdults: 3,
    maxChildren: 2,
    maxGuests: 4,
    sizeSqm: 40,
    bed: "King + daybed",
    view: "Valley",
    amenities: ["Balcony", "Bathtub", "Daybed", "Mini fridge", "Wi-Fi"],
    baseRate: 8900,
    allotment: 6,
  },
  {
    slug: "valley-suite",
    name: "Valley Suite",
    kind: "ROOM" as const,
    tagline: "A separate living room and the best sunsets on the estate",
    description:
      "A one-bedroom suite with a separate living room, a wraparound deck and wide views of the Baba Budan range. Good for longer stays.",
    totalUnits: 12,
    maxAdults: 3,
    maxChildren: 2,
    maxGuests: 4,
    sizeSqm: 62,
    bed: "King",
    view: "Valley & hills",
    amenities: ["Living room", "Wraparound deck", "Bathtub", "Espresso machine", "Wi-Fi"],
    baseRate: 12500,
    allotment: 3,
  },
  {
    slug: "coffee-bungalow-villa",
    name: "Coffee Bungalow Villa",
    kind: "VILLA" as const,
    tagline: "A planter's bungalow of your own, with a garden",
    description:
      "A standalone villa in the old planter's style: two bedrooms, a verandah, a fireplace for misty evenings and a private garden.",
    totalUnits: 8,
    maxAdults: 4,
    maxChildren: 2,
    maxGuests: 5,
    sizeSqm: 110,
    bed: "2 bedrooms (king + twin)",
    view: "Private garden",
    amenities: ["Two bedrooms", "Fireplace", "Private garden", "Verandah", "Butler on call"],
    baseRate: 16500,
    allotment: 2,
  },
  {
    slug: "private-pool-villa",
    name: "Private Pool Villa",
    kind: "VILLA" as const,
    tagline: "A heated plunge pool, deep in the estate",
    description:
      "Our most private stay. A heated plunge pool, an outdoor shower and a glass-walled bedroom at the edge of the forest.",
    totalUnits: 4,
    maxAdults: 2,
    maxChildren: 2,
    maxGuests: 4,
    sizeSqm: 140,
    bed: "King",
    view: "Forest edge",
    amenities: ["Heated plunge pool", "Outdoor shower", "Glass-walled bedroom", "In-villa dining", "Butler on call"],
    baseRate: 24000,
    allotment: 1,
  },
];

const PLANS = [
  { code: "BB", name: "Stay with breakfast", description: "Breakfast for all guests. Free cancellation up to 72 hours before arrival.", adjustmentPct: 0, refundable: true },
  { code: "NR", name: "Pay now, save 10%", description: "Breakfast included. Non-refundable; dates can't be changed.", adjustmentPct: -10, refundable: false },
  { code: "MAP", name: "Breakfast and dinner", description: "Breakfast and a set Malnad dinner. Free cancellation up to 72 hours before arrival.", adjustmentPct: 18, refundable: true },
];

function nightlyRate(base: number, date: string) {
  const month = Number(date.slice(5, 7));
  const md = date.slice(5);
  let factor = 1;
  if (weekday(date) === 5 || weekday(date) === 6) factor += 0.15;
  if (md >= "12-20" || md <= "01-02") factor += 0.3;
  if (month >= 6 && month <= 8) factor -= 0.15;
  return Math.round((base * factor) / 50) * 50;
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const NAMES = ["Aarav Menon", "Diya Rao", "Kabir Iyer", "Ira Kulkarni", "Vihaan Hegde", "Saanvi Pai", "Arjun Bhat", "Myra Shenoy", "Reyansh Kamath", "Anika Rai"];

async function main() {
  const today = todayAtResort();
  console.log(`Seeding relative to ${today}`);

  await db.execute(sql`TRUNCATE enquiry_events, enquiries, payments, bookings, inventory, rate_plans, room_types, promo_codes, tax_slabs, users RESTART IDENTITY CASCADE`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await db.insert(schema.users).values([
    { email: "gm@kaapihills.test", name: "Meera Nair", passwordHash, role: "GM", team: "MANAGEMENT" },
    { email: "priya@kaapihills.test", name: "Priya Shetty", passwordHash, role: "STAFF", team: "RESERVATIONS" },
    { email: "rahul@kaapihills.test", name: "Rahul Gowda", passwordHash, role: "STAFF", team: "RESERVATIONS" },
    { email: "anita@kaapihills.test", name: "Anita D'Souza", passwordHash, role: "STAFF", team: "SALES" },
  ]);

  await db.insert(schema.taxSlabs).values([
    { label: "Exempt", minTariff: 0, maxTariff: 1000, ratePct: "0", effectiveFrom: "2025-09-22", note: "ASSUMPTION: rooms up to ₹1,000/night are exempt" },
    { label: "GST 5%", minTariff: 1001, maxTariff: 7500, ratePct: "5", effectiveFrom: "2025-09-22", note: "ASSUMPTION: 5% without ITC for tariffs up to ₹7,500/night (GST rate change of 22 Sep 2025)" },
    { label: "GST 18%", minTariff: 7501, maxTariff: null, ratePct: "18", effectiveFrom: "2025-09-22", note: "ASSUMPTION: 18% for tariffs above ₹7,500/night" },
  ]);
  const slabs = [
    { label: "Exempt", minTariff: 0, maxTariff: 1000, ratePct: 0 },
    { label: "GST 5%", minTariff: 1001, maxTariff: 7500, ratePct: 5 },
    { label: "GST 18%", minTariff: 7501, maxTariff: null, ratePct: 18 },
  ];

  await db.insert(schema.promoCodes).values([
    { code: "DIRECT10", percentOff: 10, minNights: 1, validFrom: addDays(today, -30), validTo: addDays(today, 400), maxUses: null },
    { code: "LONGSTAY15", percentOff: 15, minNights: 4, validFrom: addDays(today, -30), validTo: addDays(today, 400), maxUses: 50 },
    { code: "MONSOON20", percentOff: 20, minNights: 2, validFrom: `${Number(today.slice(0, 4)) + 1}-06-01`, validTo: `${Number(today.slice(0, 4)) + 1}-09-15`, maxUses: 100 },
  ]);

  const start = addDays(today, -14);
  const end = addDays(today, 420);
  const nights = eachNight(start, end);

  const roomIds: Record<string, number> = {};
  const planIds: Record<string, Record<string, number>> = {};
  for (const [i, r] of ROOMS.entries()) {
    const { baseRate, allotment, ...room } = r;
    const [row] = await db
      .insert(schema.roomTypes)
      .values({ ...room, sortOrder: i, images: [1, 2, 3].map((n) => `/rooms/${r.slug}-${n}.webp`) })
      .returning();
    roomIds[r.slug] = row.id;
    const plans = await db.insert(schema.ratePlans).values(PLANS.map((p) => ({ ...p, roomTypeId: row.id }))).returning();
    planIds[r.slug] = Object.fromEntries(plans.map((p) => [p.code, p.id]));
    for (let k = 0; k < nights.length; k += 500) {
      await db.insert(schema.inventory).values(
        nights.slice(k, k + 500).map((date) => ({ roomTypeId: row.id, date, rate: nightlyRate(baseRate, date), allotment })),
      );
    }
  }

  // Maintenance blackout on one pool villa for three nights, three weeks out.
  await db.execute(sql`UPDATE inventory SET closed = true WHERE room_type_id = ${roomIds["private-pool-villa"]} AND date >= ${addDays(today, 21)} AND date < ${addDays(today, 24)}`);

  // ENQ-4411 asks about 14-16 Nov. Make that stay interesting: one bungalow villa left, pool villa sold out.
  const villaAsk = extractEntities("Is a villa free 14-16 Nov for 2 adults and a child?", new Date());
  const fixed: { slug: string; checkIn: string; checkOut: string }[] = [];
  if (villaAsk.checkIn && villaAsk.checkOut) {
    fixed.push({ slug: "coffee-bungalow-villa", checkIn: villaAsk.checkIn, checkOut: villaAsk.checkOut });
    fixed.push({ slug: "private-pool-villa", checkIn: addDays(villaAsk.checkIn, -1), checkOut: addDays(villaAsk.checkOut, 1) });
  }

  const rand = rng(42);
  const generated: typeof fixed = [];
  for (let i = 0; i < 140; i++) {
    const room = ROOMS[Math.floor(rand() * ROOMS.length)];
    const checkIn = addDays(today, Math.floor(rand() * 75) - 10);
    const checkOut = addDays(checkIn, 1 + Math.floor(rand() * 3));
    const clashesWithDemo = fixed.some((f) => f.slug === room.slug && checkIn < f.checkOut && checkOut > f.checkIn);
    if (!clashesWithDemo) generated.push({ slug: room.slug, checkIn, checkOut });
  }

  let created = 0;
  for (const [i, b] of [...fixed, ...generated].entries()) {
    const room = ROOMS.find((r) => r.slug === b.slug)!;
    const roomTypeId = roomIds[b.slug];
    const claimed = await db.execute(sql`
      UPDATE inventory SET sold = sold + 1
      WHERE room_type_id = ${roomTypeId} AND date >= ${b.checkIn} AND date < ${b.checkOut} AND closed = false AND sold + held < allotment
        AND (SELECT COUNT(*) FROM inventory WHERE room_type_id = ${roomTypeId} AND date >= ${b.checkIn} AND date < ${b.checkOut} AND closed = false AND sold + held < allotment) = ${eachNight(b.checkIn, b.checkOut).length}`);
    if (claimed.rowCount !== eachNight(b.checkIn, b.checkOut).length) continue;
    const rates = eachNight(b.checkIn, b.checkOut).map((date) => ({ date, rate: nightlyRate(room.baseRate, date) }));
    const quote = quoteStay(rates, { adjustmentPct: 0, percentOff: 0, slabs });
    const name = NAMES[i % NAMES.length];
    await db.insert(schema.bookings).values({
      ref: `BK-SEED${String(i).padStart(3, "0")}`,
      roomTypeId,
      ratePlanId: planIds[b.slug].BB,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      nights: rates.length,
      adults: 2,
      children: 0,
      guestName: name,
      guestEmail: `${name.split(" ")[0].toLowerCase()}@example.com`,
      guestPhone: "+91 90000 00000",
      consentAt: new Date(),
      status: "CONFIRMED",
      holdExpiresAt: new Date(),
      subtotal: quote.subtotal,
      discount: 0,
      tax: quote.tax,
      total: quote.total,
      breakdown: quote,
      confirmedAt: new Date(),
    });
    created++;
  }

  const now = Date.now();
  const ago = (minutes: number) => new Date(now - minutes * 60_000);
  const samples = [
    { ref: "ENQ-4410", channel: "EMAIL" as const, fromName: "Kavya Reddy", fromContact: "kavya.reddy@example.com", message: "Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights", receivedAt: ago(42) },
    { ref: "ENQ-4411", channel: "WHATSAPP" as const, fromName: "Rohan Mehta", fromContact: "+91 98450 00011", message: "Is a villa free 14-16 Nov for 2 adults and a child?", receivedAt: ago(18) },
    { ref: "ENQ-4412", channel: "WEB" as const, fromName: "Sneha Pillai", fromContact: "sneha@example.com", message: "Team of 45 wants a January offsite with a conference hall", receivedAt: ago(65) },
    { ref: "ENQ-4413", channel: "EMAIL" as const, fromName: "Vikram Joshi", fromContact: "vikram.j@example.com", message: "We checked out yesterday. The hot water was not working for two days and nobody came to fix it. Very disappointed for the price we paid.", receivedAt: ago(9) },
    { ref: "ENQ-4414", channel: "WHATSAPP" as const, fromName: "Neha", fromContact: "+91 98860 00022", message: "hello can u share details", receivedAt: ago(30) },
    { ref: "ENQ-4415", channel: "WEB" as const, fromName: "Farhan Ali", fromContact: "farhan@example.com", message: "Do you have a suite for 2 adults on 6 to 8 Dec? It's our anniversary.", receivedAt: ago(120) },
    { ref: "ENQ-4416", channel: "EMAIL" as const, fromName: "Lakshmi Iyer", fromContact: "lakshmi@example.com", message: "Leadership offsite for 12 people, quiet boardroom, 2 nights in March. Budget around 6 lakh.", receivedAt: ago(200) },
    { ref: "ENQ-4417", channel: "WHATSAPP" as const, fromName: "Amit Kulkarni", fromContact: "+91 99000 00033", message: "Shaadi ke liye venue chahiye, 180 log, April 2027, budget 20 lakh", receivedAt: ago(260) },
    { ref: "ENQ-4418", channel: "WEB" as const, fromName: "Pooja Nair", fromContact: "pooja@example.com", message: "Can we bring our dog? Planning 2 nights 20-22 Dec for 2 adults", receivedAt: ago(320) },
  ];
  for (const s of samples) await ingestEnquiry(s);
  await db.execute(sql`UPDATE enquiries SET status = 'REPLIED' WHERE ref IN ('ENQ-4416')`);

  console.log(`Seeded ${ROOMS.length} room types, ${nights.length} nights each, ${created} bookings, ${samples.length} enquiries.`);
  console.log(`Demo staff password: ${DEMO_PASSWORD}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
