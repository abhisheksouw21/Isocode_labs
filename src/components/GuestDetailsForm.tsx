"use client";

import { ChevronDown, IdCard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StaySearch } from "@/lib/booking";
import { formatINR } from "@/lib/money";
import type { Quote } from "@/lib/pricing";
import { FieldError, fieldProps, focusFirstError, issuesToErrors, validateForm, type FieldErrors } from "./forms";
import { PriceBreakdown } from "./PriceBreakdown";

export type StaySummary = { roomName: string; image: string; dates: string; guests: string; planName: string; changeHref: string };

type Props = { stay: StaySearch; roomSlug: string; planCode: string; initialQuote: Quote; summary: StaySummary };

const PHONE_PATTERN = "\\+?[0-9][0-9\\s\\-]{7,16}";
const SERVER_FIELDS = { guestName: "name", guestEmail: "email", guestPhone: "phone", requests: "requests", consent: "consent", promoCode: "promo" };

const CHECKS: Record<string, (el: HTMLInputElement) => string | undefined> = {
  name: (el) => (el.value.trim().length < 2 ? "Enter the lead guest's full name." : undefined),
  email: (el) => (el.validity.valueMissing ? "Enter an email address for the confirmation." : el.validity.typeMismatch ? "Enter an email address like name@example.com." : undefined),
  phone: (el) =>
    el.validity.valueMissing ? "Enter a mobile number so we can reach you about the stay." : el.validity.patternMismatch ? "Enter a mobile number of 8 to 17 digits, for example +91 98450 12345." : undefined,
  consent: (el) => (el.checked ? undefined : "Tick the box to agree to how we use your details. We can't hold the room without it."),
};

