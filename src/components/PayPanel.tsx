"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatINR } from "@/lib/money";

export function PayPanel({ bookingRef, total, expiresAt }: { bookingRef: string; total: number; expiresAt: string }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<null | "success" | "declined">(null);
  const [error, setError] = useState<string | null>(null);
  const keys = useMemo(() => ({ success: crypto.randomUUID(), declined: crypto.randomUUID() }), []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, new Date(expiresAt).getTime() - now);
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  useEffect(() => {
    if (left === 0) router.refresh();
  }, [left, router]);

  async function pay(outcome: "success" | "declined") {
    if (busy) return;
    setBusy(outcome);
    setError(null);
    try {
      const res = await fetch("/api/payments/mock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref: bookingRef, outcome, idempotencyKey: keys[outcome] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      if (body.status === "CONFIRMED") router.replace(`/booking/${bookingRef}`);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment couldn't be completed. You haven't been charged.");
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Pay to confirm</h1>
          <p className="mt-1 text-sm text-muted">Your room is held while you pay.</p>
        </div>
        <p className={`rounded-full px-3 py-1 text-sm tabular-nums ${left < 120_000 ? "bg-clay/10 text-clay" : "bg-sand text-muted"}`} aria-live="polite">
          {mm}:{ss}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-line bg-paper p-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Test mode · MockPay</p>
        <p className="mt-1 text-sm text-muted">No real money moves. Choose an outcome to see how the booking behaves.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button onClick={() => pay("success")} disabled={!!busy || left === 0} className="btn-primary py-3">
            {busy === "success" ? "Processing…" : `Pay ${formatINR(total)}`}
          </button>
          <button onClick={() => pay("declined")} disabled={!!busy || left === 0} className="btn-ghost py-3">
            {busy === "declined" ? "Processing…" : "Simulate declined card"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs text-muted">Reference {bookingRef}</p>
    </div>
  );
}
