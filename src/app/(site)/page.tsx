import { Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { RoomCard } from "@/components/RoomCard";
import { ActionBar } from "@/components/site/ActionBar";
import { CONTACT } from "@/components/site/contact";
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";
import { StaySearch } from "@/components/StaySearch";
import { StatusNote } from "@/components/StatusNote";
import { searchAvailability, type RoomAvailability } from "@/lib/booking";
import { getRatePlans, getRoomTypes } from "@/lib/catalog";
import { formatRange, nightsBetween } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { RESORT } from "@/lib/resort";
import { parseStay, stayQuery } from "@/lib/stay-params";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const stay = parseStay(await searchParams);
  const [rooms, allPlans] = await Promise.all([getRoomTypes(), getRatePlans()]);
  let results: RoomAvailability[] = [];
  let error: string | null = null;
  try {
    results = await searchAvailability(stay);
  } catch (err) {
    error = err instanceof AppError ? err.message : "Prices didn't load. Refresh the page to try again.";
  }
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const query = stayQuery(stay);
  const availFor = (id: number) => results.find((r) => r.roomTypeId === id);
  const isOpen = (id: number) => {
    const a = availFor(id);
    return a && a.fits && a.available > 0;
  };
  const ordered = [...rooms].sort((a, b) => Number(isOpen(b.id)) - Number(isOpen(a.id)) || a.sortOrder - b.sortOrder);
  const [feature, ...rest] = ordered;
  const anyOpen = rooms.some((r) => isOpen(r.id));
  const roomCount = rooms.filter((r) => r.kind === "ROOM").reduce((n, r) => n + r.totalUnits, 0);
  const villaCount = rooms.filter((r) => r.kind === "VILLA").reduce((n, r) => n + r.totalUnits, 0);
  const plans = [...new Map(allPlans.map((p) => [p.code, p])).values()].sort((a, b) => Number(b.code === "BB") - Number(a.code === "BB") || a.adjustmentPct - b.adjustmentPct);

  return (
    <>
      <section aria-labelledby="hero-title" className="relative isolate bg-canopy lg:min-h-[calc(100svh-4rem)]">
        <div className="relative h-[30svh] min-h-52 overflow-hidden lg:absolute lg:inset-0 lg:h-auto">
          <Image src="/hero.webp" alt="Mist settling over the coffee estate at dawn" fill priority sizes="100vw" className="object-cover" />
          <div
            aria-hidden
            className="motion-hide pointer-events-none absolute inset-y-0 -left-1/4 w-[150%] animate-mist bg-[linear-gradient(90deg,transparent,rgba(240,244,239,0.75)_45%,rgba(240,244,239,0.75)_55%,transparent)]"
          />
        </div>
        <div className="wrap relative lg:flex lg:min-h-[calc(100svh-4rem)] lg:items-end lg:pb-14">
          <div className="animate-enter bg-canopy py-9 lg:max-w-[46rem] lg:px-12 lg:py-12">
            <h1 id="hero-title" className="text-[2.35rem] text-white sm:text-5xl">
              Rooms and villas on a coffee estate in Chikkamagaluru
            </h1>
            <p className="mt-4 text-lg text-mist">
              {roomCount} rooms and {villaCount} villas among the coffee. Check-in from {RESORT.checkInTime}.
            </p>
            <div className="mt-8 border-t border-mist/25 pt-7">
              <StaySearch stay={stay} variant="hero" anchor="rooms" />
            </div>
          </div>
        </div>
      </section>

      <section id="rooms" aria-labelledby="rooms-title" className="wrap scroll-mt-20 py-16 sm:py-24">
        <div className="flex flex-col justify-between gap-3 border-b border-line pb-6 sm:flex-row sm:items-end">
          <h2 id="rooms-title" className="text-4xl sm:text-5xl">
            {formatRange(stay.checkIn, stay.checkOut)}
          </h2>
          <p className="text-muted">
            {nights} night{nights > 1 ? "s" : ""} for {stay.adults} adult{stay.adults > 1 ? "s" : ""}
            {stay.children ? ` and ${stay.children} child${stay.children > 1 ? "ren" : ""}` : ""}. Prices include breakfast and GST.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-8 rounded-[var(--radius-ui)] bg-alert-tint px-4 py-3 text-alert">
            {error}
          </p>
        )}
        {!error && !anyOpen && (
          <div className="mt-8 rounded-[var(--radius-ui)] bg-leaf px-5 py-5">
            <StatusNote tone="none">No room on our website fits these dates and guests.</StatusNote>
            <p className="mt-2 text-muted">
              Try other dates in the search above, or{" "}
              <Link href="/enquire" className="link">
                send us an enquiry
              </Link>{" "}
              and the reservations team will look for options.
            </p>
          </div>
        )}

        {feature && (
          <div className="mt-10">
            <RoomCard room={feature} avail={availFor(feature.id)} query={query} nights={nights} feature priority />
          </div>
        )}
        <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2">
          {rest.map((room) => (
            <RoomCard key={room.id} room={room} avail={availFor(room.id)} query={query} nights={nights} />
          ))}
        </div>
      </section>

      <section id="visit" aria-labelledby="visit-title" className="scroll-mt-16 border-y border-line bg-surface py-16 sm:py-24">
        <div className="wrap">
          <h2 id="visit-title" className="text-sm font-semibold font-sans tracking-normal text-muted">
            Where we are
          </h2>
          <p className="mt-3 font-display text-[clamp(2.75rem,9vw,7.5rem)] leading-[0.95] tracking-[-0.03em]">
            Chikkamagaluru, Karnataka
          </p>
          <dl className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-t border-line pt-4">
              <dt className="text-muted">Check-in</dt>
              <dd className="mt-1 font-display text-2xl">From {RESORT.checkInTime}</dd>
            </div>
            <div className="border-t border-line pt-4">
              <dt className="text-muted">Check-out</dt>
              <dd className="mt-1 font-display text-2xl">By {RESORT.checkOutTime}</dd>
            </div>
            <div className="border-t border-line pt-4">
              <dt className="text-muted">Rooms and villas</dt>
              <dd className="mt-1 font-display text-2xl">{RESORT.keys} in all</dd>
            </div>
            <div className="border-t border-line pt-4">
              <dt className="text-muted">Talk to us</dt>
              <dd className="mt-1 flex flex-col">
                <a href={CONTACT.tel} className="inline-flex min-h-11 items-center gap-2 font-display text-2xl hover:underline">
                  <Phone className="size-5" aria-hidden />
                  {CONTACT.phoneLabel}
                </a>
                <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="link inline-flex min-h-11 items-center gap-2">
                  <WhatsAppIcon className="size-5" />
                  Message us on WhatsApp
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="direct-title" className="wrap py-16 sm:py-24">
        <h2 id="direct-title" className="max-w-2xl text-4xl sm:text-5xl">
          Three ways to book a room here
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted">Every room and villa on this website comes with these rates. Pick one on the room page.</p>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <li key={p.code} className="rounded-[var(--radius-ui)] bg-leaf p-6">
              <h3 className="text-2xl">{p.name}</h3>
              <p className="mt-2 text-muted">{p.description}</p>
              <p className="mt-4 text-sm font-semibold">{p.refundable ? "Free cancellation" : "Non-refundable"}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="events-title" className="bg-canopy text-mist">
        <div className="wrap grid gap-10 py-16 sm:py-24 lg:grid-cols-12 lg:items-center">
          <div className="relative aspect-[4/3] overflow-hidden lg:col-span-6">
            <Image src="/rooms/coffee-bungalow-villa-2.webp" alt="The estate lawns at dusk" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 id="events-title" className="text-4xl text-white sm:text-5xl">
              Weddings and offsites on the estate
            </h2>
            <dl className="mt-8 grid grid-cols-2 gap-6">
              <div>
                <dt className="text-mist/80">Lawns</dt>
                <dd className="font-display text-3xl text-white">{RESORT.venues.lawnCapacity} guests</dd>
              </div>
              <div>
                <dt className="text-mist/80">Conference hall</dt>
                <dd className="font-display text-3xl text-white">{RESORT.venues.conferenceHallCapacity} seats</dd>
              </div>
              <div>
                <dt className="text-mist/80">Boardroom</dt>
                <dd className="font-display text-3xl text-white">{RESORT.venues.boardroomCapacity} seats</dd>
              </div>
              <div>
                <dt className="text-mist/80">Guests staying over</dt>
                <dd className="font-display text-3xl text-white">About {RESORT.maxGuestsInHouse}</dd>
              </div>
            </dl>
            <Link href="/enquire" className="btn mt-10 bg-white text-canopy hover:bg-leaf">
              Plan a wedding or offsite
            </Link>
          </div>
        </div>
      </section>

      <ActionBar bookHref="#rooms" />
    </>
  );
}
