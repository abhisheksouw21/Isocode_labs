CREATE TYPE "public"."booking_status" AS ENUM('HOLD', 'CONFIRMED', 'EXPIRED', 'PAYMENT_FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('ROOM', 'WEDDING', 'OFFSITE', 'COMPLAINT');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('WEB', 'EMAIL', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."classified_by" AS ENUM('LOCAL', 'LLM', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."enquiry_status" AS ENUM('NEW', 'REPLIED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."lane" AS ENUM('ROOM', 'WEDDING', 'OFFSITE', 'COMPLAINT', 'UNSORTED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('STAFF', 'GM');--> statement-breakpoint
CREATE TYPE "public"."room_kind" AS ENUM('ROOM', 'VILLA');--> statement-breakpoint
CREATE TYPE "public"."team" AS ENUM('RESERVATIONS', 'SALES', 'MANAGEMENT');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"room_type_id" integer NOT NULL,
	"rate_plan_id" integer NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"nights" integer NOT NULL,
	"adults" integer NOT NULL,
	"children" integer NOT NULL,
	"guest_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"guest_phone" text NOT NULL,
	"requests" text,
	"consent_at" timestamp with time zone NOT NULL,
	"status" "booking_status" DEFAULT 'HOLD' NOT NULL,
	"hold_expires_at" timestamp with time zone NOT NULL,
	"promo_code" text,
	"subtotal" integer NOT NULL,
	"discount" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"channel" "channel" NOT NULL,
	"from_name" text NOT NULL,
	"from_contact" text NOT NULL,
	"message" text NOT NULL,
	"form" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"category" "category",
	"confidence" real DEFAULT 0 NOT NULL,
	"lane" "lane" DEFAULT 'UNSORTED' NOT NULL,
	"classified_by" "classified_by" DEFAULT 'LOCAL' NOT NULL,
	"ai_note" text,
	"extracted" jsonb NOT NULL,
	"assignee_id" integer,
	"gm_alert" boolean DEFAULT false NOT NULL,
	"status" "enquiry_status" DEFAULT 'NEW' NOT NULL,
	"draft" text NOT NULL,
	"draft_facts" jsonb NOT NULL,
	"retain_until" timestamp with time zone NOT NULL,
	CONSTRAINT "enquiries_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "enquiry_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"enquiry_id" integer NOT NULL,
	"type" text NOT NULL,
	"actor" text NOT NULL,
	"detail" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_type_id" integer NOT NULL,
	"date" date NOT NULL,
	"rate" integer NOT NULL,
	"allotment" integer NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL,
	"held" integer DEFAULT 0 NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_never_oversold" CHECK ("inventory"."sold" + "inventory"."held" <= "inventory"."allotment"),
	CONSTRAINT "inventory_non_negative" CHECK ("inventory"."sold" >= 0 AND "inventory"."held" >= 0 AND "inventory"."allotment" >= 0),
	CONSTRAINT "inventory_rate_positive" CHECK ("inventory"."rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"provider" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"provider_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"percent_off" integer NOT NULL,
	"min_nights" integer DEFAULT 1 NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code"),
	CONSTRAINT "promo_percent_range" CHECK ("promo_codes"."percent_off" BETWEEN 1 AND 50)
);
--> statement-breakpoint
CREATE TABLE "rate_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_type_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"adjustment_pct" integer DEFAULT 0 NOT NULL,
	"refundable" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "room_kind" NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"total_units" integer NOT NULL,
	"max_adults" integer NOT NULL,
	"max_children" integer NOT NULL,
	"max_guests" integer NOT NULL,
	"size_sqm" integer NOT NULL,
	"bed" text NOT NULL,
	"view" text NOT NULL,
	"amenities" text[] NOT NULL,
	"images" text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "room_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tax_slabs" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"min_tariff" integer NOT NULL,
	"max_tariff" integer,
	"rate_pct" numeric(5, 2) NOT NULL,
	"effective_from" date NOT NULL,
	"note" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'STAFF' NOT NULL,
	"team" "team" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rate_plan_id_rate_plans_id_fk" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_events" ADD CONSTRAINT "enquiry_events_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_status_expiry" ON "bookings" USING btree ("status","hold_expires_at");--> statement-breakpoint
CREATE INDEX "enquiries_lane_status" ON "enquiries" USING btree ("lane","status");--> statement-breakpoint
CREATE INDEX "enquiry_events_enquiry" ON "enquiry_events" USING btree ("enquiry_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_room_date" ON "inventory" USING btree ("room_type_id","date");--> statement-breakpoint
CREATE INDEX "inventory_date" ON "inventory" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_plans_room_code" ON "rate_plans" USING btree ("room_type_id","code");