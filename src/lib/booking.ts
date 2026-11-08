import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import { getRatePlans, getRoomTypes, getSlabs } from "./catalog";
import { addDays, eachNight, isIsoDate, nightsBetween, todayAtResort } from "./dates";
import { AppError, notFound } from "./errors";
import { quoteStay, type Quote } from "./pricing";

export const HOLD_MINUTES = 10;
export const MAX_NIGHTS = 14;
export const BOOKING_WINDOW_DAYS = 365;

export type StaySearch = { checkIn: string; checkOut: string; adults: number; children: number };

export function validateStay(s: StaySearch, today = todayAtResort()) {
  if (!isIsoDate(s.checkIn) || !isIsoDate(s.checkOut)) throw new AppError("BAD_DATES", "Choose valid dates");
  if (s.checkIn < today) throw new AppError("PAST_DATE", "Check-in can't be in the past");
  const nights = nightsBetween(s.checkIn, s.checkOut);
  if (nights < 1) throw new AppError("BAD_DATES", "Check-out must be after check-in");
  if (nights > MAX_NIGHTS) throw new AppError("TOO_LONG", `Online bookings are up to ${MAX_NIGHTS} nights. Send us an enquiry for longer stays.`);
  if (s.checkIn > addDays(today, BOOKING_WINDOW_DAYS)) throw new AppError("TOO_FAR", "We take bookings up to a year ahead");
  if (s.adults < 1) throw new AppError("BAD_GUESTS", "At least one adult is required");
  return nights;
}

type InvRow = { date: string; rate: number; allotment: number; sold: number; held: number; closed: boolean };

/** Rooms the website can still sell for every night of the stay. */
export function sellableUnits(rows: InvRow[], nights: number): number {
  if (rows.length !== nights) return 0;
  return Math.max(0, Math.min(...rows.map((r) => (r.closed ? 0 : r.allotment - r.sold - r.held))));
}

export type RoomAvailability = {
  roomTypeId: number;
  slug: string;
  name: string;
  fits: boolean;
  available: number;
  closedNights: string[];
  plans: { id: number; code: string; name: string; description: string; refundable: boolean; quote: Quote }[];
};

export async function searchAvailability(s: StaySearch): Promise<RoomAvailability[]> {
  const nights = validateStay(s);
  await releaseExpiredHolds();
  const [rooms, plans, slabs] = await Promise.all([getRoomTypes(), getRatePlans(), getSlabs(s.checkIn)]);
  const rows = await db
    .select()
    .from(schema.inventory)
    .where(and(sql`${schema.inventory.date} >= ${s.checkIn}`, sql`${schema.inventory.date} < ${s.checkOut}`))
    .orderBy(schema.inventory.date);

  return rooms.map((room) => {
    const roomRows = rows.filter((r) => r.roomTypeId === room.id);
    const fits = s.adults <= room.maxAdults && s.children <= room.maxChildren && s.adults + s.children <= room.maxGuests;
    const available = sellableUnits(roomRows, nights);
    return {
      roomTypeId: room.id,
      slug: room.slug,
      name: room.name,
      fits,
      available,
      closedNights: roomRows.filter((r) => r.closed).map((r) => r.date),
      plans:
        roomRows.length === nights
          ? plans
              .filter((p) => p.roomTypeId === room.id)
              .map((p) => ({
                id: p.id,
                code: p.code,
                name: p.name,
                description: p.description,
                refundable: p.refundable,
                quote: quoteStay(roomRows, { adjustmentPct: p.adjustmentPct, percentOff: 0, slabs }),
              }))
          : [],
    };
  });
}

export async function resolvePromo(code: string | undefined, checkIn: string, nights: number, tx: Tx | typeof db = db) {
  if (!code) return null;
  const normalised = code.trim().toUpperCase();
  const [promo] = await tx.select().from(schema.promoCodes).where(eq(schema.promoCodes.code, normalised));
  if (!promo || !promo.active) throw new AppError("PROMO_INVALID", "That promo code isn't valid");
  if (checkIn < promo.validFrom || checkIn > promo.validTo) throw new AppError("PROMO_DATES", "That promo code doesn't cover these dates");
  if (nights < promo.minNights) throw new AppError("PROMO_NIGHTS", `That code needs a stay of ${promo.minNights}+ nights`);
  if (promo.maxUses !== null && promo.uses >= promo.maxUses) throw new AppError("PROMO_USED", "That promo code has been fully used");
  return promo;
}

