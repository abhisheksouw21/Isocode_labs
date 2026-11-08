import { addDays, isIsoDate, todayAtResort } from "./dates";
import type { StaySearch } from "./booking";

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function count(v: string | undefined, fallback: number, min: number, max: number) {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

/** Reads ?in&out&adults&children with safe defaults (a weekend-length stay a week out). */
export function parseStay(sp: Params): StaySearch & { defaulted: boolean } {
  const today = todayAtResort();
  const rawIn = one(sp.in);
  const rawOut = one(sp.out);
  const valid = rawIn && rawOut && isIsoDate(rawIn) && isIsoDate(rawOut) && rawIn >= today && rawOut > rawIn;
  const checkIn = valid ? rawIn : addDays(today, 7);
  const checkOut = valid ? rawOut : addDays(checkIn, 2);
  return {
    checkIn,
    checkOut,
    adults: count(one(sp.adults), 2, 1, 6),
    children: count(one(sp.children), 0, 0, 4),
    defaulted: !valid,
  };
}

export function stayQuery(s: StaySearch, extra: Record<string, string | number> = {}) {
  const q = new URLSearchParams({ in: s.checkIn, out: s.checkOut, adults: String(s.adults), children: String(s.children) });
  for (const [k, v] of Object.entries(extra)) q.set(k, String(v));
  return q.toString();
}
