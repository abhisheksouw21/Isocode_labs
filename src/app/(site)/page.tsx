import Image from "next/image";
import Link from "next/link";
import { RoomCard } from "@/components/RoomCard";
import { StaySearch } from "@/components/StaySearch";
import { searchAvailability, type RoomAvailability } from "@/lib/booking";
import { getRoomTypes } from "@/lib/catalog";
import { formatRange, nightsBetween } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { RESORT } from "@/lib/resort";
import { parseStay, stayQuery } from "@/lib/stay-params";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const stay = parseStay(await searchParams);
  const rooms = await getRoomTypes();
  let results: RoomAvailability[] = [];
  let error: string | null = null;
  try {
    results = await searchAvailability(stay);
  } catch (err) {
    error = err instanceof AppError ? err.message : "We couldn't load prices just now. Please try again.";
  }
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const query = stayQuery(stay);
  const anyAvailable = results.some((r) => r.fits && r.available > 0);

  return (
    <>
      <section className="relative">
        <div className="relative h-[52vh] min-h-[340px] w-full sm:h-[64vh]">
          <Image src="/hero.webp" alt="Mist over the coffee estate at dawn" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/30" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
            <p className="eyebrow text-white/90">{RESORT.place}</p>
            <h1 className="mt-2 max-w-xl text-3xl leading-tight text-white drop-shadow-sm sm:text-5xl">Slow mornings on a working coffee estate</h1>
          </div>
        </div>
        <div className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
          <StaySearch stay={stay} />
        </div>
      </section>

      <section id="rooms" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Rooms & villas</p>
            <h2 className="mt-1 text-3xl">
              {formatRange(stay.checkIn, stay.checkOut)} · {nights} night{nights > 1 ? "s" : ""}
            </h2>
          </div>
          <p className="text-sm text-muted">
            {stay.adults} adult{stay.adults > 1 ? "s" : ""}
            {stay.children ? `, ${stay.children} child${stay.children > 1 ? "ren" : ""}` : ""} · Prices include breakfast and GST
          </p>
        </div>

        {error && <p className="mb-6 rounded-xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert" role="alert">{error}</p>}
        {!error && results.length > 0 && !anyAvailable && (
          <div className="mb-6 rounded-xl border border-line bg-white px-4 py-4 text-sm">
            <p className="font-medium">Nothing fits these dates on our website.</p>
            <p className="mt-1 text-muted">
              Try other dates, or <Link href="/enquire" className="text-estate underline underline-offset-4">send us an enquiry</Link> and our team will look for options.
            </p>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, i) => (
            <RoomCard key={room.id} room={room} avail={results.find((r) => r.roomTypeId === room.id)} query={query} nights={nights} priority={i < 2} />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {[
            ["Best rate, booked direct", "Our best available rate is here, with no agency mark-up. Paying now saves a further 10%."],
            ["Free cancellation", "Flexible rates can be cancelled up to 72 hours before arrival."],
            ["Talk to the estate", "Questions about kids, pets or long stays go straight to our reservations team."],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="text-lg">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="card grid items-center gap-6 overflow-hidden sm:grid-cols-2">
          <div className="relative aspect-[3/2] sm:h-full">
            <Image src="/rooms/coffee-bungalow-villa-2.webp" alt="Estate lawns at dusk" fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="p-6 sm:p-10">
            <p className="eyebrow">Weddings & offsites</p>
            <h2 className="mt-1 text-3xl">Lawns for {RESORT.venues.lawnCapacity}, a hall for {RESORT.venues.conferenceHallCapacity}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Tell us your dates, headcount and budget. Your enquiry goes straight to the right person on our team. We aim to reply within 30 minutes during working hours.
            </p>
            <Link href="/enquire" className="btn-primary mt-6">
              Plan an event
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
