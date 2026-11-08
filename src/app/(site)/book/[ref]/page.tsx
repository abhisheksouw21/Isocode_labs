import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PayPanel } from "@/components/PayPanel";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { Stepper } from "@/components/Stepper";
import { StatusNote } from "@/components/StatusNote";
import { getBookingByRef, releaseExpiredHolds } from "@/lib/booking";
import { formatRange } from "@/lib/dates";
import type { Quote } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment" };

export default async function PayPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  await releaseExpiredHolds();
  const row = await getBookingByRef(ref);
  if (!row) notFound();
  const { booking, room, plan } = row;
  if (booking.status === "CONFIRMED") redirect(`/booking/${ref}`);

  const live = booking.status === "HOLD";
  const again = `/rooms/${room.slug}?in=${booking.checkIn}&out=${booking.checkOut}&adults=${booking.adults}&children=${booking.children}#rates`;
  return (
    <div className="wrap py-6 sm:py-10">
      <Stepper current={3} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="panel p-5 sm:p-8">
          {live ? (
            <PayPanel bookingRef={ref} total={booking.total} expiresAt={booking.holdExpiresAt.toISOString()} />
          ) : (
            <div>
              <h1 className="text-4xl">{booking.status === "PAYMENT_FAILED" ? "The payment didn't go through" : "Your hold has ended"}</h1>
              <div className="mt-4">
                <StatusNote tone="none">
                  {booking.status === "PAYMENT_FAILED" ? "Nothing was charged, and the room is back on sale." : "We hold a room for 10 minutes, then it goes back on sale."}
                </StatusNote>
              </div>
              <Link href={again} className="btn-primary mt-6">
                Check the room again
              </Link>
            </div>
          )}
        </div>
        <aside className="panel h-fit space-y-3 p-5">
          <p className="text-sm text-muted">Your stay</p>
          <p className="font-display text-xl">{room.name}</p>
          <p>
            {formatRange(booking.checkIn, booking.checkOut)}, {plan.name}
          </p>
          <PriceBreakdown quote={booking.breakdown as Quote} promoCode={booking.promoCode} />
        </aside>
      </div>
    </div>
  );
}
