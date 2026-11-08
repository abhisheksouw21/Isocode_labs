import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { StaySearch } from "@/components/StaySearch";
import { searchAvailability, type RoomAvailability } from "@/lib/booking";
import { getRoomBySlug } from "@/lib/catalog";
import { formatRange, nightsBetween } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { parseStay, stayQuery } from "@/lib/stay-params";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const room = await getRoomBySlug((await params).slug);
  return { title: room?.name ?? "Room" };
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
    error = err instanceof AppError ? err.message : "We couldn't load prices just now. Please try again.";
  }

  let unavailable: string | null = null;
  if (avail && !avail.fits) unavailable = `${room.name} sleeps up to ${room.maxGuests} guests (${room.maxAdults} adults, ${room.maxChildren} children). Try fewer guests per room, or another room type.`;
  else if (avail && avail.available === 0)
    unavailable = avail.closedNights.length ? "This room is closed for some of these nights." : "This room is sold out on our website for these dates.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/?${stayQuery(stay)}#rooms`} className="text-sm text-muted hover:text-ink">
        ← All rooms
      </Link>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 sm:grid-rows-2">
        <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-sand sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[420px]">
          <Image src={room.images[0]} alt={`${room.name}`} fill priority sizes="(min-width: 640px) 66vw, 100vw" className="object-cover" />
        </div>
        {room.images.slice(1, 3).map((src, i) => (
          <div key={src} className="relative hidden aspect-[3/2] overflow-hidden rounded-2xl bg-sand sm:block">
            <Image src={src} alt={`${room.name}, view ${i + 2}`} fill sizes="33vw" className="object-cover" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div>
          <p className="eyebrow">{room.kind === "VILLA" ? "Villa" : "Room"} · {room.view}</p>
          <h1 className="mt-1 text-4xl">{room.name}</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">{room.description}</p>
          <dl className="mt-6 grid max-w-lg grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted">Size</dt>
              <dd className="mt-0.5">{room.sizeSqm} m²</dd>
            </div>
            <div>
              <dt className="text-muted">Beds</dt>
              <dd className="mt-0.5">{room.bed}</dd>
            </div>
            <div>
              <dt className="text-muted">Sleeps</dt>
              <dd className="mt-0.5">
                {room.maxGuests} ({room.maxAdults} adults)
              </dd>
            </div>
          </dl>
          <ul className="mt-6 flex flex-wrap gap-2">
            {room.amenities.map((a) => (
              <li key={a} className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted">
                {a}
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <StaySearch stay={stay} action={`/rooms/${room.slug}`} compact />
          <div className="card p-5">
            <h2 className="text-xl">
              {formatRange(stay.checkIn, stay.checkOut)} · {nights} night{nights > 1 ? "s" : ""}
            </h2>
            {error && <p className="mt-3 text-sm text-alert" role="alert">{error}</p>}
            {unavailable && (
              <div className="mt-3 text-sm">
                <p className="text-muted">{unavailable}</p>
                <Link href={`/?${stayQuery(stay)}#rooms`} className="mt-2 inline-block text-estate underline underline-offset-4">
                  See other rooms for these dates
                </Link>
              </div>
            )}
            {avail && !unavailable && (
              <>
                {avail.available <= 2 && <p className="mt-2 text-xs text-clay">Only {avail.available} left on our website for these dates</p>}
                <ul className="mt-4 space-y-4">
                  {avail.plans.map((p) => (
                    <li key={p.id} className="rounded-xl border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted">{p.description}</p>
                        </div>
                        {!p.refundable && <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-[11px] text-muted">Non-refundable</span>}
                      </div>
                      <div className="mt-3">
                        <PriceBreakdown quote={p.quote} />
                      </div>
                      <Link href={`/book?${stayQuery(stay, { room: room.slug, plan: p.code })}`} className="btn-primary mt-4 w-full">
                        Book this rate
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
