import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, eachNight, todayAtResort } from "@/lib/dates";

export async function resetDb() {
  await db.execute(sql`TRUNCATE enquiry_events, enquiries, payments, bookings, inventory, rate_plans, room_types, promo_codes, tax_slabs, users RESTART IDENTITY CASCADE`);
  await db.insert(schema.taxSlabs).values([
    { label: "Exempt", minTariff: 0, maxTariff: 1000, ratePct: "0", effectiveFrom: "2025-09-22", note: "test" },
    { label: "GST 5%", minTariff: 1001, maxTariff: 7500, ratePct: "5", effectiveFrom: "2025-09-22", note: "test" },
    { label: "GST 18%", minTariff: 7501, maxTariff: null, ratePct: "18", effectiveFrom: "2025-09-22", note: "test" },
  ]);
}

/** One villa type with `allotment` units open for the next 30 nights. */
export async function seedVilla(allotment = 1, rate = 16500) {
  const [room] = await db
    .insert(schema.roomTypes)
    .values({
      slug: "test-villa",
      name: "Test Villa",
      kind: "VILLA",
      tagline: "t",
      description: "t",
      totalUnits: 8,
      maxAdults: 4,
      maxChildren: 2,
      maxGuests: 5,
      sizeSqm: 100,
      bed: "King",
      view: "Garden",
      amenities: [],
      images: [],
    })
    .returning();
  const [plan] = await db
    .insert(schema.ratePlans)
    .values({ roomTypeId: room.id, code: "BB", name: "Stay with breakfast", description: "t", adjustmentPct: 0 })
    .returning();
  const start = todayAtResort();
  await db
    .insert(schema.inventory)
    .values(eachNight(start, addDays(start, 30)).map((date) => ({ roomTypeId: room.id, date, rate, allotment })));
  return { room, plan, start };
}

export function guest(i = 0) {
  return {
    guestName: `Test Guest ${i}`,
    guestEmail: `guest${i}@example.com`,
    guestPhone: "+91 90000 00000",
    consent: true as const,
  };
}

export async function invRow(roomTypeId: number, date: string) {
  const res = await db.execute<{ allotment: number; sold: number; held: number }>(
    sql`SELECT allotment, sold, held FROM inventory WHERE room_type_id = ${roomTypeId} AND date = ${date}`,
  );
  return res.rows[0];
}
