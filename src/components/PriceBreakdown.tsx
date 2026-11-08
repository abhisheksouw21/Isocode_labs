import { formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { Quote } from "@/lib/pricing";

export function PriceBreakdown({ quote, promoCode, open = false }: { quote: Quote; promoCode?: string | null; open?: boolean }) {
  return (
    <div className="space-y-2">
      <details open={open} className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <span>
            {quote.nights.length} night{quote.nights.length > 1 ? "s" : ""}{" "}
            <span className="text-sm text-canopy underline underline-offset-4 group-open:hidden">show each night</span>
            <span className="hidden text-sm text-canopy underline underline-offset-4 group-open:inline">hide nights</span>
          </span>
          <span className="tabular-nums">{formatINR(quote.subtotal)}</span>
        </summary>
        <table className="mb-2 w-full text-sm text-muted">
          <caption className="sr-only">Price for each night</caption>
          <tbody>
            {quote.nights.map((n) => (
              <tr key={n.date}>
                <th scope="row" className="py-1 text-left font-normal">
                  {formatDate(n.date, { weekday: "short", day: "numeric", month: "short" })}
                </th>
                <td className="py-1 text-right tabular-nums">{formatINR(n.planRate)}</td>
                <td className="w-24 py-1 pl-3 text-right">{n.taxLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {quote.discount > 0 && (
        <div className="flex justify-between text-ok">
          <span>Promo code {promoCode}</span>
          <span className="tabular-nums">−{formatINR(quote.discount)}</span>
        </div>
      )}
      {quote.taxSummary.map((t) => (
        <div key={t.label} className="flex justify-between text-muted">
          <span>
            {t.label}
            {t.nights !== quote.nights.length ? ` on ${t.nights} night${t.nights > 1 ? "s" : ""}` : ""}
          </span>
          <span className="tabular-nums">{formatINR(t.tax)}</span>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <span className="font-semibold">Total</span>
        <span className="font-display text-2xl tabular-nums">{formatINR(quote.total)}</span>
      </div>
    </div>
  );
}
