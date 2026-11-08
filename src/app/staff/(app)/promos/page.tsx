import { PromoManager } from "@/components/staff/PromoManager";
import { listPromos, listTaxSlabs } from "@/lib/admin";
import { requireStaffPage } from "@/lib/auth";
import { formatDate, todayAtResort } from "@/lib/dates";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Promos & GST" };

export default async function PromosPage() {
  await requireStaffPage("GM");
  const [promos, slabs] = await Promise.all([listPromos(), listTaxSlabs()]);
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl">Promo codes</h1>
          <p className="text-sm text-muted">Discounts apply before GST, so a promo can move a night into a lower GST slab.</p>
        </div>
        <PromoManager promos={JSON.parse(JSON.stringify(promos))} today={todayAtResort()} />
      </div>
      <div className="card h-fit p-5">
        <h2 className="text-lg">GST slabs</h2>
        <p className="mt-1 text-xs text-muted">
          Read from the <code>tax_slabs</code> table, chosen per night by the room tariff. A rate change is a new row with a new effective date; no code change.
        </p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 font-normal">Tariff per night</th>
              <th className="pb-2 font-normal">GST</th>
              <th className="pb-2 font-normal">From</th>
            </tr>
          </thead>
          <tbody>
            {slabs.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="py-2">
                  {formatINR(s.minTariff)} {s.maxTariff ? `– ${formatINR(s.maxTariff)}` : "and above"}
                </td>
                <td className="py-2">{Number(s.ratePct)}%</td>
                <td className="py-2 text-muted">{formatDate(s.effectiveFrom)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-warn">Assumption: confirm these slabs with the resort&apos;s CA before going live.</p>
      </div>
    </div>
  );
}
