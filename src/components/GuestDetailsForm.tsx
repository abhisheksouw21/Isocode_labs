"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StaySearch } from "@/lib/booking";
import type { Quote } from "@/lib/pricing";
import { PriceBreakdown } from "./PriceBreakdown";

type Props = { stay: StaySearch; roomSlug: string; planCode: string; initialQuote: Quote };

export function GuestDetailsForm({ stay, roomSlug, planCode, initialQuote }: Props) {
  const router = useRouter();
  const [quote, setQuote] = useState(initialQuote);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = { ...stay, roomSlug, planCode };

  async function applyPromo() {
    if (!promo.trim()) return;
    setCheckingPromo(true);
    setPromoMsg(null);
    try {
      const res = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...base, promoCode: promo }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setQuote(body.quote);
      setAppliedPromo(body.promo.code);
      setPromoMsg({ ok: true, text: `${body.promo.percentOff}% off applied` });
    } catch (err) {
      setAppliedPromo(null);
      setQuote(initialQuote);
      setPromoMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't check that code" });
    } finally {
      setCheckingPromo(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/holds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...base,
          promoCode: appliedPromo ?? undefined,
          guestName: form.get("name"),
          guestEmail: form.get("email"),
          guestPhone: form.get("phone"),
          requests: form.get("requests") || undefined,
          consent: form.get("consent") === "on",
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      router.push(`/book/${body.ref}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate={false}>
      <div>
        <h1 className="text-3xl">Your details</h1>
        <p className="mt-1 text-sm text-muted">We only ask for what we need to hold your room and reach you.</p>
      </div>

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="label">
            Full name
          </label>
          <input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" required maxLength={120} autoComplete="email" className="field" />
        </div>
        <div>
          <label htmlFor="phone" className="label">
            Mobile
          </label>
          <input id="phone" name="phone" type="tel" required pattern="\+?[0-9][0-9\s\-]{7,16}" autoComplete="tel" placeholder="+91 98450 12345" className="field" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="requests" className="label">
            Requests <span className="normal-case">(optional)</span>
          </label>
          <textarea id="requests" name="requests" maxLength={500} rows={3} placeholder="Arrival time, dietary needs, a cot for the little one…" className="field" />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-sand/50 p-4 text-sm leading-relaxed text-muted">
        <p className="font-medium text-ink">No ID needed online</p>
        <p className="mt-1">
          We don&apos;t collect ID or passport details on the website. Guests show ID at check-in, and foreign nationals complete Form C at the front desk, as the law requires.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-estate" />
        <span className="text-muted">
          I agree that the estate may use these details to manage my booking and contact me about it, as described in the{" "}
          <Link href="/privacy" target="_blank" className="text-estate underline underline-offset-4">
            privacy notice
          </Link>
          . No marketing without separate consent.
        </span>
      </label>

      <div className="card space-y-4 p-5">
        <div className="flex gap-2">
          <label htmlFor="promo" className="sr-only">
            Promo code
          </label>
          <input
            id="promo"
            value={promo}
            onChange={(e) => setPromo(e.target.value.toUpperCase())}
            placeholder="Promo code"
            maxLength={30}
            className="field uppercase"
          />
          <button type="button" onClick={applyPromo} disabled={checkingPromo || !promo.trim()} className="btn-ghost shrink-0">
            {checkingPromo ? "Checking…" : "Apply"}
          </button>
        </div>
        {promoMsg && <p className={`text-xs ${promoMsg.ok ? "text-ok" : "text-alert"}`}>{promoMsg.text}</p>}
        <PriceBreakdown quote={quote} promoCode={appliedPromo} />
      </div>

      {error && (
        <p className="rounded-xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5 text-base">
        {submitting ? "Holding your room…" : "Continue to payment"}
      </button>
      <p className="text-center text-xs text-muted">Your room is held for 10 minutes while you pay.</p>
    </form>
  );
}
