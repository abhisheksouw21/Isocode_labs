"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PRESETS = [
  { channel: "WHATSAPP", fromName: "Rohan Mehta", fromContact: "+91 98450 00011", message: "Is a villa free 14-16 Nov for 2 adults and a child?" },
  { channel: "EMAIL", fromName: "Kavya Reddy", fromContact: "kavya.reddy@example.com", message: "Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights" },
  { channel: "EMAIL", fromName: "Sneha Pillai", fromContact: "sneha@example.com", message: "Team of 45 wants a January offsite with a conference hall" },
  { channel: "WHATSAPP", fromName: "Arun", fromContact: "+91 90000 12345", message: "Room was dirty and the geyser was broken. Want to speak to the manager." },
  { channel: "WHATSAPP", fromName: "Meghana", fromContact: "+91 90000 67890", message: "hi, any offers?" },
] as const;

export function SimulateEnquiry() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ channel: string; fromName: string; fromContact: string; message: string }>({ ...PRESETS[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/enquiries/simulate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setOpen(false);
      router.push(`/staff/inbox?view=all&id=${body.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add it");
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost btn-sm">
        Simulate incoming message
      </button>
    );

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="sim-title">
      <form onSubmit={submit} className="card w-full max-w-lg space-y-4 p-5 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="sim-title" className="text-xl">
              Simulate an incoming message
            </h2>
            <p className="text-xs text-muted">Stands in for the forwarded-email and WhatsApp webhooks in this build.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p, i) => (
            <button key={i} type="button" onClick={() => setForm({ ...p })} className="rounded-full border border-line px-2.5 py-1 text-xs hover:bg-sand">
              {p.message.slice(0, 22)}…
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="field" aria-label="Channel">
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
          </select>
          <input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} required minLength={2} className="field" aria-label="From name" />
          <input value={form.fromContact} onChange={(e) => setForm({ ...form, fromContact: e.target.value })} required minLength={5} className="field" aria-label="Contact" />
        </div>
        <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={4} className="field" aria-label="Message" />
        {error && <p className="text-sm text-alert">{error}</p>}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? "Routing…" : "Send to inbox"}
        </button>
      </form>
    </div>
  );
}
