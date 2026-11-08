import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { updateInventory } from "@/lib/admin";
import { createHold, releaseExpiredHolds, searchAvailability, settlePayment } from "@/lib/booking";
import { addDays } from "@/lib/dates";
import { violatedConstraint } from "@/lib/errors";
import { guest, invRow, resetDb, seedVilla } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("allotment control", () => {
  it("20 simultaneous bookings for the last villa: exactly 1 succeeds", async () => {
    const { room, plan, start } = await seedVilla(1);
    const checkIn = addDays(start, 5);
    const checkOut = addDays(start, 8);

    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        createHold({ roomTypeId: room.id, ratePlanId: plan.id, checkIn, checkOut, adults: 2, children: 0, ...guest(i) }),
      ),
    );

    const won = attempts.filter((a) => a.status === "fulfilled");
    const lost = attempts.filter((a) => a.status === "rejected") as PromiseRejectedResult[];
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(19);
    expect(lost.every((l) => (l.reason as { code?: string }).code === "SOLD_OUT")).toBe(true);
    for (const d of [checkIn, addDays(checkIn, 1), addDays(checkIn, 2)]) {
      expect(await invRow(room.id, d)).toEqual({ allotment: 1, sold: 0, held: 1 });
    }
  });

  it("a 3-night stay can't half-succeed when one night is full", async () => {
    const { room, plan, start } = await seedVilla(1);
    const checkIn = addDays(start, 3);
    await db.execute(sql`UPDATE inventory SET sold = 1 WHERE room_type_id = ${room.id} AND date = ${addDays(checkIn, 2)}`);

    await expect(
      createHold({ roomTypeId: room.id, ratePlanId: plan.id, checkIn, checkOut: addDays(checkIn, 3), adults: 2, children: 0, ...guest() }),
    ).rejects.toMatchObject({ code: "SOLD_OUT" });

    expect(await invRow(room.id, checkIn)).toMatchObject({ held: 0, sold: 0 });
    expect(await invRow(room.id, addDays(checkIn, 1))).toMatchObject({ held: 0, sold: 0 });
  });

  it("the database itself refuses to oversell, even if app code is bypassed", async () => {
    const { room, start } = await seedVilla(1);
    const err = await db.execute(sql`UPDATE inventory SET sold = 2 WHERE room_type_id = ${room.id} AND date = ${start}`).catch((e) => e);
    expect(violatedConstraint(err)).toBe("inventory_never_oversold");
  });

  it("blackout dates can't be booked", async () => {
    const { room, plan, start } = await seedVilla(2);
    await updateInventory({ roomTypeId: room.id, from: addDays(start, 4), to: addDays(start, 4), closed: true });
    await expect(
      createHold({ roomTypeId: room.id, ratePlanId: plan.id, checkIn: addDays(start, 3), checkOut: addDays(start, 5), adults: 2, children: 0, ...guest() }),
    ).rejects.toMatchObject({ code: "CLOSED" });
    const results = await searchAvailability({ checkIn: addDays(start, 3), checkOut: addDays(start, 5), adults: 2, children: 0 });
    expect(results[0].available).toBe(0);
  });

  it("admin can't cut allotment below rooms already sold", async () => {
    const { room, start } = await seedVilla(2);
    await db.execute(sql`UPDATE inventory SET sold = 2 WHERE room_type_id = ${room.id} AND date = ${addDays(start, 1)}`);
    await expect(updateInventory({ roomTypeId: room.id, from: start, to: addDays(start, 2), allotment: 1 })).rejects.toMatchObject({
      code: "ALLOTMENT_BELOW_SOLD",
    });
  });

  it("rejects stays that exceed room occupancy", async () => {
    const { room, plan, start } = await seedVilla(1);
    await expect(
      createHold({ roomTypeId: room.id, ratePlanId: plan.id, checkIn: start, checkOut: addDays(start, 1), adults: 6, children: 0, ...guest() }),
    ).rejects.toMatchObject({ code: "OCCUPANCY" });
  });
});

describe("holds and payment", () => {
  it("expired holds hand their units back", async () => {
    const { room, plan, start } = await seedVilla(1);
    const hold = await createHold({ roomTypeId: room.id, ratePlanId: plan.id, checkIn: start, checkOut: addDays(start, 2), adults: 2, children: 0, ...guest() });
    expect(await invRow(room.id, start)).toMatchObject({ held: 1 });

    const released = await releaseExpiredHolds(new Date(hold.holdExpiresAt.getTime() + 1000));
    expect(released).toBe(1);
    expect(await invRow(room.id, start)).toMatchObject({ held: 0, sold: 0 });
    await expect(settlePayment(hold.ref, "k-late", "success")).rejects.toMatchObject({ code: "HOLD_GONE" });
  });

  it("successful payment confirms once, and a retried callback is a no-op", async () => {
    const { room, plan, start } = await seedVilla(1);
    const hold = await createHold({ roomTypeId: room.id, ratePlanId: plan.id, checkIn: start, checkOut: addDays(start, 2), adults: 2, children: 1, ...guest() });

    const first = await settlePayment(hold.ref, "pay-1", "success");
    const retry = await settlePayment(hold.ref, "pay-1", "success");
    expect(first.booking.status).toBe("CONFIRMED");
    expect(retry.replay).toBe(true);
    expect(await invRow(room.id, start)).toEqual({ allotment: 1, sold: 1, held: 0 });
  });

  it("a declined payment releases the hold", async () => {
    const { room, plan, start } = await seedVilla(1);
    const hold = await createHold({ roomTypeId: room.id, ratePlanId: plan.id, checkIn: start, checkOut: addDays(start, 1), adults: 2, children: 0, ...guest() });
    const res = await settlePayment(hold.ref, "pay-2", "declined");
    expect(res.booking.status).toBe("PAYMENT_FAILED");
    expect(await invRow(room.id, start)).toEqual({ allotment: 1, sold: 0, held: 0 });
  });

  it("prices the stay from the rate table with per-night GST", async () => {
    const { room, plan, start } = await seedVilla(1, 16500);
    const hold = await createHold({ roomTypeId: room.id, ratePlanId: plan.id, checkIn: start, checkOut: addDays(start, 2), adults: 2, children: 0, ...guest() });
    expect(hold.subtotal).toBe(33000);
    expect(hold.tax).toBe(5940);
    expect(hold.total).toBe(38940);
  });
});
