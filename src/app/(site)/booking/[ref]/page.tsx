import { CircleCheck, IdCard, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { CONTACT } from "@/components/site/contact";
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

const LONG: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };

export default async function ConfirmationPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const row = await getBookingByRef(ref);
  if (!row) notFound();
  const { booking, room, plan } = row;
  if (booking.status !== "CONFIRMED") redirect(`/book/${ref}`);

  return (
    <div className="wrap max-w-4xl py-10 sm:py-14">
      <p className="inline-flex items-center gap-2 font-semibold text-ok">
        <CircleCheck className="size-5" aria-hidden /> Booking confirmed
      </p>
      <h1 className="mt-2 text-5xl sm:text-6xl">See you on {formatDate(booking.checkIn, { day: "numeric", month: "long" })}, {booking.guestName.split(" ")[0]}</h1>
      <p className="mt-4 text-lg">
        Booking reference <span className="font-semibold">{booking.ref}</span>, for {maskEmail(booking.guestEmail)}.
      </p>

      <div className="mt-10 grid overflow-hidden border border-line bg-surface sm:grid-cols-2">
        <div className="relative aspect-[4/3] bg-leaf sm:aspect-auto">
          <Image src={room.images[0]} alt="" fill sizes="(min-width: 640px) 450px, 100vw" className="object-cover" />
        </div>
        <div className="p-6">
          <p className="font-display text-2xl">{room.name}</p>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-sm text-muted">Check-in</dt>
              <dd>
                {formatDate(booking.checkIn, LONG)}, from {RESORT.checkInTime}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Check-out</dt>
              <dd>
                {formatDate(booking.checkOut, LONG)}, by {RESORT.checkOutTime}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Guests and rate</dt>
              <dd>
                {booking.adults} adult{booking.adults > 1 ? "s" : ""}
                {booking.children ? `, ${booking.children} child${booking.children > 1 ? "ren" : ""}` : ""}, {plan.name}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="panel p-5">
          <PriceBreakdown quote={booking.breakdown as Quote} promoCode={booking.promoCode} />
          <p className="mt-3 text-sm text-muted">
            Paid in full with the test gateway. {plan.refundable ? "Free cancellation up to 72 hours before arrival." : "This rate is non-refundable."}
          </p>
        </div>
        <div className="space-y-4 rounded-[var(--radius-ui)] bg-leaf p-5">
          <p className="flex gap-3">
            <IdCard className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>Bring a photo ID for each adult. Guests from abroad fill in Form C with their passport at the front desk.</span>
          </p>
          <p className="flex gap-3">
            <Phone className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              Questions before you arrive?{" "}
              <a href={CONTACT.tel} className="link">
                Call {CONTACT.phoneLabel}
              </a>{" "}
              and give your booking reference.
            </span>
          </p>
        </div>
      </div>
      <Link href="/" className="btn-ghost mt-10">
        Back to the estate
      </Link>
    </div>
  );
}
