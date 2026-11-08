"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatINR } from "@/lib/money";

/** Seconds left at which screen readers hear an update. Never every second. */
const ANNOUNCE_AT = [300, 120, 60, 30, 0];

function spoken(seconds: number) {
  if (seconds === 0) return "Your hold has ended.";
  if (seconds >= 60) return `${seconds / 60} minute${seconds === 60 ? "" : "s"} left to pay before the room is released.`;
  return `${seconds} seconds left to pay before the room is released.`;
}

export function PayPanel({ bookingRef, total, expiresAt }: { bookingRef: string; total: number; expiresAt: string }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<null | "success" | "declined">(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const announced = useRef(new Set<number>());
  const keys = useMemo(() => ({ success: crypto.randomUUID(), declined: crypto.randomUUID() }), []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const end = new Date(expiresAt).getTime();
  const left = Math.max(0, end - now);
  const secs = Math.ceil(left / 1000);
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, "0");
  const until = new Date(end).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  const primed = useRef(false);
  useEffect(() => {
    if (!primed.current) {
      primed.current = true;
      for (const t of ANNOUNCE_AT) if (secs < t) announced.current.add(t);
    }
    const due = ANNOUNCE_AT.find((t) => secs <= t && !announced.current.has(t));
    if (due === undefined) return;
    for (const t of ANNOUNCE_AT) if (t >= due) announced.current.add(t);
    setAnnouncement(spoken(due));
  }, [secs]);

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
      setError(err instanceof Error ? err.message : "The payment didn't go through and nothing was charged. Try again.");
      setBusy(null);
    }
  }

  const urgent = left < 120_000;
  return (
    <div>
      <h1 className="text-4xl">Pay to confirm</h1>
      <div className={`mt-5 flex items-center gap-3 rounded-[var(--radius-ui)] px-4 py-3 ${urgent ? "bg-alert-tint text-alert" : "bg-leaf"}`}>
        <Clock className="size-5 shrink-0" aria-hidden />
        <p>
          Your room is held until {until}.{" "}
          <span className="font-display text-xl tabular-nums" aria-hidden>
            {mm}:{ss}
          </span>
          <span aria-hidden> left</span>
        </p>
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <div className="mt-6 rounded-[var(--radius-ui)] border-2 border-dashed border-field p-5">
        <p className="font-semibold">Test payment</p>
        <p className="mt-1 text-muted">This build uses a test gateway. No money moves. Choose what happens.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button onClick={() => pay("success")} disabled={!!busy || left === 0} className="btn-primary py-3">
            {busy === "success" ? "Paying…" : `Pay ${formatINR(total)}`}
          </button>
          <button onClick={() => pay("declined")} disabled={!!busy || left === 0} className="btn-ghost py-3">
            {busy === "declined" ? "Trying the card…" : "Try a declined card"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-[var(--radius-ui)] bg-alert-tint px-4 py-3 text-alert">
          {error}
        </p>
      )}
      <p className="mt-5 text-sm text-muted">Booking reference {bookingRef}</p>
    </div>
  );
}
