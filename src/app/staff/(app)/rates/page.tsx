import { RatesGrid } from "@/components/staff/RatesGrid";
import { inventoryGrid } from "@/lib/admin";
import { requireStaffPage } from "@/lib/auth";
import { isIsoDate, todayAtResort } from "@/lib/dates";

export const metadata = { title: "Rates & allotment" };

export default async function RatesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireStaffPage("GM");
  const { from } = await searchParams;
  const start = from && isIsoDate(from) ? from : todayAtResort();
  const grid = await inventoryGrid(start, 14);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">Rates & allotment</h1>
        <p className="max-w-3xl text-sm text-muted">
          The website only sells its allotment, so agency stock is never touched. Each cell shows the nightly rate and website rooms taken out of the allotment. Allotment
          can&apos;t go below what&apos;s already sold or on hold.
        </p>
      </div>
      <RatesGrid data={JSON.parse(JSON.stringify(grid))} today={todayAtResort()} />
    </div>
  );
}
