import { addDays, isIsoDate, toIso } from "../dates";

export type Extracted = {
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  eventMonth?: string;
  adults?: number;
  children?: number;
  guests?: number;
  budget?: number;
  roomPreference?: "VILLA" | "SUITE" | "ROOM";
  needs: string[];
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};
const MONTH_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
const NUM = "(\\d{1,4}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";

function num(word: string): number {
  return /^\d+$/.test(word) ? Number(word) : NUMBER_WORDS[word];
}

/** Picks the next occurrence of day/month on or after the day the message arrived. */
function resolveDate(day: number, month: number, year: number | undefined, received: string): string | undefined {
  const receivedYear = Number(received.slice(0, 4));
  const build = (y: number) => `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (year) return isIsoDate(build(year)) ? build(year) : undefined;
  const thisYear = build(receivedYear);
  if (!isIsoDate(thisYear)) return undefined;
  return thisYear >= received ? thisYear : build(receivedYear + 1);
}

function resolveMonth(month: number, year: number | undefined, received: string): string {
  const receivedYear = Number(received.slice(0, 4));
  const receivedMonth = Number(received.slice(5, 7));
  const y = year ?? (month >= receivedMonth ? receivedYear : receivedYear + 1);
  return `${y}-${String(month).padStart(2, "0")}`;
}

export function extractEntities(message: string, receivedAt: Date): Extracted {
  const text = message.toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/[–—]/g, "-");
  const received = toIso(receivedAt);
  const out: Extracted = { needs: [] };

  const nightsMatch = text.match(new RegExp(`${NUM}\\s+nights?`));
  if (nightsMatch) out.nights = num(nightsMatch[1]);

  const yearAfter = "(?:,?\\s*(\\d{4}))?";
  const rangeSameMonth = text.match(new RegExp(`\\b(\\d{1,2})\\s*(?:-|to|till|until)\\s*(\\d{1,2})\\s+${MONTH_RE}${yearAfter}`));
  const rangeMonthFirst = text.match(new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})\\s*(?:-|to)\\s*(\\d{1,2})${yearAfter}`));
  const rangeTwoMonths = text.match(new RegExp(`\\b(\\d{1,2})\\s+${MONTH_RE}\\s*(?:-|to|till|until)\\s*(\\d{1,2})\\s+${MONTH_RE}${yearAfter}`));
  const single = text.match(new RegExp(`\\b(\\d{1,2})\\s+${MONTH_RE}${yearAfter}\\b`));

  let start: string | undefined;
  let end: string | undefined;
  if (rangeTwoMonths) {
    const year = rangeTwoMonths[5] ? Number(rangeTwoMonths[5]) : undefined;
    start = resolveDate(Number(rangeTwoMonths[1]), MONTHS[rangeTwoMonths[2]], year, received);
    end = start ? resolveDate(Number(rangeTwoMonths[3]), MONTHS[rangeTwoMonths[4]], year, start) : undefined;
  } else if (rangeSameMonth) {
    const year = rangeSameMonth[4] ? Number(rangeSameMonth[4]) : undefined;
    start = resolveDate(Number(rangeSameMonth[1]), MONTHS[rangeSameMonth[3]], year, received);
    end = start ? resolveDate(Number(rangeSameMonth[2]), MONTHS[rangeSameMonth[3]], year ?? Number(start.slice(0, 4)), received) : undefined;
  } else if (rangeMonthFirst) {
    const year = rangeMonthFirst[4] ? Number(rangeMonthFirst[4]) : undefined;
    start = resolveDate(Number(rangeMonthFirst[2]), MONTHS[rangeMonthFirst[1]], year, received);
    end = start ? resolveDate(Number(rangeMonthFirst[3]), MONTHS[rangeMonthFirst[1]], year ?? Number(start.slice(0, 4)), received) : undefined;
  } else if (single) {
    start = resolveDate(Number(single[1]), MONTHS[single[2]], single[3] ? Number(single[3]) : undefined, received);
    if (start && out.nights) end = addDays(start, out.nights);
  }

  if (start && end && end > start) {
    out.checkIn = start;
    out.checkOut = end;
    out.nights = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
  } else if (start && !end) {
    out.checkIn = start;
  }

  if (!out.checkIn) {
    const monthOnly = text.match(new RegExp(`\\b${MONTH_RE}\\b(?:\\s*,?\\s*(\\d{4}))?`));
    if (monthOnly && !(monthOnly[1] === "may" && !monthOnly[2] && !/\bin may\b/.test(text))) {
      out.eventMonth = resolveMonth(MONTHS[monthOnly[1]], monthOnly[2] ? Number(monthOnly[2]) : undefined, received);
    }
  }

  const adults = text.match(new RegExp(`${NUM}\\s+adults?`));
  if (adults) out.adults = num(adults[1]);
  const kids = text.match(new RegExp(`${NUM}\\s+(?:child|children|kids?|infants?)\\b`));
  if (kids) out.children = num(kids[1]);
  if (!out.adults && /\bcouple\b/.test(text)) out.adults = 2;

  const party = text.match(/(?:team of|group of|family of|party of)\s+(\d{1,4}|two|three|four|five|six|seven|eight|nine|ten)/);
  const headcount = text.match(/(\d{1,4})\s*(?:\+\s*)?(?:guests?|people|persons?|pax|members?|delegates?|employees?|staff|colleagues?|participants?|log)\b/);
  if (party) out.guests = num(party[1]);
  else if (headcount) out.guests = Number(headcount[1]);
  else if (out.adults) out.guests = out.adults + (out.children ?? 0);

  const budget = text.match(/(?:₹|rs\.?|inr|budget(?:\s+(?:of|is|around|approx|about))?)\s*([\d,.]+)\s*(lakh|lakhs|lac|lacs|l|k|cr|crore)?\b/);
  if (budget) {
    const value = Number(budget[1].replace(/,/g, ""));
    const unit = budget[2];
    const multiplier = unit?.startsWith("l") ? 100_000 : unit === "k" ? 1_000 : unit?.startsWith("cr") ? 10_000_000 : 1;
    if (Number.isFinite(value) && value > 0) out.budget = Math.round(value * multiplier);
  }

  if (/\bvillas?\b|\bbungalow|cottage/.test(text)) out.roomPreference = "VILLA";
  else if (/\bsuites?\b/.test(text)) out.roomPreference = "SUITE";
  else if (/\brooms?\b/.test(text)) out.roomPreference = "ROOM";

  const needs: [RegExp, string][] = [
    [/conference|meeting (?:room|hall)|boardroom|breakout/, "Meeting space"],
    [/projector|\bav\b|mic|flipchart|whiteboard/, "AV equipment"],
    [/lawn|outdoor/, "Lawn"],
    [/catering|lunch|dinner|meals?|food/, "Catering"],
    [/breakfast/, "Breakfast"],
    [/team building|activit|trek/, "Activities"],
    [/mehendi|sangeet|haldi|reception|cocktail|mandap/, "Wedding functions"],
    [/\bpets?\b|\bdogs?\b/, "Pets"],
    [/extra bed|infant|crib/, "Extra bed / cot"],
  ];
  for (const [re, label] of needs) if (re.test(text)) out.needs.push(label);

  return out;
}
