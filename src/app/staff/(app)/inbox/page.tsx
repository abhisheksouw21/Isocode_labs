import Link from "next/link";
import { CATEGORY_LABEL, ChannelBadge, ConfidenceMeter, LANE_LABEL, SourceBadge, timeAgo } from "@/components/staff/badges";
import { EnquiryWorkbench } from "@/components/staff/EnquiryWorkbench";
import { SimulateEnquiry } from "@/components/staff/SimulateEnquiry";
import { confidenceThreshold } from "@/lib/ai/classify";
import type { Fact } from "@/lib/ai/draft";
import type { Extracted } from "@/lib/ai/extract";
import { requireStaffPage } from "@/lib/auth";
import { formatDate, formatRange } from "@/lib/dates";
import { getEnquiry, laneCounts, listEnquiries } from "@/lib/enquiries";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Enquiry inbox" };

type Lane = "ROOM" | "WEDDING" | "OFFSITE" | "COMPLAINT" | "UNSORTED";
const LANES: Lane[] = ["ROOM", "WEDDING", "OFFSITE", "COMPLAINT", "UNSORTED"];

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireStaffPage();
  const sp = await searchParams;
  const isGm = session.role === "GM";
  const view = sp.view ?? (isGm ? "all" : "mine");
  const lane = LANES.includes(sp.view as Lane) ? (sp.view as Lane) : undefined;
  const status = sp.status === "REPLIED" ? "REPLIED" : sp.status === "CLOSED" ? "CLOSED" : "NEW";
  const selectedId = sp.id ? Number(sp.id) : undefined;

  const [rows, counts, selected] = await Promise.all([
    listEnquiries({ lane, status, assigneeId: view === "mine" ? session.userId : undefined }),
    laneCounts(),
    selectedId ? getEnquiry(selectedId) : Promise.resolve(null),
  ]);
  const alerts = rows.filter((r) => r.enquiry.gmAlert);
  const threshold = confidenceThreshold();
  const countFor = (l: Lane) => counts.find((c) => c.lane === l)?.open ?? 0;
  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const next = { view, status, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    return `/staff/inbox?${q.toString()}`;
  };

  const tabs = [
    { key: "mine", label: "Mine" },
    { key: "all", label: "All" },
    ...LANES.map((l) => ({ key: l, label: LANE_LABEL[l], n: countFor(l), alert: l === "COMPLAINT" || l === "UNSORTED" })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Enquiries</h1>
          <p className="text-sm text-muted">Every channel in one place. Drafts are never sent automatically.</p>
        </div>
        <SimulateEnquiry />
      </div>

      {isGm && alerts.length > 0 && view !== "COMPLAINT" && (
        <Link href={href({ view: "COMPLAINT", id: String(alerts[0].enquiry.id) })} className="flex items-center gap-3 rounded-xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert">
          <span className="size-2 shrink-0 rounded-full bg-alert" />
          <span>
            {alerts.length} complaint{alerts.length > 1 ? "s" : ""} need{alerts.length === 1 ? "s" : ""} your attention · latest from {alerts[0].enquiry.fromName}
          </span>
        </Link>
      )}

      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={href({ view: t.key, id: undefined })}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${view === t.key ? "border-estate bg-estate text-white" : "border-line bg-white text-muted hover:text-ink"}`}
          >
            {t.label}
            {"n" in t && t.n! > 0 && <span className={`text-xs ${view === t.key ? "text-white/80" : t.alert ? "text-alert" : ""}`}>{t.n}</span>}
          </Link>
        ))}
        <span className="mx-1 w-px shrink-0 bg-line" />
        {(["NEW", "REPLIED", "CLOSED"] as const).map((s) => (
          <Link key={s} href={href({ status: s, id: undefined })} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${status === s ? "bg-sand text-ink" : "text-muted hover:text-ink"}`}>
            {s === "NEW" ? "Open" : s === "REPLIED" ? "Replied" : "Closed"}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <ul className={`card divide-y divide-line overflow-hidden ${selected ? "hidden lg:block" : ""}`}>
          {rows.length === 0 && (
            <li className="p-8 text-center text-sm text-muted">
              {view === "UNSORTED" ? "Nothing unsorted. The model is confident about everything open." : view === "mine" ? "You're all caught up." : "No enquiries here."}
            </li>
          )}
          {rows.map(({ enquiry: e, assignee }) => (
            <li key={e.id}>
              <Link href={href({ id: String(e.id) })} className={`block space-y-1.5 px-4 py-3 hover:bg-paper ${selectedId === e.id ? "bg-paper" : ""}`}>
                <div className="flex items-center gap-2">
                  {e.gmAlert && <span className="size-2 shrink-0 rounded-full bg-alert" aria-label="GM alert" />}
                  <span className="truncate font-medium">{e.fromName}</span>
                  <ChannelBadge channel={e.channel} />
                  <span className="ml-auto shrink-0 text-xs text-muted">{timeAgo(e.receivedAt)}</span>
                </div>
                <p className="line-clamp-2 text-sm text-muted">{e.message}</p>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className={e.lane === "UNSORTED" ? "text-warn" : e.lane === "COMPLAINT" ? "text-alert" : ""}>{LANE_LABEL[e.lane]}</span>
                  <span>·</span>
                  <span className="truncate">{assignee?.name ?? "Unassigned"}</span>
                  <span className="ml-auto">
                    <ConfidenceMeter value={e.confidence} threshold={threshold} />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <section className={selected ? "" : "hidden lg:block"}>
          {!selected ? (
            <div className="card flex h-full min-h-64 items-center justify-center p-8 text-center text-sm text-muted">Pick an enquiry to see the routing and the draft reply.</div>
          ) : (
            <EnquiryDetail data={selected} threshold={threshold} isGm={isGm} canEdit={isGm || selected.enquiry.assigneeId === session.userId} backHref={href({ id: undefined })} />
          )}
        </section>
      </div>
    </div>
  );
}

function EnquiryDetail({
  data,
  threshold,
  isGm,
  canEdit,
  backHref,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getEnquiry>>>;
  threshold: number;
  isGm: boolean;
  canEdit: boolean;
  backHref: string;
}) {
  const e = data.enquiry;
  const x = e.extracted as Extracted & { scores?: Record<string, number> };
  const draftFacts = e.draftFacts as { facts: Fact[]; questions: string[]; asOf: string };
  const chips: [string, string][] = [];
  if (x.checkIn && x.checkOut) chips.push(["Dates", formatRange(x.checkIn, x.checkOut)]);
  else if (x.checkIn) chips.push(["Date", formatDate(x.checkIn)]);
  else if (x.eventMonth) chips.push(["Month", formatDate(`${x.eventMonth}-01`, { month: "long", year: "numeric" })]);
  if (x.nights) chips.push(["Nights", String(x.nights)]);
  if (x.adults) chips.push(["Adults", String(x.adults)]);
  if (x.children) chips.push(["Children", String(x.children)]);
  if (x.guests && !x.adults) chips.push(["Guests", String(x.guests)]);
  if (x.budget) chips.push(["Budget", formatINR(x.budget)]);
  if (x.roomPreference) chips.push(["Wants", x.roomPreference.toLowerCase()]);
  for (const n of x.needs ?? []) chips.push(["Needs", n]);

  return (
    <div className="space-y-4">
      <Link href={backHref} className="text-sm text-muted lg:hidden">
        ← Back to list
      </Link>
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl">{e.fromName}</h2>
              <ChannelBadge channel={e.channel} />
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {e.fromContact} · {e.ref} · {e.receivedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <p className="text-sm text-muted">
            Owner: <span className="text-ink">{data.assignee?.name ?? "Unassigned"}</span>
          </p>
        </div>
        <p className="mt-4 rounded-xl bg-paper p-4 text-sm leading-relaxed whitespace-pre-line">{e.message}</p>
      </div>

      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow">Routing</p>
          <SourceBadge by={e.classifiedBy} />
          {e.lane === "UNSORTED" && <span className="rounded bg-warn/10 px-1.5 py-0.5 text-[11px] font-medium text-warn">Below {Math.round(threshold * 100)}% · needs a human</span>}
          {e.gmAlert && <span className="rounded bg-alert/10 px-1.5 py-0.5 text-[11px] font-medium text-alert">GM alerted</span>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">Best guess</p>
            <p className="mt-0.5 font-medium">{e.category ? CATEGORY_LABEL[e.category] : "—"}</p>
            <div className="mt-1.5">
              <ConfidenceMeter value={e.confidence} threshold={threshold} />
            </div>
            {e.aiNote && <p className="mt-2 text-xs text-muted">{e.aiNote}</p>}
          </div>
          <div>
            <p className="text-xs text-muted">Pulled from the message</p>
            {chips.length ? (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {chips.map(([k, v], i) => (
                  <li key={`${k}-${i}`} className="rounded-full border border-line px-2.5 py-0.5 text-xs">
                    <span className="text-muted">{k}:</span> {v}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">No dates, guests or budget found.</p>
            )}
          </div>
        </div>
      </div>

      <EnquiryWorkbench
        key={`${e.id}-${e.lane}`}
        id={e.id}
        lane={e.lane}
        status={e.status}
        draft={e.draft}
        facts={draftFacts.facts}
        factsAsOf={draftFacts.asOf}
        channel={e.channel}
        gmAlert={e.gmAlert}
        isGm={isGm}
        canEdit={canEdit}
      />

      <div className="card p-5">
        <p className="eyebrow">History</p>
        <ol className="mt-3 space-y-2 text-sm">
          {data.events.map((ev) => (
            <li key={ev.id} className="flex gap-3">
              <span className="w-20 shrink-0 text-xs text-muted">{timeAgo(ev.createdAt)}</span>
              <span>
                <span className="font-medium">{ev.actor}</span> <span className="text-muted">{describeEvent(ev.type, ev.detail as Record<string, unknown>)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function describeEvent(type: string, d: Record<string, unknown>) {
  switch (type) {
    case "CLASSIFIED":
      return `classified as ${String(d.category).toLowerCase()} (${Math.round(Number(d.confidence) * 100)}%) → ${LANE_LABEL[String(d.lane)]}`;
    case "ASSIGNED":
      return `assigned to ${d.to}`;
    case "GM_ALERT":
      return "alerted the GM";
    case "REROUTED":
      return `moved it from ${LANE_LABEL[String(d.from)]} to ${LANE_LABEL[String(d.to)]}, now with ${d.newOwner}`;
    case "DRAFT_EDITED":
      return "edited the draft";
    case "FACTS_REFRESHED":
      return "refreshed prices and availability";
    case "MARKED_REPLIED":
      return `marked it replied on ${String(d.channel).toLowerCase()}`;
    case "ALERT_ACKNOWLEDGED":
      return "acknowledged the alert";
    case "CLOSED":
      return "closed it";
    case "REOPENED":
      return "reopened it";
    default:
      return type.toLowerCase();
  }
}
