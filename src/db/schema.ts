import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["STAFF", "GM"]);
export const teamEnum = pgEnum("team", ["RESERVATIONS", "SALES", "MANAGEMENT"]);
export const roomKindEnum = pgEnum("room_kind", ["ROOM", "VILLA"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "HOLD",
  "CONFIRMED",
  "EXPIRED",
  "PAYMENT_FAILED",
  "CANCELLED",
]);
export const channelEnum = pgEnum("channel", ["WEB", "EMAIL", "WHATSAPP"]);
export const categoryEnum = pgEnum("category", ["ROOM", "WEDDING", "OFFSITE", "COMPLAINT"]);
export const laneEnum = pgEnum("lane", ["ROOM", "WEDDING", "OFFSITE", "COMPLAINT", "UNSORTED"]);
export const classifiedByEnum = pgEnum("classified_by", ["LOCAL", "LLM", "STAFF"]);
export const enquiryStatusEnum = pgEnum("enquiry_status", ["NEW", "REPLIED", "CLOSED"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("STAFF"),
  team: teamEnum("team").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roomTypes = pgTable("room_types", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: roomKindEnum("kind").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  totalUnits: integer("total_units").notNull(),
  maxAdults: integer("max_adults").notNull(),
  maxChildren: integer("max_children").notNull(),
  maxGuests: integer("max_guests").notNull(),
  sizeSqm: integer("size_sqm").notNull(),
  bed: text("bed").notNull(),
  view: text("view").notNull(),
  amenities: text("amenities").array().notNull(),
  images: text("images").array().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const ratePlans = pgTable(
  "rate_plans",
  {
    id: serial("id").primaryKey(),
    roomTypeId: integer("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    adjustmentPct: integer("adjustment_pct").notNull().default(0),
    refundable: boolean("refundable").notNull().default(true),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("rate_plans_room_code").on(t.roomTypeId, t.code)],
);

export const inventory = pgTable(
  "inventory",
  {
    id: serial("id").primaryKey(),
    roomTypeId: integer("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    rate: integer("rate").notNull(),
    allotment: integer("allotment").notNull(),
    sold: integer("sold").notNull().default(0),
    held: integer("held").notNull().default(0),
    closed: boolean("closed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("inventory_room_date").on(t.roomTypeId, t.date),
    index("inventory_date").on(t.date),
    check("inventory_never_oversold", sql`${t.sold} + ${t.held} <= ${t.allotment}`),
    check("inventory_non_negative", sql`${t.sold} >= 0 AND ${t.held} >= 0 AND ${t.allotment} >= 0`),
    check("inventory_rate_positive", sql`${t.rate} > 0`),
  ],
);

export const taxSlabs = pgTable("tax_slabs", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  minTariff: integer("min_tariff").notNull(),
  maxTariff: integer("max_tariff"),
  ratePct: numeric("rate_pct", { precision: 5, scale: 2 }).notNull(),
  effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
  note: text("note").notNull(),
});

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    percentOff: integer("percent_off").notNull(),
    minNights: integer("min_nights").notNull().default(1),
    validFrom: date("valid_from", { mode: "string" }).notNull(),
    validTo: date("valid_to", { mode: "string" }).notNull(),
    maxUses: integer("max_uses"),
    uses: integer("uses").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("promo_percent_range", sql`${t.percentOff} BETWEEN 1 AND 50`)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    ref: text("ref").notNull().unique(),
    roomTypeId: integer("room_type_id")
      .notNull()
      .references(() => roomTypes.id),
    ratePlanId: integer("rate_plan_id")
      .notNull()
      .references(() => ratePlans.id),
    checkIn: date("check_in", { mode: "string" }).notNull(),
    checkOut: date("check_out", { mode: "string" }).notNull(),
    nights: integer("nights").notNull(),
    adults: integer("adults").notNull(),
    children: integer("children").notNull(),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestPhone: text("guest_phone").notNull(),
    requests: text("requests"),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    status: bookingStatusEnum("status").notNull().default("HOLD"),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }).notNull(),
    promoCode: text("promo_code"),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull(),
    tax: integer("tax").notNull(),
    total: integer("total").notNull(),
    breakdown: jsonb("breakdown").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookings_status_expiry").on(t.status, t.holdExpiresAt)],
);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id),
  provider: text("provider").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  providerRef: text("provider_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const enquiries = pgTable(
  "enquiries",
  {
    id: serial("id").primaryKey(),
    ref: text("ref").notNull().unique(),
    channel: channelEnum("channel").notNull(),
    fromName: text("from_name").notNull(),
    fromContact: text("from_contact").notNull(),
    message: text("message").notNull(),
    form: jsonb("form"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    category: categoryEnum("category"),
    confidence: real("confidence").notNull().default(0),
    lane: laneEnum("lane").notNull().default("UNSORTED"),
    classifiedBy: classifiedByEnum("classified_by").notNull().default("LOCAL"),
    aiNote: text("ai_note"),
    extracted: jsonb("extracted").notNull(),
    assigneeId: integer("assignee_id").references(() => users.id),
    gmAlert: boolean("gm_alert").notNull().default(false),
    status: enquiryStatusEnum("status").notNull().default("NEW"),
    draft: text("draft").notNull(),
    draftFacts: jsonb("draft_facts").notNull(),
    retainUntil: timestamp("retain_until", { withTimezone: true }).notNull(),
  },
  (t) => [index("enquiries_lane_status").on(t.lane, t.status)],
);

export const enquiryEvents = pgTable(
  "enquiry_events",
  {
    id: serial("id").primaryKey(),
    enquiryId: integer("enquiry_id")
      .notNull()
      .references(() => enquiries.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    actor: text("actor").notNull(),
    detail: jsonb("detail").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("enquiry_events_enquiry").on(t.enquiryId, t.createdAt)],
);

export type RoomType = typeof roomTypes.$inferSelect;
export type RatePlan = typeof ratePlans.$inferSelect;
export type InventoryRow = typeof inventory.$inferSelect;
export type TaxSlab = typeof taxSlabs.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
export type EnquiryEvent = typeof enquiryEvents.$inferSelect;
export type User = typeof users.$inferSelect;
