export type Slab = { label: string; minTariff: number; maxTariff: number | null; ratePct: number };

export type NightRate = { date: string; rate: number };

export type NightLine = {
  date: string;
  baseRate: number;
  planRate: number;
  discount: number;
  tariff: number;
  taxPct: number;
  taxLabel: string;
  tax: number;
};

export type Quote = {
  nights: NightLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  taxSummary: { label: string; ratePct: number; nights: number; tax: number }[];
};

export function findSlab(tariff: number, slabs: Slab[]): Slab {
  const slab = slabs.find((s) => tariff >= s.minTariff && (s.maxTariff === null || tariff <= s.maxTariff));
  if (!slab) throw new Error(`No GST slab configured for a tariff of ${tariff}`);
  return slab;
}

function applyPlan(rate: number, adjustmentPct: number): number {
  return Math.round((rate * (100 + adjustmentPct)) / 100);
}

/**
 * Prices a stay night by night. GST is chosen per night from the slab that the
 * night's tariff (after any promo discount) falls into, because the slab
 * follows the value charged for the unit per day.
 */
export function quoteStay(nightRates: NightRate[], opts: { adjustmentPct: number; percentOff: number; slabs: Slab[] }): Quote {
  const nights = nightRates.map(({ date, rate }) => {
    const planRate = applyPlan(rate, opts.adjustmentPct);
    const discount = Math.round((planRate * opts.percentOff) / 100);
    const tariff = planRate - discount;
    const slab = findSlab(tariff, opts.slabs);
    const tax = Math.round((tariff * slab.ratePct) / 100);
    return { date, baseRate: rate, planRate, discount, tariff, taxPct: slab.ratePct, taxLabel: slab.label, tax };
  });

  const subtotal = sum(nights.map((n) => n.planRate));
  const discount = sum(nights.map((n) => n.discount));
  const tax = sum(nights.map((n) => n.tax));

  const bySlab = new Map<string, { label: string; ratePct: number; nights: number; tax: number }>();
  for (const n of nights) {
    const key = `${n.taxLabel}|${n.taxPct}`;
    const entry = bySlab.get(key) ?? { label: n.taxLabel, ratePct: n.taxPct, nights: 0, tax: 0 };
    entry.nights += 1;
    entry.tax += n.tax;
    bySlab.set(key, entry);
  }

  return { nights, subtotal, discount, tax, total: subtotal - discount + tax, taxSummary: [...bySlab.values()] };
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