export function GuestDetailsForm({ stay, roomSlug, planCode, initialQuote, summary }: Props) {
  const router = useRouter();
  const [quote, setQuote] = useState(initialQuote);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

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
      setPromoMsg({ ok: true, text: `${body.promo.code} applied: ${body.promo.percentOff}% off. New total ${formatINR(body.quote.total)}.` });
    } catch (err) {
      setAppliedPromo(null);
      setQuote(initialQuote);
      setPromoMsg({ ok: false, text: err instanceof Error ? err.message : "That code couldn't be checked. Try again." });
    } finally {
      setCheckingPromo(false);
    }
  }

  function clearError(name: string) {
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget;
    const found = validateForm(form, CHECKS);
    setErrors(found);
    setFormError(null);
    if (Object.values(found).some(Boolean)) {
      focusFirstError(form, found);
      return;
    }
    const data = new FormData(form);
    setSubmitting(true);
    try {
      const res = await fetch("/api/holds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...base,
          promoCode: appliedPromo ?? undefined,
          guestName: data.get("name"),
          guestEmail: data.get("email"),
          guestPhone: data.get("phone"),
          requests: data.get("requests") || undefined,
          consent: data.get("consent") === "on",
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        const fieldErrors = issuesToErrors(body.issues, SERVER_FIELDS);
        if (Object.values(fieldErrors).some(Boolean)) {
          setErrors(fieldErrors);
          focusFirstError(form, fieldErrors);
        } else setFormError(body.error ?? "The room couldn't be held. Try again.");
        setSubmitting(false);
        return;
      }
      router.push(`/book/${body.ref}`);
    } catch {
      setFormError("No connection to the booking system. Check your signal and try again.");
      setSubmitting(false);
    }
  }

  const summaryBody = (
    <div className="space-y-1">
      <p className="font-display text-xl">{summary.roomName}</p>
      <p>{summary.dates}</p>
      <p className="text-muted">
        {summary.guests}, {summary.planName}
      </p>
      <Link href={summary.changeHref} className="link inline-flex min-h-11 items-center">
        Change room or dates
      </Link>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <details className="panel group lg:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm text-muted">Your stay</span>
            <span className="font-semibold">{summary.roomName}</span>
          </span>
          <span className="flex items-center gap-2 font-display text-lg tabular-nums">
            {formatINR(quote.total)}
            <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden />
          </span>
        </summary>
        <div className="space-y-4 border-t border-line px-4 py-4">
          {summaryBody}
          <PriceBreakdown quote={quote} promoCode={appliedPromo} />
        </div>
      </details>

      <form onSubmit={submit} noValidate className="space-y-8 lg:row-start-1">
        <div>
          <h1 className="text-4xl sm:text-5xl">Your details</h1>
          <p className="mt-2 text-muted">Four details, and the room is held for you while you pay.</p>
        </div>

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="sr-only">Contact details</legend>
          <div className="sm:col-span-2">
            <label htmlFor="name" className="label">
              Full name of the lead guest
            </label>
            <input {...fieldProps("name", errors)} required minLength={2} maxLength={80} autoComplete="name" className="field" onInput={() => clearError("name")} />
            <FieldError id="name-error" message={errors.name} />
          </div>
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input {...fieldProps("email", errors, "email-hint")} type="email" required maxLength={120} autoComplete="email" className="field" onInput={() => clearError("email")} />
            <p id="email-hint" className="mt-1.5 text-sm text-muted">
              The confirmation goes here.
            </p>
            <FieldError id="email-error" message={errors.email} />
          </div>
          <div>
            <label htmlFor="phone" className="label">
              Mobile
            </label>
            <input
              {...fieldProps("phone", errors, "phone-hint")}
              type="tel"
              required
              pattern={PHONE_PATTERN}
              title="A mobile number of 8 to 17 digits. It can start with + and include spaces or dashes."
              autoComplete="tel"
              inputMode="tel"
              placeholder="+91 98450 12345"
              className="field"
              onInput={() => clearError("phone")}
            />
            <p id="phone-hint" className="mt-1.5 text-sm text-muted">
              With the country code if it isn&apos;t Indian.
            </p>
            <FieldError id="phone-error" message={errors.phone} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="requests" className="label">
              Requests (optional)
            </label>
            <textarea {...fieldProps("requests", errors)} maxLength={500} rows={3} placeholder="Arrival time, dietary needs, a cot for a little one" className="field" />
            <FieldError id="requests-error" message={errors.requests} />
          </div>
        </fieldset>

        <div className="flex gap-3 rounded-[var(--radius-ui)] bg-leaf p-4">
          <IdCard className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">No ID or passport online.</span> Each adult shows a photo ID at check-in. Guests from abroad fill in Form C with their passport at the front desk.
          </p>
        </div>

        <div>
          <div className="flex items-start gap-3">
            <input {...fieldProps("consent", errors)} type="checkbox" required className="mt-1 size-5 shrink-0 accent-canopy" onChange={() => clearError("consent")} />
            <label htmlFor="consent">
              I agree that the estate uses these details to hold and manage this booking and to contact me about it, as set out in the{" "}
              <Link href="/privacy" target="_blank" className="link">
                privacy notice
              </Link>
              . No marketing without a separate yes.
            </label>
          </div>
          <FieldError id="consent-error" message={errors.consent} />
        </div>

        <div className="panel space-y-4 p-5">
          <label htmlFor="promo" className="label mb-0">
            Promo code (optional)
          </label>
          <div className="flex gap-2">
            <input
              id="promo"
              value={promo}
              onChange={(e) => setPromo(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyPromo();
                }
              }}
              maxLength={30}
              autoComplete="off"
              aria-describedby="promo-status"
              className="field uppercase"
            />
            <button type="button" onClick={applyPromo} disabled={checkingPromo || !promo.trim()} className="btn-ghost shrink-0">
              {checkingPromo ? "Checking…" : "Apply code"}
            </button>
          </div>
          <p id="promo-status" aria-live="polite" className={`text-sm font-semibold ${promoMsg?.ok ? "text-ok" : "text-alert"}`}>
            {promoMsg?.text}
          </p>
          <div className="hidden lg:block">
            <PriceBreakdown quote={quote} promoCode={appliedPromo} />
          </div>
        </div>

        {formError && (
          <p role="alert" className="rounded-[var(--radius-ui)] bg-alert-tint px-4 py-3 text-alert">
            {formError}
          </p>
        )}

        <div className="sticky bottom-0 z-20 -mx-5 border-t border-line bg-surface/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:mx-0 sm:rounded-[var(--radius-ui)] sm:border lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="flex items-center gap-4">
            <p className="lg:hidden">
              <span className="block text-sm text-muted">Total with GST</span>
              <span className="font-display text-xl tabular-nums">{formatINR(quote.total)}</span>
            </p>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3 text-base lg:w-full">
              {submitting ? "Holding your room…" : "Continue to payment"}
            </button>
          </div>
          <p className="mt-2 hidden text-center text-sm text-muted lg:block">We hold the room for 10 minutes while you pay.</p>
        </div>
      </form>

      <aside className="hidden lg:block">
        <div className="panel sticky top-20 overflow-hidden">
          <div className="relative aspect-[3/2] bg-leaf">
            <Image src={summary.image} alt="" fill sizes="380px" className="object-cover" />
          </div>
          <div className="p-5">
            <p className="text-sm text-muted">Your stay</p>
            {summaryBody}
            <p className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl tabular-nums">{formatINR(quote.total)}</span>
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
