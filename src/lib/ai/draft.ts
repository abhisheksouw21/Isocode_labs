import { searchAvailability } from "../booking";
import { formatRange, nightsBetween, todayAtResort } from "../dates";
import { formatINR } from "../money";
import { RESORT } from "../resort";
import type { Extracted } from "./extract";
import type { CategoryLabel } from "./naive-bayes";

export type Fact = { kind: "availability" | "price" | "venue" | "policy"; text: string; amount?: number; source: string };

export type DraftResult = { draft: string; facts: Fact[]; questions: string[]; factsAsOf: string };

type Ctx = { category: CategoryLabel; extracted: Extracted; fromName: string; signer: { name: string; team: string } };

const KIND_LABEL: Record<string, string> = { VILLA: "villa", SUITE: "suite", ROOM: "room" };

function firstName(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 1 ? first : "there";
}

async function roomFacts(e: Extracted): Promise<{ facts: Fact[]; questions: string[] }> {
  const facts: Fact[] = [];
  const questions: string[] = [];
  if (!e.checkIn || !e.checkOut) {
    questions.push("Which dates would you like to check in and check out?");
    return { facts, questions };
  }
  if (e.checkIn < todayAtResort()) {
    questions.push("The dates you mentioned look like they've passed. Could you confirm the dates you have in mind?");
    return { facts, questions };
  }
  const adults = e.adults ?? (e.guests ? Math.min(e.guests, 2) : 2);
  const children = e.children ?? 0;
  if (!e.adults && !e.guests) questions.push("How many adults and children will be travelling?");

  let results;
  try {
    results = await searchAvailability({ checkIn: e.checkIn, checkOut: e.checkOut, adults, children });
  } catch (err) {
    questions.push(`Could you confirm your dates? (${err instanceof Error ? err.message : "dates need checking"})`);
    return { facts, questions };
  }

  const nights = nightsBetween(e.checkIn, e.checkOut);
  const stay = `${formatRange(e.checkIn, e.checkOut)} (${nights} night${nights > 1 ? "s" : ""})`;
  const wanted = (slug: string) => {
    if (!e.roomPreference) return true;
    const isVilla = slug.includes("villa");
    const isSuite = slug.includes("suite");
    return e.roomPreference === "VILLA" ? isVilla : e.roomPreference === "SUITE" ? isSuite : !isVilla;
  };
  const fitting = results.filter((r) => r.fits && r.available > 0 && r.plans.length);
  const preferred = fitting.filter((r) => wanted(r.slug));

  const quote = (r: (typeof fitting)[number]) => {
    const plan = r.plans.find((p) => p.code === "BB") ?? r.plans[0];
    return { plan, total: plan.quote.total };
  };

  if (preferred.length) {
    for (const r of preferred.slice(0, 2)) {
      const { plan, total } = quote(r);
      facts.push({ kind: "availability", text: `${r.name} is available for ${stay} for ${adults} adult${adults > 1 ? "s" : ""}${children ? ` and ${children} child${children > 1 ? "ren" : ""}` : ""}.`, source: "inventory" });
      facts.push({ kind: "price", text: `${plan.name}: ${formatINR(total)} for the stay, including GST.`, amount: total, source: "rate table" });
    }
  } else {
    const label = e.roomPreference ? `${KIND_LABEL[e.roomPreference]}s` : "rooms that fit your group";
    facts.push({ kind: "availability", text: `Our ${label} are fully booked for ${stay}.`, source: "inventory" });
    const alt = fitting[0];
    if (alt) {
      const { plan, total } = quote(alt);
      facts.push({ kind: "availability", text: `We do have the ${alt.name} for those dates.`, source: "inventory" });
      facts.push({ kind: "price", text: `${plan.name}: ${formatINR(total)} for the stay, including GST.`, amount: total, source: "rate table" });
    } else {
      questions.push("Would nearby dates work for you? We'd be glad to check alternatives.");
    }
  }
  return { facts, questions };
}