export type HoldInput = StaySearch & {
  roomTypeId: number;
  ratePlanId: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  requests?: string;
  promoCode?: string;
  consent: true;
};

function newRef(prefix: string) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return `${prefix}-${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}`;
}

/**
 * Takes a 10-minute hold on one unit for every night of the stay, or nothing.
 * Rows are locked in date order (no deadlocks between overlapping stays), then a
 * single conditional UPDATE claims a unit only where one is still free. If fewer
 * rows update than there are nights, the transaction rolls back. The CHECK
 * constraint (sold + held <= allotment) is the last line of defence.
 */
export async function createHold(input: HoldInput) {
  const nights = validateStay(input);
  await releaseExpiredHolds();

  const [room] = await db.select().from(schema.roomTypes).where(eq(schema.roomTypes.id, input.roomTypeId));
  if (!room) throw notFound("Room");
  if (input.adults > room.maxAdults || input.children > room.maxChildren || input.adults + input.children > room.maxGuests)
    throw new AppError("OCCUPANCY", `${room.name} sleeps up to ${room.maxGuests} (${room.maxAdults} adults)`);

  const [plan] = await db
    .select()
    .from(schema.ratePlans)
    .where(and(eq(schema.ratePlans.id, input.ratePlanId), eq(schema.ratePlans.roomTypeId, room.id), eq(schema.ratePlans.active, true)));
  if (!plan) throw notFound("Rate plan");

  const slabs = await getSlabs(input.checkIn);

  return db.transaction(async (tx) => {
    const promo = await resolvePromo(input.promoCode, input.checkIn, nights, tx);

    const locked = await tx.execute<InvRow & { id: number }>(sql`
      SELECT id, date::text AS date, rate, allotment, sold, held, closed
      FROM inventory
      WHERE room_type_id = ${room.id} AND date >= ${input.checkIn} AND date < ${input.checkOut}
      ORDER BY date
      FOR UPDATE`);

    if (locked.rows.length !== nights) throw new AppError("NOT_FOR_SALE", "Some of these nights aren't open for booking yet");
    if (locked.rows.some((r) => r.closed)) throw new AppError("CLOSED", "Some of these nights are closed for online booking");

    const claimed = await tx.execute(sql`
      UPDATE inventory SET held = held + 1, updated_at = now()
      WHERE room_type_id = ${room.id} AND date >= ${input.checkIn} AND date < ${input.checkOut}
        AND closed = false AND sold + held < allotment`);

    if (claimed.rowCount !== nights) throw new AppError("SOLD_OUT", `${room.name} just sold out for these dates`, 409);

    const quote = quoteStay(locked.rows, { adjustmentPct: plan.adjustmentPct, percentOff: promo?.percentOff ?? 0, slabs });
    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

    const [booking] = await tx
      .insert(schema.bookings)
      .values({
        ref: newRef("BK"),
        roomTypeId: room.id,
        ratePlanId: plan.id,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        nights,
        adults: input.adults,
        children: input.children,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        requests: input.requests || null,
        consentAt: new Date(),
        status: "HOLD",
        holdExpiresAt,
        promoCode: promo?.code ?? null,
        subtotal: quote.subtotal,
        discount: quote.discount,
        tax: quote.tax,
        total: quote.total,
        breakdown: quote,
      })
      .returning();
    return booking;
  });
}

async function moveUnits(tx: Tx, b: { roomTypeId: number; checkIn: string; checkOut: string }, change: "confirm" | "release") {
  const set = change === "confirm" ? sql`held = held - 1, sold = sold + 1` : sql`held = held - 1`;
  const res = await tx.execute(sql`
    UPDATE inventory SET ${set}, updated_at = now()
    WHERE room_type_id = ${b.roomTypeId} AND date >= ${b.checkIn} AND date < ${b.checkOut} AND held > 0`);
  if (res.rowCount !== nightsBetween(b.checkIn, b.checkOut)) throw new AppError("INVENTORY_DRIFT", "Inventory changed underneath this hold", 500);
}

