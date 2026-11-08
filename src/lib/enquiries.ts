import { randomInt } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { triageEnquiry, type LaneLabel } from "./ai/classify";
import { composeDraft, unverifiedAmounts, type Fact } from "./ai/draft";
import type { Extracted } from "./ai/extract";
import type { CategoryLabel } from "./ai/naive-bayes";
import { AppError, notFound } from "./errors";
import { RESORT } from "./resort";

type Channel = "WEB" | "EMAIL" | "WHATSAPP";
type TeamName = "RESERVATIONS" | "SALES" | "MANAGEMENT";

const LANE_TEAM: Record<LaneLabel, TeamName> = {
  ROOM: "RESERVATIONS",
  WEDDING: "SALES",
  OFFSITE: "SALES",
  COMPLAINT: "MANAGEMENT",
  UNSORTED: "MANAGEMENT",
};
const TEAM_LABEL: Record<TeamName, string> = { RESERVATIONS: "Reservations", SALES: "Events & Sales", MANAGEMENT: "General Manager" };

/** Owner = the least-busy person on the lane's team (open enquiries). */
async function pickOwner(lane: LaneLabel) {
  const team = LANE_TEAM[lane];
  const rows = await db.execute<{ id: number; name: string; team: TeamName; open: number }>(sql`
    SELECT u.id, u.name, u.team, COUNT(e.id)::int AS open
    FROM users u
    LEFT JOIN enquiries e ON e.assignee_id = u.id AND e.status = 'NEW'
    WHERE u.team = ${team}
    GROUP BY u.id ORDER BY open ASC, u.id ASC LIMIT 1`);
  const owner = rows.rows[0];
  if (!owner) throw new AppError("NO_OWNER", `No staff on the ${team} team`, 500);
  return owner;
}

function signer(owner: { name: string; team: TeamName }) {
  return { name: owner.name, team: TEAM_LABEL[owner.team] };
}

export type NewEnquiry = {
  channel: Channel;
  fromName: string;
  fromContact: string;
  message: string;
  form?: Record<string, unknown>;
  receivedAt?: Date;
  ref?: string;
};

export async function ingestEnquiry(input: NewEnquiry) {
  const receivedAt = input.receivedAt ?? new Date();
  const triage = await triageEnquiry(input.message, receivedAt);
  const owner = await pickOwner(triage.lane);
  const draftCategory: CategoryLabel = triage.category;
  const draft = await composeDraft({ category: draftCategory, extracted: triage.extracted, fromName: input.fromName, signer: signer(owner) });

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.enquiries)
      .values({
        ref: input.ref ?? `ENQ-${randomInt(5000, 99999)}`,
        channel: input.channel,
        fromName: input.fromName,
        fromContact: input.fromContact,
        message: input.message,
        form: input.form ?? null,
        receivedAt,
        category: triage.category,
        confidence: triage.confidence,
        lane: triage.lane,
        classifiedBy: triage.classifiedBy,
        aiNote: triage.reasons.join(" · ") || null,
        extracted: { ...triage.extracted, scores: triage.scores },
        assigneeId: owner.id,
        gmAlert: triage.gmAlert,
        draft: draft.draft,
        draftFacts: { facts: draft.facts, questions: draft.questions, asOf: draft.factsAsOf },
        retainUntil: new Date(receivedAt.getTime() + RESORT.enquiryRetentionDays * 86_400_000),
      })
      .returning();
    await tx.insert(schema.enquiryEvents).values([
      {
        enquiryId: row.id,
        type: "CLASSIFIED",
        actor: triage.classifiedBy === "LLM" ? "Cloud model" : "Local model",
        detail: { category: triage.category, lane: triage.lane, confidence: triage.confidence, reasons: triage.reasons },
      },
      { enquiryId: row.id, type: "ASSIGNED", actor: "Router", detail: { to: owner.name, team: owner.team } },
      ...(triage.gmAlert ? [{ enquiryId: row.id, type: "GM_ALERT", actor: "Complaint rule", detail: { reasons: triage.reasons } }] : []),
    ]);
    return row;
  });
}

export async function listEnquiries(filter: { lane?: LaneLabel; assigneeId?: number; status?: "NEW" | "REPLIED" | "CLOSED" }) {
  const conds = [];
  if (filter.lane) conds.push(eq(schema.enquiries.lane, filter.lane));
  if (filter.assigneeId) conds.push(eq(schema.enquiries.assigneeId, filter.assigneeId));
  if (filter.status) conds.push(eq(schema.enquiries.status, filter.status));
  return db
    .select({ enquiry: schema.enquiries, assignee: { id: schema.users.id, name: schema.users.name } })
    .from(schema.enquiries)
    .leftJoin(schema.users, eq(schema.users.id, schema.enquiries.assigneeId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.enquiries.gmAlert), desc(schema.enquiries.receivedAt));
}

export async function laneCounts() {
  const rows = await db.execute<{ lane: LaneLabel; open: number; alerts: number }>(sql`
    SELECT lane, COUNT(*) FILTER (WHERE status = 'NEW')::int AS open,
           COUNT(*) FILTER (WHERE gm_alert AND status = 'NEW')::int AS alerts
    FROM enquiries GROUP BY lane`);
  return rows.rows;
}

