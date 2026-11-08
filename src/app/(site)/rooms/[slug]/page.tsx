import { Check } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { ActionBar } from "@/components/site/ActionBar";
import { StatusNote } from "@/components/StatusNote";
import { StaySearch } from "@/components/StaySearch";
import { searchAvailability, type RoomAvailability } from "@/lib/booking";
import { getRoomBySlug } from "@/lib/catalog";
import { formatRange, nightsBetween } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { parseStay, stayQuery } from "@/lib/stay-params";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const room = await getRoomBySlug((await params).slug);
  return {
    title: room?.name ?? "Room",
    description: room ? `${room.tagline}. ${room.sizeSqm} m², sleeps ${room.maxGuests}. Book direct for the best available rate.` : undefined,
  };
}

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const room = await getRoomBySlug((await params).slug);
  if (!room) notFound();
  const stay = parseStay(await searchParams);
  const nights = nightsBetween(stay.checkIn, stay.checkOut);

  let avail: RoomAvailability | undefined;
  let error: string | null = null;
  try {
    avail = (await searchAvailability(stay)).find((r) => r.roomTypeId === room.id);
  } catch (err) {
    error = err instanceof AppError ? err.message : "Prices didn't load. Refresh the page to try again.";
  }

  let unavailable: string | null = null;
  if (avail && !avail.fits)
    unavailable = `The ${room.name} sleeps up to ${room.maxGuests}: ${room.maxAdults} adults and ${room.maxChildren} ${room.maxChildren === 1 ? "child" : "children"}. Try fewer guests, or another room.`;
  else if (avail && avail.available === 0)
    unavailable = avail.closedNights.length ? "Closed for some of these nights." : "Sold out on our website for these dates.";

  return (
    <div className="wrap py-6 sm:py-10">
      <Link href={`/?${stayQuery(stay)}#rooms`} className="link inline-flex min-h-11 items-center text-sm">
        All rooms and villas
      </Link>

      <div className="mt-3">
        <Gallery images={room.images} name={room.name} />
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="text-muted">
            {room.kind === "VILLA" ? "Villa" : "Room"} with a {room.view.toLowerCase()} view
          </p>
          <h1 className="mt-1 text-5xl sm:text-6xl">{room.name}</h1>
          <p className="mt-5 max-w-[62ch] text-lg">{room.description}</p>
          <dl className="mt-8 grid max-w-xl grid-cols-3 border-y border-line">
            <div className="py-4">
              <dt className="text-sm text-muted">Size</dt>
              <dd className="mt-0.5 font-display text-2xl">{room.sizeSqm} m²</dd>
            </div>
            <div className="py-4">
              <dt className="text-sm text-muted">Beds</dt>
              <dd className="mt-0.5">{room.bed}</dd>
            </div>
            <div className="py-4">
              <dt className="text-sm text-muted">Sleeps</dt>
              <dd className="mt-0.5">
                {room.maxGuests}, up to {room.maxAdults} adults
              </dd>
            </div>
          </dl>
          <h2 className="mt-10 text-2xl">In the {room.kind === "VILLA" ? "villa" : "room"}</h2>
          <ul className="mt-4 grid max-w-xl gap-2 sm:grid-cols-2">
            {room.amenities.map((a) => (
              <li key={a} className="flex items-center gap-2">
                <Check className="size-4 text-ok" aria-hidden />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <aside id="rates" className="scroll-mt-20 space-y-4 lg:sticky lg:top-20 lg:self-start">
          <StaySearch stay={stay} action={`/rooms/${room.slug}`} anchor="rates" />
          <div className="panel p-5">
            <h2 className="text-2xl">
              {formatRange(stay.checkIn, stay.checkOut)}, {nights} night{nights > 1 ? "s" : ""}
            </h2>
            {error && (
              <p role="alert" className="mt-3 text-alert">
                {error}
              </p>
            )}
            {unavailable && (
              <div className="mt-3">
                <StatusNote tone="none">{unavailable}</StatusNote>
                <p className="mt-3">
                  <Link href={`/?${stayQuery(stay)}#rooms`} className="link">
                    See other rooms for these dates
                  </Link>
                </p>
              </div>
            )}
            {avail && !unavailable && (
              <>
                {avail.available <= 2 && <StatusNote tone="low" className="mt-2">Only {avail.available} left on our website for these dates</StatusNote>}
                <ul className="mt-5 space-y-4">
                  {avail.plans.map((p) => (
                    <li key={p.id} className="rounded-[var(--radius-ui)] border border-line bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-sans text-lg font-semibold tracking-normal">{p.name}</h3>
                        <span className={`shrink-0 rounded-[var(--radius-ui)] px-2 py-0.5 text-xs font-semibold ${p.refundable ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn"}`}>
                          {p.refundable ? "Free cancellation" : "Non-refundable"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{p.description}</p>
                      <div className="mt-3">
                        <PriceBreakdown quote={p.quote} />
                      </div>
                      <Link href={`/book?${stayQuery(stay, { room: room.slug, plan: p.code })}`} className="btn-primary mt-4 w-full">
                        Book this rate<span className="sr-only">: {p.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>
      <ActionBar bookHref="#rates" bookLabel="See rates" />
    </div>
  );
}