/** Expired holds hand their units back. Safe to run from many places at once. */
export async function releaseExpiredHolds(now: Date = new Date()) {
  return db.transaction(async (tx) => {
    const expired = await tx.execute<{ id: number; room_type_id: number; check_in: string; check_out: string }>(sql`
      SELECT id, room_type_id, check_in::text, check_out::text FROM bookings
      WHERE status = 'HOLD' AND hold_expires_at < ${now.toISOString()}
      ORDER BY id
      FOR UPDATE SKIP LOCKED`);
    for (const b of expired.rows) {
      await moveUnits(tx, { roomTypeId: b.room_type_id, checkIn: b.check_in, checkOut: b.check_out }, "release");
      await tx.update(schema.bookings).set({ status: "EXPIRED" }).where(eq(schema.bookings.id, b.id));
    }
    return expired.rows.length;
  });
}

export type PaymentOutcome = "success" | "declined";

/**
 * Mock gateway callback. Idempotent on `idempotencyKey`: a retried callback
 * returns the first result instead of confirming twice.
 */
export async function settlePayment(ref: string, idempotencyKey: string, outcome: PaymentOutcome) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(schema.payments).where(eq(schema.payments.idempotencyKey, idempotencyKey));
    const lockedBooking = await tx.execute<{ id: number }>(sql`SELECT id FROM bookings WHERE ref = ${ref} FOR UPDATE`);
    if (lockedBooking.rows.length === 0) throw notFound("Booking");
    const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.ref, ref));

    if (existing) {
      if (existing.bookingId !== booking.id) throw new AppError("IDEMPOTENCY_MISMATCH", "Payment key belongs to another booking", 409);
      return { booking, payment: existing, replay: true };
    }
    if (booking.status === "CONFIRMED") throw new AppError("ALREADY_PAID", "This booking is already confirmed", 409);
    if (booking.status !== "HOLD") throw new AppError("HOLD_GONE", "This hold has ended. Please search again.", 409);

    const expired = booking.holdExpiresAt.getTime() < Date.now();
    let status: "CONFIRMED" | "PAYMENT_FAILED" | "EXPIRED";
    let paymentStatus: string;

    if (expired) {
      await moveUnits(tx, booking, "release");
      status = "EXPIRED";
      paymentStatus = outcome === "success" ? "refund_pending" : "declined";
    } else if (outcome === "success") {
      await moveUnits(tx, booking, "confirm");
      if (booking.promoCode) {
        const used = await tx.execute(sql`
          UPDATE promo_codes SET uses = uses + 1
          WHERE code = ${booking.promoCode} AND (max_uses IS NULL OR uses < max_uses)`);
        if (used.rowCount !== 1) throw new AppError("PROMO_USED", "That promo code was used up while you were paying", 409);
      }
      status = "CONFIRMED";
      paymentStatus = "captured";
    } else {
      await moveUnits(tx, booking, "release");
      status = "PAYMENT_FAILED";
      paymentStatus = "declined";
    }

    const [updated] = await tx
      .update(schema.bookings)
      .set({ status, confirmedAt: status === "CONFIRMED" ? new Date() : null })
      .where(eq(schema.bookings.id, booking.id))
      .returning();
    const [payment] = await tx
      .insert(schema.payments)
      .values({
        bookingId: booking.id,
        provider: "mockpay",
        idempotencyKey,
        amount: booking.total,
        status: paymentStatus,
        providerRef: `mock_${randomBytes(6).toString("hex")}`,
      })
      .returning();
    return { booking: updated, payment, replay: false };
  });
}

export async function getBookingByRef(ref: string) {
  const [row] = await db
    .select({ booking: schema.bookings, room: schema.roomTypes, plan: schema.ratePlans })
    .from(schema.bookings)
    .innerJoin(schema.roomTypes, eq(schema.roomTypes.id, schema.bookings.roomTypeId))
    .innerJoin(schema.ratePlans, eq(schema.ratePlans.id, schema.bookings.ratePlanId))
    .where(eq(schema.bookings.ref, ref));
  return row ?? null;
}

export { eachNight };
