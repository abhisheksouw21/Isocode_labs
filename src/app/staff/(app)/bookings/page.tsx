import { recentBookings } from "@/lib/admin";
import { requireStaffPage } from "@/lib/auth";
import { formatRange } from "@/lib/dates";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Bookings" };

const TONE: Record<string, string> = {
  CONFIRMED: "bg-ok-tint text-ok",
  HOLD: "bg-warn-tint text-warn",
  EXPIRED: "bg-leaf text-muted",
  PAYMENT_FAILED: "bg-alert-tint text-alert",
  CANCELLED: "bg-leaf text-muted",
};

export default async function BookingsPage() {
  await requireStaffPage("GM");
  const rows = await recentBookings(40);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">Website bookings</h1>
        <p className="text-sm text-muted">Latest 40, including live holds and failed payments.</p>
      </div>
      <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Website bookings table">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              {["Reference", "Guest", "Room", "Stay", "Total", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ booking: b, room }) => (
              <tr key={b.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{b.ref}</td>
                <td className="px-4 py-3">{b.guestName}</td>
                <td className="px-4 py-3">{room.name}</td>
                <td className="px-4 py-3 text-muted">{formatRange(b.checkIn, b.checkOut)}</td>
                <td className="px-4 py-3 tabular-nums">{formatINR(b.total)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${TONE[b.status]}`}>{b.status.replace("_", " ").toLowerCase()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
