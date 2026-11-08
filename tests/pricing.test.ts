import { describe, expect, it } from "vitest";
import { findSlab, quoteStay, type Slab } from "@/lib/pricing";

const slabs: Slab[] = [
  { label: "Exempt", minTariff: 0, maxTariff: 1000, ratePct: 0 },
  { label: "GST 5%", minTariff: 1001, maxTariff: 7500, ratePct: 5 },
  { label: "GST 18%", minTariff: 7501, maxTariff: null, ratePct: 18 },
];

describe("GST slabs", () => {
  it("uses the lower slab up to ₹7,500 and the higher one above", () => {
    expect(findSlab(7500, slabs).ratePct).toBe(5);
    expect(findSlab(7501, slabs).ratePct).toBe(18);
    expect(findSlab(900, slabs).ratePct).toBe(0);
  });

  it("chooses the slab per night, so a weekend uplift can change the rate", () => {
    const q = quoteStay(
      [
        { date: "2026-12-04", rate: 7000 },
        { date: "2026-12-05", rate: 8050 },
      ],
      { adjustmentPct: 0, percentOff: 0, slabs },
    );
    expect(q.nights.map((n) => n.taxPct)).toEqual([5, 18]);
    expect(q.tax).toBe(350 + 1449);
    expect(q.total).toBe(15050 + 1799);
    expect(q.taxSummary).toHaveLength(2);
  });

  it("applies the slab after the promo discount", () => {
    const q = quoteStay([{ date: "2026-12-01", rate: 8000 }], { adjustmentPct: 0, percentOff: 10, slabs });
    expect(q.nights[0].tariff).toBe(7200);
    expect(q.nights[0].taxPct).toBe(5);
    expect(q.total).toBe(7200 + 360);
  });

  it("applies rate-plan adjustments before tax", () => {
    const q = quoteStay([{ date: "2026-12-01", rate: 10000 }], { adjustmentPct: -10, percentOff: 0, slabs });
    expect(q.subtotal).toBe(9000);
    expect(q.tax).toBe(1620);
  });
});
