import { formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { Quote } from "@/lib/pricing";

export function PriceBreakdown({ quote, promoCode, open = false }: { quote: Quote; promoCode?: string | null; open?: boolean }) {
  return (
    <div className="space-y-2 text-sm">
      <details open={open} className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between text-muted">
          <span>
            {quote.nights.length} night{quote.nights.length > 1 ? "s" : ""}
            <span className="ml-1 text-xs underline underline-offset-4 group-open:hidden">see nightly rates</span>
          </span>
          <span className="text-ink">{formatINR(quote.subtotal)}</span>
        </summary>
        <ul className="mt-2 space-y-1 border-l border-line pl-3 text-xs text-muted">
          {quote.nights.map((n) => (
            <li key={n.date} className="flex justify-between gap-4">
              <span>{formatDate(n.date, { weekday: "short", day: "numeric", month: "short" })}</span>
              <span>
                {formatINR(n.planRate)} · {n.taxLabel}
              </span>
            </li>
          ))}
        </ul>
      </details>
      {quote.discount > 0 && (
        <div className="flex justify-between text-ok">
          <span>Promo {promoCode}</span>
          <span>−{formatINR(quote.discount)}</span>
        </div>
      )}
      {quote.taxSummary.map((t) => (
        <div key={t.label} className="flex justify-between text-muted">
          <span>
            {t.label} {t.nights !== quote.nights.length ? `(${t.nights} night${t.nights > 1 ? "s" : ""})` : ""}
          </span>
          <span>{formatINR(t.tax)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-line pt-2 text-base font-medium">
        <span>Total</span>
        <span>{formatINR(quote.total)}</span>
      </div>
    </div>
  );
}
