import { addDays, todayAtResort } from "@/lib/dates";
import type { StaySearch as Stay } from "@/lib/booking";

/** A plain GET form: works before any JavaScript loads, which matters on slow hill-station networks. */
export function StaySearch({ stay, action = "/", compact = false }: { stay: Stay; action?: string; compact?: boolean }) {
  const today = todayAtResort();
  return (
    <form action={action} method="get" className={`card grid gap-3 p-4 shadow-sm ${compact ? "grid-cols-2" : "sm:grid-cols-5 sm:p-5"}`}>
      <div className={compact ? "" : "sm:col-span-1"}>
        <label htmlFor="in" className="label">
          Check-in
        </label>
        <input id="in" name="in" type="date" required min={today} max={addDays(today, 365)} defaultValue={stay.checkIn} className="field" />
      </div>
      <div className={compact ? "" : "sm:col-span-1"}>
        <label htmlFor="out" className="label">
          Check-out
        </label>
        <input id="out" name="out" type="date" required min={addDays(today, 1)} max={addDays(today, 379)} defaultValue={stay.checkOut} className="field" />
      </div>
      <div className={`grid grid-cols-2 gap-3 ${compact ? "col-span-2" : "sm:col-span-2"}`}>
        <div>
          <label htmlFor="adults" className="label">
            Adults
          </label>
          <select id="adults" name="adults" defaultValue={stay.adults} className="field">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="children" className="label">
            Children
          </label>
          <select id="children" name="children" defaultValue={stay.children} className="field">
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <div className={`flex items-end ${compact ? "col-span-2" : ""}`}>
        <button type="submit" className="btn-primary w-full py-3">
          {compact ? "Update dates" : "Check availability"}
        </button>
      </div>
    </form>
  );
}