function eventFacts(category: "WEDDING" | "OFFSITE", e: Extracted): { facts: Fact[]; questions: string[] } {
  const facts: Fact[] = [];
  const questions: string[] = [];
  const guests = e.guests;
  if (category === "WEDDING") {
    if (guests && guests <= RESORT.venues.lawnCapacity)
      facts.push({ kind: "venue", text: `Our estate lawns host up to ${RESORT.venues.lawnCapacity} guests, so ${guests} fits comfortably.`, source: "venue config" });
    else if (guests)
      facts.push({ kind: "venue", text: `Our lawns host up to ${RESORT.venues.lawnCapacity} guests, so for ${guests} we'd plan the layout together.`, source: "venue config" });
    if (guests && guests > RESORT.maxGuestsInHouse)
      facts.push({ kind: "venue", text: `Our ${RESORT.keys} rooms and villas sleep about ${RESORT.maxGuestsInHouse} guests, so some guests may need nearby stays.`, source: "venue config" });
  } else {
    const room = guests && guests <= RESORT.venues.boardroomCapacity ? "boardroom" : "conference hall";
    const cap = room === "boardroom" ? RESORT.venues.boardroomCapacity : RESORT.venues.conferenceHallCapacity;
    if (guests && guests <= cap) facts.push({ kind: "venue", text: `Our ${room} seats up to ${cap}, so your group of ${guests} fits well.`, source: "venue config" });
    else if (guests) facts.push({ kind: "venue", text: `Our largest hall seats ${RESORT.venues.conferenceHallCapacity}; for ${guests} we can combine the hall and the lawn.`, source: "venue config" });
  }
  if (!e.checkIn) questions.push(e.eventMonth ? "Do you have exact dates in mind for that month?" : "Which dates are you considering?");
  if (!guests) questions.push("Roughly how many guests should we plan for?");
  if (!e.budget) questions.push("Is there a budget range you'd like us to work within?");
  if (e.nights || e.checkIn) questions.push("How many rooms would you like us to hold for your guests?");
  return { facts, questions };
}

const OPENING: Record<CategoryLabel, string> = {
  ROOM: "Thank you for thinking of us for your stay in the hills.",
  WEDDING: "Congratulations, and thank you for considering our estate for such a special occasion.",
  OFFSITE: "Thank you for considering our estate for your team's offsite.",
  COMPLAINT: "Thank you for telling us, and I'm truly sorry about your experience.",
};
const CLOSING: Record<CategoryLabel, string> = {
  ROOM: "You can also book directly on our website for the best available rate. Just reply here if you'd like us to hold a room for you.",
  WEDDING: "Once we have these details, our events team will send a tailored proposal with menus and room blocks.",
  OFFSITE: "Once we have these details, we'll send a full proposal covering rooms, meals and meeting space.",
  COMPLAINT: "Our General Manager has been informed and will personally follow up with you today.",
};

export async function composeDraft(ctx: Ctx): Promise<DraftResult> {
  const { facts, questions } =
    ctx.category === "ROOM"
      ? await roomFacts(ctx.extracted)
      : ctx.category === "WEDDING" || ctx.category === "OFFSITE"
        ? eventFacts(ctx.category, ctx.extracted)
        : { facts: [] as Fact[], questions: ["Could you share your booking reference so we can look into this right away?"] };

  const parts = [`Dear ${firstName(ctx.fromName)},`, OPENING[ctx.category]];
  if (facts.length) parts.push(facts.map((f) => f.text).join(" "));
  if (questions.length) parts.push(questions.length === 1 ? questions[0] : `A few details will help us:\n${questions.map((q) => `• ${q}`).join("\n")}`);
  parts.push(CLOSING[ctx.category]);
  parts.push(`Warm regards,\n${ctx.signer.name}\n${ctx.signer.team}, ${RESORT.name}`);

  return { draft: parts.join("\n\n"), facts, questions, factsAsOf: new Date().toISOString() };
}

/** Flags any rupee amount in an edited draft that didn't come from the rate table. */
export function unverifiedAmounts(draft: string, facts: Fact[]): string[] {
  const known = new Set(facts.filter((f) => f.amount !== undefined).map((f) => f.amount));
  const found = draft.match(/₹\s?[\d,]+/g) ?? [];
  return found.filter((m) => !known.has(Number(m.replace(/[₹,\s]/g, ""))));
}
