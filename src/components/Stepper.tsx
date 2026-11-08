import { Check } from "lucide-react";

const STEPS = ["Your stay", "Your details", "Payment"];

export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Booking progress">
      <p className="text-sm text-muted sm:hidden">
        Step {current} of {STEPS.length}: <span className="font-semibold text-ink">{STEPS[current - 1]}</span>
      </p>
      <ol className="hidden items-center gap-3 text-sm sm:flex">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const now = n === current;
          return (
            <li key={label} className="flex items-center gap-3" aria-current={now ? "step" : undefined}>
              <span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${done || now ? "bg-canopy text-white" : "border border-field text-muted"}`} aria-hidden>
                {done ? <Check className="size-4" /> : n}
              </span>
              <span className={now ? "font-semibold text-ink" : "text-muted"}>
                {label}
                {done && <span className="sr-only"> (done)</span>}
              </span>
              {n < STEPS.length && <span className="h-px w-10 bg-line" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
