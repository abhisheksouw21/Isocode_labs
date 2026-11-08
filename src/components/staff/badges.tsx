import { BellRing, Bot, CircleHelp, Globe, Mail, MessageCircle, UserCheck } from "lucide-react";

export const LANE_LABEL: Record<string, string> = {
  ROOM: "Rooms",
  WEDDING: "Weddings",
  OFFSITE: "Offsites",
  COMPLAINT: "Complaints",
  UNSORTED: "Unsorted",
};

export const CATEGORY_LABEL: Record<string, string> = { ROOM: "Room booking", WEDDING: "Wedding", OFFSITE: "Corporate offsite", COMPLAINT: "Complaint" };

export const CHANNEL_LABEL: Record<string, string> = { WEB: "Web form", EMAIL: "Email", WHATSAPP: "WhatsApp" };

const CHIP = "inline-flex items-center gap-1 rounded-[var(--radius-ui)] px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap";

export function ChannelBadge({ channel }: { channel: string }) {
  const Icon = channel === "WHATSAPP" ? MessageCircle : channel === "EMAIL" ? Mail : Globe;
  return (
    <span className={`${CHIP} bg-leaf text-ink`}>
      <Icon className="size-3.5" aria-hidden />
      {CHANNEL_LABEL[channel] ?? channel}
    </span>
  );
}

export function SourceBadge({ by }: { by: string }) {
  const map: Record<string, [string, string, typeof Bot]> = {
    LOCAL: ["Sorted by local model", "bg-leaf text-ink", Bot],
    LLM: ["Sorted by cloud model", "bg-leaf text-ink", Bot],
    STAFF: ["Re-routed by staff", "bg-warn-tint text-warn", UserCheck],
  };
  const [label, tone, Icon] = map[by] ?? [by, "bg-leaf text-ink", Bot];
  return (
    <span className={`${CHIP} ${tone}`}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function AlertBadge({ label = "GM alert" }: { label?: string }) {
  return (
    <span className={`${CHIP} bg-alert-tint text-alert`}>
      <BellRing className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function NeedsHumanBadge({ threshold }: { threshold: number }) {
  return (
    <span className={`${CHIP} bg-warn-tint text-warn`}>
      <CircleHelp className="size-3.5" aria-hidden />
      Below {Math.round(threshold * 100)}%, needs a person
    </span>
  );
}

/** Bar plus the number in words, so confidence never depends on colour. */
export function ConfidenceMeter({ value, threshold }: { value: number; threshold: number }) {
  const pct = Math.round(value * 100);
  const low = value < threshold;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-line" aria-hidden>
        <span className={`absolute inset-y-0 left-0 rounded-full ${low ? "bg-warn" : "bg-ok"}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-y-0 w-px bg-ink/50" style={{ left: `${threshold * 100}%` }} />
      </span>
      <span className={`text-xs font-semibold tabular-nums ${low ? "text-warn" : "text-muted"}`}>
        {pct}%{low ? " (low)" : ""}
      </span>
    </span>
  );
}

export function timeAgo(d: Date, now = new Date()) {
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}
