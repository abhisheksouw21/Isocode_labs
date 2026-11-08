import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, nightsBetween, weekday } from "./dates";
import { AppError } from "./errors";

export async function inventoryGrid(from: string, days: number) {
  const to = addDays(from, days);
  const [rooms, rows] = await Promise.all([
    db.select().from(schema.roomTypes).orderBy(asc(schema.roomTypes.sortOrder)),
    db
      .select()
      .from(schema.inventory)
      .where(and(gte(schema.inventory.date, from), lt(schema.inventory.date, to)))
      .orderBy(asc(schema.inventory.date)),
  ]);
  return { rooms, rows, from, to };
}

export type InventoryPatch = {
  roomTypeId: number;
  from: string;
  to: string;
  rate?: number;
  allotment?: number;
  closed?: boolean;
  weekdays?: number[];
};

/**
 * Bulk edit for a date range. Allotment can't drop below what is already sold
 * or held; the database CHECK constraint rejects it, and we turn that into a
 * readable message listing the nights that blocked the change.
 */
export async function updateInventory(p: InventoryPatch) {
  if (p.to < p.from) throw new AppError("BAD_RANGE", "End date is before start date");
  if (nightsBetween(p.from, p.to) > 366) throw new AppError("BAD_RANGE", "Edit up to a year at a time");
  const [room] = await db.select().from(schema.roomTypes).where(eq(schema.roomTypes.id, p.roomTypeId));
  if (!room) throw new AppError("NOT_FOUND", "Room type not found", 404);
  if (p.allotment !== undefined && (p.allotment < 0 || p.allotment > room.totalUnits))
    throw new AppError("BAD_ALLOTMENT", `Allotment must be between 0 and ${room.totalUnits} (total ${room.name} units)`);
  if (p.rate !== undefined && (p.rate < 1000 || p.rate > 500000)) throw new AppError("BAD_RATE", "Rate must be between ₹1,000 and ₹5,00,000");

  const dates: string[] = [];
  for (let d = p.from; d <= p.to; d = addDays(d, 1)) if (!p.weekdays?.length || p.weekdays.includes(weekday(d))) dates.push(d);
  if (!dates.length) throw new AppError("BAD_RANGE", "No dates match the selected weekdays");

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (p.rate !== undefined) set.rate = p.rate;
  if (p.allotment !== undefined) set.allotment = p.allotment;
  if (p.closed !== undefined) set.closed = p.closed;

  if (p.allotment !== undefined) {
    const blocking = await db.execute<{ date: string; taken: number }>(sql`
      SELECT date::text, sold + held AS taken FROM inventory
      WHERE room_type_id = ${p.roomTypeId} AND date = ANY(${dates}::date[]) AND sold + held > ${p.allotment}
      ORDER BY date LIMIT 5`);
    if (blocking.rows.length)
      throw new AppError(
        "ALLOTMENT_BELOW_SOLD",
        `Can't set allotment to ${p.allotment}: already sold or held on ${blocking.rows.map((r) => `${r.date} (${r.taken})`).join(", ")}`,
        409,
      );
  }

  try {
    const res = await db
      .update(schema.inventory)
      .set(set)
      .where(and(eq(schema.inventory.roomTypeId, p.roomTypeId), sql`${schema.inventory.date} = ANY(${dates}::date[])`));
    return { updated: res.rowCount ?? 0 };
  } catch (err) {
    if (String((err as { message?: string }).message).includes("inventory_never_oversold"))
      throw new AppError("ALLOTMENT_BELOW_SOLD", "A booking landed while you were editing. Reload and try again.", 409);
    throw err;
  }
}

export async function listPromos() {
  return db.select().from(schema.promoCodes).orderBy(asc(schema.promoCodes.code));
}

export async function createPromo(p: { code: string; percentOff: number; minNights: number; validFrom: string; validTo: string; maxUses: number | null }) {
  if (p.validTo < p.validFrom) throw new AppError("BAD_RANGE", "Valid-to is before valid-from");
  try {
    const [row] = await db.insert(schema.promoCodes).values({ ...p, code: p.code.toUpperCase() }).returning();
    return row;
  } catch (err) {
    if (String((err as { message?: string }).message).includes("duplicate")) throw new AppError("DUPLICATE", "That code already exists", 409);
    throw err;
  }
}

export async function setPromoActive(id: number, active: boolean) {
  const [row] = await db.update(schema.promoCodes).set({ active }).where(eq(schema.promoCodes.id, id)).returning();
  if (!row) throw new AppError("NOT_FOUND", "Promo not found", 404);
  return row;
}

export async function listTaxSlabs() {
  return db.select().from(schema.taxSlabs).orderBy(asc(schema.taxSlabs.effectiveFrom), asc(schema.taxSlabs.minTariff));
}

export async function recentBookings(limit = 20) {
  return db
    .select({ booking: schema.bookings, room: { name: schema.roomTypes.name } })
    .from(schema.bookings)
    .innerJoin(schema.roomTypes, eq(schema.roomTypes.id, schema.bookings.roomTypeId))
    .orderBy(sql`${schema.bookings.createdAt} DESC`)
    .limit(limit);
}
