export const LANE_LABEL: Record<string, string> = {
  ROOM: "Rooms",
  WEDDING: "Weddings",
  OFFSITE: "Offsites",
  COMPLAINT: "Complaints",
  UNSORTED: "Unsorted",
};

export const CATEGORY_LABEL: Record<string, string> = { ROOM: "Room booking", WEDDING: "Wedding", OFFSITE: "Corporate offsite", COMPLAINT: "Complaint" };

export const CHANNEL_LABEL: Record<string, string> = { WEB: "Web form", EMAIL: "Email", WHATSAPP: "WhatsApp" };

export function ChannelBadge({ channel }: { channel: string }) {
  const tone = channel === "WHATSAPP" ? "bg-[#e3efe6] text-[#2f6b45]" : channel === "EMAIL" ? "bg-[#e7ebf2] text-[#3d4f73]" : "bg-sand text-muted";
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>{CHANNEL_LABEL[channel] ?? channel}</span>;
}

export function SourceBadge({ by }: { by: string }) {
  const map: Record<string, [string, string]> = {
    LOCAL: ["Local model", "bg-sand text-muted"],
    LLM: ["Cloud model", "bg-[#e7ebf2] text-[#3d4f73]"],
    STAFF: ["Re-routed by staff", "bg-[#f3e9dc] text-clay"],
  };
  const [label, tone] = map[by] ?? [by, "bg-sand text-muted"];
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>;
}

export function ConfidenceMeter({ value, threshold }: { value: number; threshold: number }) {
  const pct = Math.round(value * 100);
  const low = value < threshold;
  return (
    <div className="flex items-center gap-2" title={`Routing threshold ${Math.round(threshold * 100)}%`}>
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${low ? "bg-warn" : "bg-ok"}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-px bg-ink/40" style={{ left: `${threshold * 100}%` }} />
      </div>
      <span className={`text-xs tabular-nums ${low ? "text-warn" : "text-muted"}`}>{pct}%</span>
    </div>
  );
}

export function timeAgo(d: Date, now = new Date()) {
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
