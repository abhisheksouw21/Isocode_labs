import Link from "next/link";
import { GuestDetailsForm } from "@/components/GuestDetailsForm";
import { Stepper } from "@/components/Stepper";
import { StatusNote } from "@/components/StatusNote";
import { quoteRoom } from "@/lib/booking";
import { formatRange, nightsBetween } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { parseStay, stayQuery } from "@/lib/stay-params";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your details" };

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const stay = parseStay(sp);
  const roomSlug = String(sp.room ?? "");
  const planCode = String(sp.plan ?? "BB");

  let data: Awaited<ReturnType<typeof quoteRoom>> | null = null;
  let error: string | null = null;
  try {
    data = await quoteRoom({ ...stay, roomSlug, planCode });
  } catch (err) {
    error = err instanceof AppError ? err.message : "This rate didn't load. Go back and pick it again.";
  }
  const available = data && data.avail.fits && data.avail.available > 0 && data.quote;
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const guests = `${stay.adults} adult${stay.adults > 1 ? "s" : ""}${stay.children ? `, ${stay.children} child${stay.children > 1 ? "ren" : ""}` : ""}`;

  return (
    <div className="wrap py-6 sm:py-10">
      <Stepper current={2} />
      {(error || !available) && (
        <div className="panel mt-8 max-w-xl p-6">
          <h1 className="text-3xl">This rate can&apos;t be booked</h1>
          <div className="mt-3">
            <StatusNote tone="none">{error ?? (data && !data.avail.fits ? "The room doesn't fit your group." : "It sold out or closed for these dates.")}</StatusNote>
          </div>
          <Link href={`/?${stayQuery(stay)}#rooms`} className="btn-primary mt-6">
            See rooms for these dates
          </Link>
        </div>
      )}
      {data && available && (
        <div className="mt-6">
          <GuestDetailsForm
            stay={stay}
            roomSlug={data.room.slug}
            planCode={data.plan.code}
            initialQuote={data.quote!}
            summary={{
              roomName: data.room.name,
              image: data.room.images[0],
              dates: `${formatRange(stay.checkIn, stay.checkOut)}, ${nights} night${nights > 1 ? "s" : ""}`,
              guests,
              planName: data.plan.name,
              changeHref: `/rooms/${data.room.slug}?${stayQuery(stay)}#rates`,
            }}
          />
        </div>
      )}
    </div>
  );
}
