import { StaffNav } from "@/components/staff/StaffNav";
import { requireStaffPage } from "@/lib/auth";
import { laneCounts } from "@/lib/enquiries";
import { RESORT } from "@/lib/resort";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaffPage();
  const counts = await laneCounts();
  const alerts = session.role === "GM" ? counts.reduce((a, c) => a + c.alerts, 0) : 0;
  const open = counts.reduce((a, c) => a + c.open, 0);
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <span className="font-display hidden text-base sm:inline">{RESORT.name}</span>
          <StaffNav isGm={session.role === "GM"} open={open} alerts={alerts} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted md:inline">
              {session.name} · {session.role === "GM" ? "General Manager" : session.team === "SALES" ? "Events & Sales" : "Reservations"}
            </span>
            <form action="/api/auth/logout" method="post">
              <button className="btn-ghost btn-sm">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
    </div>
  );
}
