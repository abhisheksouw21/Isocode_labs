const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(toDate(iso).getTime() + days * DAY_MS));
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((toDate(checkOut).getTime() - toDate(checkIn).getTime()) / DAY_MS);
}

export function eachNight(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Today's date at the resort (IST, UTC+5:30). */
export function todayAtResort(now: Date = new Date()): string {
  return toIso(new Date(now.getTime() + 330 * 60_000));
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return toDate(iso).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
}

export function formatRange(checkIn: string, checkOut: string): string {
  const a = toDate(checkIn);
  const b = toDate(checkOut);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const left = formatDate(checkIn, sameYear ? { day: "numeric", month: "short" } : undefined);
  return `${left} – ${formatDate(checkOut)}`;
}

export function weekday(iso: string): number {
  return toDate(iso).getUTCDay();
}
