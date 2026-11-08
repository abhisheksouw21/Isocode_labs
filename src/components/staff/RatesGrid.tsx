"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InventoryRow, RoomType } from "@/db/schema";
import { addDays, formatDate, weekday } from "@/lib/dates";
import { formatINR } from "@/lib/money";

type Grid = { rooms: RoomType[]; rows: InventoryRow[]; from: string; to: string };
type Selection = { roomTypeId: number; from: string; to: string };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RatesGrid({ data, today }: { data: Grid; today: string }) {
  const router = useRouter();
  const dates = Array.from({ length: 14 }, (_, i) => addDays(data.from, i));
  const cell = (roomTypeId: number, date: string) => data.rows.find((r) => r.roomTypeId === roomTypeId && r.date === date);
  const [sel, setSel] = useState<Selection | null>(null);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="panel min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 text-sm">
          <Link href={`/staff/rates?from=${addDays(data.from, -14)}`} className="btn-ghost btn-sm" aria-label="Previous two weeks">
            ←
          </Link>
          <span>
            {formatDate(data.from)} – {formatDate(addDays(data.to, -1))}
          </span>
          <div className="flex gap-2">
            {data.from !== today && (
              <Link href="/staff/rates" className="btn-ghost btn-sm">
                Today
              </Link>
            )}
            <Link href={`/staff/rates?from=${addDays(data.from, 14)}`} className="btn-ghost btn-sm" aria-label="Next two weeks">
              →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-44 bg-white px-3 py-2 text-left font-medium text-muted">Room type</th>
                {dates.map((d) => (
                  <th key={d} className={`px-1 py-2 text-center font-normal ${weekday(d) === 5 || weekday(d) === 6 ? "bg-leaf" : ""}`}>
                    <span className="block text-muted">{WEEKDAYS[weekday(d)]}</span>
                    <span className="text-ink">{Number(d.slice(8))}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rooms.map((room) => (
                <tr key={room.id} className="border-t border-line">
                  <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-normal">
                    <span className="block font-medium text-ink">{room.name}</span>
                    <span className="text-muted">{room.totalUnits} units total</span>
                  </th>
                  {dates.map((d) => {
                    const c = cell(room.id, d);
                    if (!c) return <td key={d} className="px-1 py-2 text-center text-muted">—</td>;
                    const taken = c.sold + c.held;
                    const full = taken >= c.allotment;
                    const selected = sel && sel.roomTypeId === room.id && d >= sel.from && d <= sel.to;
                    return (
                      <td key={d} className="p-0.5">
                        <button
                          onClick={() => setSel({ roomTypeId: room.id, from: d, to: d })}
                          className={`min-h-11 w-full rounded-md px-1 py-1.5 text-center text-xs transition-colors ${
                            selected ? "ring-2 ring-canopy" : ""
                          } ${c.closed ? "bg-ink text-white" : full ? "bg-alert-tint" : "bg-mist hover:bg-leaf"}`}
                          aria-label={`${room.name}, ${d}: rate ${formatINR(c.rate)}, ${c.sold} sold, ${c.held} on hold, allotment ${c.allotment}${c.closed ? ", closed" : full ? ", full" : ""}`}
                          aria-pressed={!!selected}
                        >
                          <span className="block tabular-nums">{c.closed ? "Closed" : `₹${(c.rate / 1000).toFixed(1)}k`}</span>
                          <span className={`block tabular-nums ${full && !c.closed ? "font-semibold text-alert" : ""}`}>
                            {taken}/{c.allotment}
                            {full && !c.closed ? " full" : ""}
                          </span>
                          {c.held > 0 && <span className="block text-xs font-semibold text-warn">{c.held} paying</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">
          Each cell shows the rate, then rooms sold or on hold out of the website allotment. &ldquo;Full&rdquo; means the website has none left, &ldquo;paying&rdquo; means a guest is paying now, and dark cells are closed (blackout).
        </p>
      </div>

      <EditPanel
        key={sel ? `${sel.roomTypeId}-${sel.from}` : "none"}
        rooms={data.rooms}
        sel={sel}
        current={sel ? cell(sel.roomTypeId, sel.from) : undefined}
        today={today}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

function EditPanel({
  rooms,
  sel,
  current,
  today,
  onDone,
}: {
  rooms: RoomType[];
  sel: Selection | null;
  current?: InventoryRow;
  today: string;
  onDone: () => void;
}) {
  const [roomTypeId, setRoomTypeId] = useState(sel?.roomTypeId ?? rooms[0]?.id);
  const [from, setFrom] = useState(sel?.from ?? today);
  const [to, setTo] = useState(sel?.to ?? today);
  const [rate, setRate] = useState(current ? String(current.rate) : "");
  const [allotment, setAllotment] = useState(current ? String(current.allotment) : "");
  const [closed, setClosed] = useState<"" | "open" | "closed">(current ? (current.closed ? "closed" : "open") : "");
  const [days, setDays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const room = rooms.find((r) => r.id === roomTypeId);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { roomTypeId, from, to };
    if (rate) body.rate = Number(rate);
    if (allotment !== "") body.allotment = Number(allotment);
    if (closed) body.closed = closed === "closed";
    if (days.length) body.weekdays = days;
    if (!("rate" in body) && !("allotment" in body) && !("closed" in body)) {
      setMsg({ ok: false, text: "Change a rate, allotment or open/closed first" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/staff/inventory", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error);
      setMsg({ ok: true, text: `Updated ${out.updated} night${out.updated === 1 ? "" : "s"}` });
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't save" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="panel h-fit space-y-4 p-5">
      <div>
        <h2 className="text-lg">{sel ? "Edit nights" : "Bulk edit"}</h2>
        <p className="text-xs text-muted">Pick a cell, or set a range. Leave a field empty to keep it as it is.</p>
      </div>
      {current && (
        <p className="rounded-lg bg-mist px-3 py-2 text-xs text-muted">
          {current.sold} sold, {current.held} on hold, {formatINR(current.rate)} a night now
        </p>
      )}
      <div>
        <label className="label" htmlFor="rt">
          Room type
        </label>
        <select id="rt" value={roomTypeId} onChange={(e) => setRoomTypeId(Number(e.target.value))} className="field">
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="from">
            From
          </label>
          <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="to">
            To (inclusive)
          </label>
          <input id="to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} required className="field" />
        </div>
      </div>
      <fieldset>
        <legend className="label">Only on</legend>
        <div className="flex flex-wrap gap-1">
          {WEEKDAYS.map((w, i) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(days.includes(i) ? days.filter((d) => d !== i) : [...days, i])}
              className={`rounded-full border px-2 py-0.5 text-xs ${days.includes(i) ? "border-canopy bg-canopy text-white" : "border-line"}`}
            >
              {w}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="rate">
            Rate (₹/night)
          </label>
          <input id="rate" type="number" min={1000} max={500000} step={50} value={rate} onChange={(e) => setRate(e.target.value)} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="allot">
            Allotment
          </label>
          <input id="allot" type="number" min={0} max={room?.totalUnits} value={allotment} onChange={(e) => setAllotment(e.target.value)} className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="closed">
          Website sales
        </label>
        <select id="closed" value={closed} onChange={(e) => setClosed(e.target.value as "" | "open" | "closed")} className="field">
          <option value="">Keep as is</option>
          <option value="open">Open</option>
          <option value="closed">Closed (blackout)</option>
        </select>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-alert"}`}>{msg.text}</p>}
      <button disabled={busy} className="btn-primary w-full">
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
