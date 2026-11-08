import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Slab } from "./pricing";

export async function getRoomTypes() {
  return db.select().from(schema.roomTypes).orderBy(asc(schema.roomTypes.sortOrder));
}

export async function getRoomBySlug(slug: string) {
  const [room] = await db.select().from(schema.roomTypes).where(eq(schema.roomTypes.slug, slug));
  return room ?? null;
}

export async function getRatePlans(roomTypeId?: number) {
  const where = roomTypeId
    ? and(eq(schema.ratePlans.roomTypeId, roomTypeId), eq(schema.ratePlans.active, true))
    : eq(schema.ratePlans.active, true);
  return db.select().from(schema.ratePlans).where(where).orderBy(asc(schema.ratePlans.adjustmentPct));
}

export async function getSlabs(onDate: string): Promise<Slab[]> {
  const rows = await db.select().from(schema.taxSlabs).orderBy(asc(schema.taxSlabs.minTariff));
  const applicable = rows.filter((r) => r.effectiveFrom <= onDate);
  const latest = applicable.reduce<string | null>((acc, r) => (acc === null || r.effectiveFrom > acc ? r.effectiveFrom : acc), null);
  return applicable
    .filter((r) => r.effectiveFrom === latest)
    .map((r) => ({ label: r.label, minTariff: r.minTariff, maxTariff: r.maxTariff, ratePct: Number(r.ratePct) }));
}

export async function getInventoryRange(roomTypeId: number, from: string, to: string) {
  return db
    .select()
    .from(schema.inventory)
    .where(and(eq(schema.inventory.roomTypeId, roomTypeId), gte(schema.inventory.date, from), lt(schema.inventory.date, to)))
    .orderBy(asc(schema.inventory.date));
}
