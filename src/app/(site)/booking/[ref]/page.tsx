import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { getBookingByRef } from "@/lib/booking";
import { formatDate } from "@/lib/dates";
import type { Quote } from "@/lib/pricing";
import { RESORT } from "@/lib/resort";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking confirmed", robots: { index: false } };

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export default async function ConfirmationPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const row = await getBookingByRef(ref);
  if (!row) notFound();
  const { booking, room, plan } = row;
  if (booking.status !== "CONFIRMED") redirect(`/book/${ref}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <p className="mx-auto flex size-12 items-center justify-center rounded-full bg-estate text-xl text-white">✓</p>
        <h1 className="mt-4 text-3xl sm:text-4xl">You&apos;re booked, {booking.guestName.split(" ")[0]}</h1>
        <p className="mt-2 text-muted">
          Reference <span className="font-medium text-ink">{booking.ref}</span> · confirmation for {maskEmail(booking.guestEmail)}
        </p>
      </div>

      <div className="card mt-8 overflow-hidden">
        <div className="relative aspect-[5/2] bg-sand">
          <Image src={room.images[0]} alt={room.name} fill sizes="768px" className="object-cover" />
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div className="space-y-3 text-sm">
            <p className="font-display text-xl">{room.name}</p>
            <div>
              <p className="text-muted">Check-in</p>
              <p>
                {formatDate(booking.checkIn, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} from {RESORT.checkInTime}
              </p>
            </div>
            <div>
              <p className="text-muted">Check-out</p>
              <p>
                {formatDate(booking.checkOut, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} by {RESORT.checkOutTime}
              </p>
            </div>
            <p className="text-muted">
              {booking.adults} adult{booking.adults > 1 ? "s" : ""}
              {booking.children ? `, ${booking.children} child${booking.children > 1 ? "ren" : ""}` : ""} · {plan.name}
            </p>
          </div>
          <div>
            <PriceBreakdown quote={booking.breakdown as Quote} promoCode={booking.promoCode} />
            <p className="mt-2 text-xs text-muted">Paid in full (test mode). {plan.refundable ? "Free cancellation up to 72 hours before arrival." : "Non-refundable rate."}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-sand/50 p-4 text-sm leading-relaxed text-muted">
        Please bring a photo ID for each adult. Foreign nationals will complete Form C with their passport and visa at check-in. Questions? Call {RESORT.phone} and quote your reference.
      </div>
      <div className="mt-8 text-center">
        <Link href="/" className="btn-ghost">
          Back to the estate
        </Link>
      </div>
    </div>
  );
}
