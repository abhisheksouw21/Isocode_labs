"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { FieldError, fieldProps, focusFirstError, issuesToErrors, validateForm, type FieldErrors } from "./forms";

const TYPES = [
  { value: "wedding", label: "A wedding" },
  { value: "offsite", label: "A team offsite" },
  { value: "stay", label: "A stay" },
  { value: "other", label: "Something else" },
];

const SERVER_FIELDS = { name: "name", contact: "contact", dates: "dates", guests: "guests", budget: "budget", message: "message", consent: "consent" };

const CHECKS: Record<string, (el: HTMLInputElement) => string | undefined> = {
  name: (el) => (el.value.trim().length < 2 ? "Enter your name." : undefined),
  contact: (el) => (el.value.trim().length < 5 ? "Enter an email address or a mobile number so we can reply." : undefined),
  guests: (el) => (el.validity.rangeUnderflow || el.validity.rangeOverflow || el.validity.badInput ? "Enter a number of guests between 1 and 2000." : undefined),
  message: (el) => (el.value.trim().length < 5 ? "Tell us a little about your plans: what, when and for how many." : undefined),
  consent: (el) => (el.checked ? undefined : "Tick the box so we can use these details to reply."),
};

export function EnquiryForm() {
  const [type, setType] = useState("wedding");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "error"; message?: string }>({ status: "idle" });
  const done = useRef<HTMLDivElement>(null);

  const clear = (name: string) => errors[name] && setErrors({ ...errors, [name]: undefined });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const found = validateForm(form, CHECKS);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      focusFirstError(form, found);
      return;
    }
    const f = new FormData(form);
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          name: f.get("name"),
          contact: f.get("contact"),
          dates: f.get("dates") || undefined,
          guests: f.get("guests") || undefined,
          budget: f.get("budget") || undefined,
          message: f.get("message"),
          consent: f.get("consent") === "on",
          website: f.get("website") || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        const fieldErrors = issuesToErrors(body.issues, SERVER_FIELDS);
        if (Object.values(fieldErrors).some(Boolean)) {
          setErrors(fieldErrors);
          focusFirstError(form, fieldErrors);
          setState({ status: "idle" });
        } else setState({ status: "error", message: body.error ?? "The enquiry didn't send. Try again." });
        return;
      }
      setState({ status: "sent", message: body.ref });
      requestAnimationFrame(() => done.current?.focus());
    } catch {
      setState({ status: "error", message: "No connection. Check your signal and send it again." });
    }
  }

  if (state.status === "sent")
    return (
      <div ref={done} tabIndex={-1} role="status" className="panel p-6 outline-none">
        <p className="inline-flex items-center gap-2 font-semibold text-ok">
          <CircleCheck className="size-5" aria-hidden /> Enquiry sent
        </p>
        <h2 className="mt-2 text-3xl">We have your enquiry</h2>
        <p className="mt-2">
          Your reference is <span className="font-semibold">{state.message}</span>. The right person on our team will reply to the email or number you gave.
        </p>
      </div>
    );

  const isEvent = type === "wedding" || type === "offsite";
  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset>
        <legend className="label">What are you planning?</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <label
              key={t.value}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-ui)] border px-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-cherry ${
                type === t.value ? "border-canopy bg-canopy text-white" : "border-field bg-white text-ink hover:bg-leaf"
              }`}
            >
              <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">
            Your name
          </label>
          <input {...fieldProps("name", errors)} required minLength={2} maxLength={80} autoComplete="name" className="field" onInput={() => clear("name")} />
          <FieldError id="name-error" message={errors.name} />
        </div>
        <div>
          <label htmlFor="contact" className="label">
            Email or mobile
          </label>
          <input {...fieldProps("contact", errors)} required minLength={5} maxLength={120} autoComplete="email" className="field" onInput={() => clear("contact")} />
          <FieldError id="contact-error" message={errors.contact} />
        </div>
        <div>
          <label htmlFor="dates" className="label">
            {isEvent ? "Dates or month (optional)" : "Dates (optional)"}
          </label>
          <input {...fieldProps("dates", errors)} maxLength={80} placeholder={isEvent ? "February 2027" : "14 to 16 November"} className="field" />
          <FieldError id="dates-error" message={errors.dates} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="guests" className="label">
              Guests (optional)
            </label>
            <input {...fieldProps("guests", errors)} type="number" min={1} max={2000} inputMode="numeric" className="field" onInput={() => clear("guests")} />
            <FieldError id="guests-error" message={errors.guests} />
          </div>
          <div>
            <label htmlFor="budget" className="label">
              Budget (optional)
            </label>
            <input {...fieldProps("budget", errors)} maxLength={40} placeholder="₹" className="field" />
            <FieldError id="budget-error" message={errors.budget} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className="label">
            Your plans
          </label>
          <textarea {...fieldProps("message", errors)} required minLength={5} maxLength={2000} rows={5} className="field" onInput={() => clear("message")} />
          <FieldError id="message-error" message={errors.message} />
        </div>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div>
        <div className="flex items-start gap-3">
          <input {...fieldProps("consent", errors)} type="checkbox" required className="mt-1 size-5 shrink-0 accent-canopy" onChange={() => clear("consent")} />
          <label htmlFor="consent">
            I agree that the estate uses these details to reply to this enquiry. Enquiries that don&apos;t become a booking are deleted after 6 months.{" "}
            <Link href="/privacy" target="_blank" className="link">
              Privacy notice
            </Link>
          </label>
        </div>
        <FieldError id="consent-error" message={errors.consent} />
      </div>

      {state.status === "error" && (
        <p role="alert" className="rounded-[var(--radius-ui)] bg-alert-tint px-4 py-3 text-alert">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={state.status === "sending"} className="btn-primary w-full px-8 py-3 sm:w-auto">
        {state.status === "sending" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
