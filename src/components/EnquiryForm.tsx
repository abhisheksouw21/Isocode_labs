"use client";

import Link from "next/link";
import { useState } from "react";

const TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "offsite", label: "Corporate offsite" },
  { value: "stay", label: "A stay" },
  { value: "other", label: "Something else" },
];

export function EnquiryForm() {
  const [type, setType] = useState("wedding");
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "error"; message?: string }>({ status: "idle" });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
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
      if (!res.ok) throw new Error(body.error);
      setState({ status: "sent", message: body.ref });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Couldn't send. Please try again." });
    }
  }

  if (state.status === "sent")
    return (
      <div className="card p-6" role="status">
        <h2 className="text-2xl">Thank you, we have it</h2>
        <p className="mt-2 text-sm text-muted">Your reference is {state.message}. Someone from the estate will reply to you directly.</p>
      </div>
    );

  const isEvent = type === "wedding" || type === "offsite";
  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset>
        <legend className="label">What are you planning?</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <label key={t.value} className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${type === t.value ? "border-estate bg-estate text-white" : "border-line bg-white text-ink"}`}>
              <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">
            Your name
          </label>
          <input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor="contact" className="label">
            Email or mobile
          </label>
          <input id="contact" name="contact" required minLength={5} maxLength={120} className="field" />
        </div>
        <div>
          <label htmlFor="dates" className="label">
            Dates {isEvent ? "or month" : ""}
          </label>
          <input id="dates" name="dates" maxLength={80} placeholder={isEvent ? "e.g. Feb 2027" : "e.g. 14–16 Nov"} className="field" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="guests" className="label">
              Guests
            </label>
            <input id="guests" name="guests" type="number" min={1} max={2000} className="field" />
          </div>
          <div>
            <label htmlFor="budget" className="label">
              Budget
            </label>
            <input id="budget" name="budget" maxLength={40} placeholder="₹" className="field" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className="label">
            Tell us more
          </label>
          <textarea id="message" name="message" required minLength={5} maxLength={2000} rows={5} className="field" />
        </div>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-estate" />
        <span className="text-muted">
          I agree that the estate may use these details to reply to my enquiry. Enquiries are deleted after 6 months unless they become a booking.{" "}
          <Link href="/privacy" target="_blank" className="text-estate underline underline-offset-4">
            Privacy notice
          </Link>
        </span>
      </label>

      {state.status === "error" && (
        <p className="rounded-xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert" role="alert">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={state.status === "sending"} className="btn-primary px-8 py-3">
        {state.status === "sending" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
