"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Fact } from "@/lib/ai/draft";
import { CHANNEL_LABEL, LANE_LABEL } from "./badges";

type Props = {
  id: number;
  lane: string;
  status: string;
  draft: string;
  facts: Fact[];
  factsAsOf: string;
  channel: string;
  gmAlert: boolean;
  isGm: boolean;
  canEdit: boolean;
};

const ROUTES = ["ROOM", "WEDDING", "OFFSITE", "COMPLAINT"] as const;

export function EnquiryWorkbench(p: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(p.draft);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error" | "warn"; text: string } | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [, startTransition] = useTransition();
  const dirty = draft !== p.draft;

  async function act(action: string, extra: Record<string, unknown> = {}, okText?: string) {
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/staff/enquiries/${p.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await res.json();
      if (res.status === 409 && body.code === "UNVERIFIED_PRICE") {
        setNeedsConfirm(true);
        setMessage({ tone: "warn", text: `${body.error}. Check them, then confirm.` });
        return false;
      }
      if (!res.ok) throw new Error(body.error);
      if (action === "reroute" || action === "refreshFacts") setDraft(body.draft);
      if (okText) setMessage({ tone: "ok", text: okText });
      startTransition(() => router.refresh());
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function copyAndMark(confirm = false) {
    if (dirty && !(await act("saveDraft", { draft }))) return;
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      /* clipboard can be blocked; the text is still on screen */
    }
    const ok = await act("markReplied", { confirmUnverified: confirm }, `Copied. Paste it into ${CHANNEL_LABEL[p.channel]} and send it from there.`);
    if (ok) setNeedsConfirm(false);
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="eyebrow mr-2">Re-route</p>
        {ROUTES.map((r) => (
          <button
            key={r}
            onClick={() => act("reroute", { lane: r }, `Moved to ${LANE_LABEL[r]}. Draft rebuilt.`)}
            disabled={!!busy || p.lane === r}
            className={`rounded-full border px-3 py-1 text-xs ${p.lane === r ? "border-estate bg-estate text-white" : "border-line bg-white hover:bg-sand"} disabled:cursor-default`}
            aria-pressed={p.lane === r}
          >
            {busy === "reroute" ? "…" : LANE_LABEL[r]}
          </button>
        ))}
        {p.gmAlert && p.isGm && (
          <button onClick={() => act("ackAlert", {}, "Alert acknowledged")} disabled={!!busy} className="ml-auto btn-ghost btn-sm text-alert">
            Acknowledge alert
          </button>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="draft" className="eyebrow">
            Draft reply
          </label>
          <span className="text-xs text-muted">Not sent until you send it on {CHANNEL_LABEL[p.channel]}</span>
        </div>
        <textarea id="draft" value={draft} onChange={(e) => setDraft(e.target.value)} readOnly={!p.canEdit} rows={12} className="field font-sans leading-relaxed" />
        {!p.canEdit && <p className="mt-1 text-xs text-muted">Only the owner or the GM can edit and reply.</p>}
      </div>

      {p.facts.length > 0 && (
        <div className="rounded-xl bg-paper p-3 text-xs">
          <p className="font-medium text-ink">Facts in this draft come from the system, not the model</p>
          <ul className="mt-1.5 space-y-1 text-muted">
            {p.facts.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 rounded bg-white px-1.5 text-[10px] uppercase">{f.source}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-muted">Checked {new Date(p.factsAsOf).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", timeStyle: "short", dateStyle: "medium" })}</p>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${message.tone === "ok" ? "bg-ok/10 text-ok" : message.tone === "warn" ? "bg-warn/10 text-warn" : "bg-alert/10 text-alert"}`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {p.canEdit && p.status === "NEW" && (
          <>
            {needsConfirm ? (
              <button onClick={() => copyAndMark(true)} disabled={!!busy} className="btn-primary bg-warn hover:bg-warn/90">
                Amounts checked, mark replied
              </button>
            ) : (
              <button onClick={() => copyAndMark(false)} disabled={!!busy} className="btn-primary">
                {busy === "markReplied" ? "Saving…" : "Copy reply & mark replied"}
              </button>
            )}
            <button onClick={() => act("saveDraft", { draft }, "Draft saved")} disabled={!!busy || !dirty} className="btn-ghost">
              Save draft
            </button>
          </>
        )}
        <button onClick={() => act("refreshFacts", {}, "Prices and availability rechecked")} disabled={!!busy} className="btn-ghost" title="Rebuilds the draft from live rates and availability">
          {busy === "refreshFacts" ? "Checking…" : "Recheck prices"}
        </button>
        {p.status === "NEW" ? (
          <button onClick={() => act("close", {}, "Closed")} disabled={!!busy} className="btn-ghost ml-auto">
            Close
          </button>
        ) : (
          <button onClick={() => act("reopen", {}, "Reopened")} disabled={!!busy} className="btn-ghost ml-auto">
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}