export async function getEnquiry(id: number) {
  const [row] = await db
    .select({ enquiry: schema.enquiries, assignee: { id: schema.users.id, name: schema.users.name, team: schema.users.team } })
    .from(schema.enquiries)
    .leftJoin(schema.users, eq(schema.users.id, schema.enquiries.assigneeId))
    .where(eq(schema.enquiries.id, id));
  if (!row) return null;
  const events = await db
    .select()
    .from(schema.enquiryEvents)
    .where(eq(schema.enquiryEvents.enquiryId, id))
    .orderBy(desc(schema.enquiryEvents.createdAt), desc(schema.enquiryEvents.id));
  return { ...row, events };
}

/** One-click re-route: staff override the model, the draft is rebuilt for the new category. */
export async function rerouteEnquiry(id: number, lane: Exclude<LaneLabel, "UNSORTED">, actor: string) {
  const current = await getEnquiry(id);
  if (!current) throw notFound("Enquiry");
  const e = current.enquiry;
  const owner = await pickOwner(lane);
  const draft = await composeDraft({ category: lane, extracted: e.extracted as Extracted, fromName: e.fromName, signer: signer(owner) });
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.enquiries)
      .set({
        category: lane,
        lane,
        classifiedBy: "STAFF",
        assigneeId: owner.id,
        gmAlert: lane === "COMPLAINT" ? true : e.gmAlert,
        draft: draft.draft,
        draftFacts: { facts: draft.facts, questions: draft.questions, asOf: draft.factsAsOf },
      })
      .where(eq(schema.enquiries.id, id))
      .returning();
    await tx.insert(schema.enquiryEvents).values({
      enquiryId: id,
      type: "REROUTED",
      actor,
      detail: { from: e.lane, to: lane, modelSaid: e.category, confidence: e.confidence, newOwner: owner.name },
    });
    return row;
  });
}

export async function saveDraft(id: number, draft: string, actor: string) {
  const [row] = await db.update(schema.enquiries).set({ draft }).where(eq(schema.enquiries.id, id)).returning();
  if (!row) throw notFound("Enquiry");
  await db.insert(schema.enquiryEvents).values({ enquiryId: id, type: "DRAFT_EDITED", actor, detail: { length: draft.length } });
  return row;
}

export async function refreshFacts(id: number, actor: string) {
  const current = await getEnquiry(id);
  if (!current) throw notFound("Enquiry");
  const e = current.enquiry;
  const category = (e.category ?? "ROOM") as CategoryLabel;
  const draft = await composeDraft({
    category,
    extracted: e.extracted as Extracted,
    fromName: e.fromName,
    signer: signer({ name: current.assignee?.name ?? "Reservations", team: (current.assignee?.team ?? "RESERVATIONS") as TeamName }),
  });
  const [row] = await db
    .update(schema.enquiries)
    .set({ draft: draft.draft, draftFacts: { facts: draft.facts, questions: draft.questions, asOf: draft.factsAsOf } })
    .where(eq(schema.enquiries.id, id))
    .returning();
  await db.insert(schema.enquiryEvents).values({ enquiryId: id, type: "FACTS_REFRESHED", actor, detail: { facts: draft.facts.length } });
  return row;
}

/**
 * Drafts are never sent by the system. Staff copy the reply into the channel it
 * came from and mark it replied. Unknown prices block this unless confirmed.
 */
export async function markReplied(id: number, actor: string, confirmUnverified: boolean) {
  const current = await getEnquiry(id);
  if (!current) throw notFound("Enquiry");
  const facts = ((current.enquiry.draftFacts as { facts?: Fact[] })?.facts ?? []) as Fact[];
  const unknown = unverifiedAmounts(current.enquiry.draft, facts);
  if (unknown.length && !confirmUnverified)
    throw new AppError("UNVERIFIED_PRICE", `These amounts aren't from the rate table: ${unknown.join(", ")}`, 409);
  const [row] = await db.update(schema.enquiries).set({ status: "REPLIED" }).where(eq(schema.enquiries.id, id)).returning();
  await db.insert(schema.enquiryEvents).values({
    enquiryId: id,
    type: "MARKED_REPLIED",
    actor,
    detail: { channel: current.enquiry.channel, unverifiedAmounts: unknown },
  });
  return row;
}

export async function setStatus(id: number, status: "NEW" | "CLOSED", actor: string) {
  const [row] = await db.update(schema.enquiries).set({ status }).where(eq(schema.enquiries.id, id)).returning();
  if (!row) throw notFound("Enquiry");
  await db.insert(schema.enquiryEvents).values({ enquiryId: id, type: status === "CLOSED" ? "CLOSED" : "REOPENED", actor, detail: {} });
  return row;
}

export async function acknowledgeAlert(id: number, actor: string) {
  const [row] = await db.update(schema.enquiries).set({ gmAlert: false }).where(eq(schema.enquiries.id, id)).returning();
  if (!row) throw notFound("Enquiry");
  await db.insert(schema.enquiryEvents).values({ enquiryId: id, type: "ALERT_ACKNOWLEDGED", actor, detail: {} });
  return row;
}

export async function purgeExpiredEnquiries(now = new Date()) {
  const res = await db.execute(sql`DELETE FROM enquiries WHERE retain_until < ${now.toISOString()}`);
  return res.rowCount ?? 0;
}
