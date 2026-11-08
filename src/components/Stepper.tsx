const STEPS = ["Your stay", "Your details", "Payment"];

export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm" aria-label="Booking steps">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3" aria-current={state === "current" ? "step" : undefined}>
            <span
              className={`flex size-6 items-center justify-center rounded-full text-[11px] font-medium ${
                state === "todo" ? "border border-line text-muted" : "bg-estate text-white"
              }`}
            >
              {state === "done" ? "✓" : n}
            </span>
            <span className={state === "todo" ? "text-muted" : "text-ink"}>{label}</span>
            {n < STEPS.length && <span className="h-px w-4 bg-line sm:w-10" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
