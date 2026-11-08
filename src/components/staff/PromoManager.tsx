"use client";

import { CircleCheck, CirclePause } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PromoCode } from "@/db/schema";
import { addDays, formatDate } from "@/lib/dates";

export function PromoManager({ promos, today }: { promos: PromoCode[]; today: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/staff/promos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: f.get("code"),
        percentOff: Number(f.get("percentOff")),
        minNights: Number(f.get("minNights")),
        validFrom: f.get("validFrom"),
        validTo: f.get("validTo"),
        maxUses: f.get("maxUses") ? Number(f.get("maxUses")) : null,
      }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setError(body.error);
    formEl.reset();
    router.refresh();
  }

  async function toggle(p: PromoCode) {
    const res = await fetch(`/api/staff/promos/${p.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !p.active }) });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              {["Code", "Off", "Min nights", "Valid for check-ins", "Used", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  No promo codes yet.
                </td>
              </tr>
            )}
            {promos.map((p) => (
              <tr key={p.id} className={`border-t border-line ${p.active ? "" : "text-muted"}`}>
                <td className="px-4 py-3 font-medium">{p.code}</td>
                <td className="px-4 py-3">{p.percentOff}%</td>
                <td className="px-4 py-3">{p.minNights}</td>
                <td className="px-4 py-3">
                  {formatDate(p.validFrom)} – {formatDate(p.validTo)}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {p.uses}
                  {p.maxUses ? ` / ${p.maxUses}` : ""}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${p.active ? "text-ok" : "text-muted"}`}>
                      {p.active ? <CircleCheck className="size-3.5" aria-hidden /> : <CirclePause className="size-3.5" aria-hidden />}
                      {p.active ? "Active" : "Paused"}
                    </span>
                    <button onClick={() => toggle(p)} className="btn-ghost btn-sm relative">
                      {p.active ? "Pause" : "Resume"}
                      <span className="sr-only"> {p.code}</span>
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="panel grid gap-3 p-5 sm:grid-cols-6">
        <h2 className="text-lg sm:col-span-6">New promo code</h2>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="code">
            Code
          </label>
          <input id="code" name="code" required pattern="[A-Za-z0-9]{4,20}" className="field uppercase" placeholder="WEEKDAY15" />
        </div>
        <div>
          <label className="label" htmlFor="pct">
            % off
          </label>
          <input id="pct" name="percentOff" type="number" min={1} max={50} required defaultValue={10} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="mn">
            Min nights
          </label>
          <input id="mn" name="minNights" type="number" min={1} max={14} required defaultValue={1} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="mu">
            Max uses
          </label>
          <input id="mu" name="maxUses" type="number" min={1} className="field" placeholder="Unlimited" />
        </div>
        <div className="sm:col-span-3">
          <label className="label" htmlFor="vf">
            Check-in from
          </label>
          <input id="vf" name="validFrom" type="date" required defaultValue={today} className="field" />
        </div>
        <div className="sm:col-span-3">
          <label className="label" htmlFor="vt">
            Check-in until
          </label>
          <input id="vt" name="validTo" type="date" required defaultValue={addDays(today, 90)} className="field" />
        </div>
        {error && <p className="text-sm text-alert sm:col-span-6">{error}</p>}
        <div className="sm:col-span-6">
          <button disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Create code"}
          </button>
        </div>
      </form>
    </div>
  );
}
