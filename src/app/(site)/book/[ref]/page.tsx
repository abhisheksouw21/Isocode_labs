import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PayPanel } from "@/components/PayPanel";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { Stepper } from "@/components/Stepper";
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
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Stepper current={3} />
      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_280px]">
        <div className="card p-6">
          {live ? (
            <PayPanel bookingRef={ref} total={booking.total} expiresAt={booking.holdExpiresAt.toISOString()} />
          ) : (
            <div>
              <h1 className="text-2xl">{booking.status === "PAYMENT_FAILED" ? "Payment didn't go through" : "Your hold has ended"}</h1>
              <p className="mt-2 text-sm text-muted">
                {booking.status === "PAYMENT_FAILED"
                  ? "Your card wasn't charged and the room has been released. You can try again."
                  : "We hold rooms for 10 minutes so they stay fair for everyone. The room has been released."}
              </p>
              <Link href={`/rooms/${room.slug}?in=${booking.checkIn}&out=${booking.checkOut}&adults=${booking.adults}&children=${booking.children}`} className="btn-primary mt-5">
                Check availability again
              </Link>
            </div>
          )}
        </div>
        <aside className="card h-fit space-y-3 p-5 text-sm">
          <p className="font-display text-lg">{room.name}</p>
          <p className="text-muted">
            {formatRange(booking.checkIn, booking.checkOut)} · {plan.name}
          </p>
          <PriceBreakdown quote={booking.breakdown as Quote} promoCode={booking.promoCode} />
        </aside>
      </div>
    </div>
  );
}
