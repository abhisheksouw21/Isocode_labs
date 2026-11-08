import { CircleAlert, CircleCheck, CircleSlash, Flame } from "lucide-react";

type Tone = "ok" | "low" | "none" | "info";
const ICON = { ok: CircleCheck, low: Flame, none: CircleSlash, info: CircleAlert };
const TONE = { ok: "text-ok", low: "text-cherry", none: "text-muted", info: "text-muted" };

/** Availability and status always carry an icon and words, never colour alone. */
export function StatusNote({ tone, children, className = "" }: { tone: Tone; children: React.ReactNode; className?: string }) {
  const Icon = ICON[tone];
  return (
    <p className={`inline-flex items-center gap-1.5 text-sm font-semibold ${TONE[tone]} ${className}`}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
