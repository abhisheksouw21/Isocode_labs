import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const trimmed = (max: number) => z.string().trim().max(max);

export const staySchema = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
  adults: z.coerce.number().int().min(1).max(6),
  children: z.coerce.number().int().min(0).max(4),
});

export const quoteSchema = staySchema.extend({
  roomSlug: z.string().min(1).max(60),
  planCode: z.string().min(1).max(10),
  promoCode: trimmed(30).optional(),
});

export const holdSchema = quoteSchema.extend({
  guestName: trimmed(80).min(2, "Please enter your full name"),
  guestEmail: trimmed(120).toLowerCase().email("Please enter a valid email"),
  guestPhone: trimmed(20).regex(/^\+?[0-9][0-9\s-]{7,16}$/, "Please enter a valid phone number"),
  requests: trimmed(500).optional(),
  consent: z.literal(true, { error: "Please agree to how we use your details" }),
});

export const paymentSchema = z.object({
  ref: z.string().regex(/^BK-[A-Z0-9]{6,10}$/),
  outcome: z.enum(["success", "declined"]),
  idempotencyKey: z.string().uuid(),
});

export const enquirySchema = z.object({
  type: z.enum(["stay", "wedding", "offsite", "other"]),
  name: trimmed(80).min(2, "Please enter your name"),
  contact: trimmed(120).min(5, "Please enter an email or phone number"),
  dates: trimmed(80).optional(),
  guests: z.coerce.number().int().min(1).max(2000).optional(),
  budget: trimmed(40).optional(),
  message: trimmed(2000).min(5, "Tell us a little about your plans"),
  consent: z.literal(true, { error: "Please agree to how we use your details" }),
  website: z.string().max(0).optional(),
});

export const simulateSchema = z.object({
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  fromName: trimmed(80).min(2),
  fromContact: trimmed(120).min(5),
  message: trimmed(2000).min(3),
});

export const enquiryActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reroute"), lane: z.enum(["ROOM", "WEDDING", "OFFSITE", "COMPLAINT"]) }),
  z.object({ action: z.literal("saveDraft"), draft: z.string().trim().min(1).max(5000) }),
  z.object({ action: z.literal("refreshFacts") }),
  z.object({ action: z.literal("markReplied"), confirmUnverified: z.boolean().default(false) }),
  z.object({ action: z.literal("close") }),
  z.object({ action: z.literal("reopen") }),
  z.object({ action: z.literal("ackAlert") }),
]);

export const inventoryPatchSchema = z.object({
  roomTypeId: z.number().int().positive(),
  from: isoDate,
  to: isoDate,
  rate: z.number().int().optional(),
  allotment: z.number().int().optional(),
  closed: z.boolean().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
});

export const promoSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/, "4–20 letters or digits"),
  percentOff: z.number().int().min(1).max(50),
  minNights: z.number().int().min(1).max(14),
  validFrom: isoDate,
  validTo: isoDate,
  maxUses: z.number().int().positive().nullable(),
});

export const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) });
