import Image from "next/image";
import Link from "next/link";
import type { RoomType } from "@/db/schema";
import type { RoomAvailability } from "@/lib/booking";
import { formatINR } from "@/lib/money";
import { StatusNote } from "./StatusNote";

function roomStatus(room: RoomType, avail?: RoomAvailability) {
  if (!avail) return { tone: "info" as const, text: "Pick dates to see prices" };
  if (!avail.fits) return { tone: "none" as const, text: `Sleeps up to ${room.maxGuests}, so it doesn't fit this group` };
  if (avail.available === 0) return { tone: "none" as const, text: avail.closedNights.length ? "Closed on some of these nights" : "Sold out for these dates" };
  if (avail.available <= 2) return { tone: "low" as const, text: `Only ${avail.available} left on our website` };
  return { tone: "ok" as const, text: "Available for your dates" };
}

function nightly(avail: RoomAvailability | undefined, nights: number) {
  const plan = avail?.plans.find((p) => p.code === "BB") ?? avail?.plans[0];
  if (!avail || !plan || !avail.fits || avail.available === 0) return null;
  return Math.round(plan.quote.total / nights);
}

export function RoomCard({
  room,
  avail,
  query,
  nights,
  feature = false,
  priority = false,
}: {
  room: RoomType;
  avail?: RoomAvailability;
  query: string;
  nights: number;
  feature?: boolean;
  priority?: boolean;
}) {
  const status = roomStatus(room, avail);
  const price = nightly(avail, nights);
  const href = `/rooms/${room.slug}?${query}`;

  return (
    <article className={`group grid content-start gap-5 ${feature ? "lg:grid-cols-12 lg:items-center lg:gap-12" : ""}`}>
      <Link href={href} className={`relative block overflow-hidden bg-leaf ${feature ? "aspect-[4/5] lg:col-span-5" : "aspect-[4/5]"}`} tabIndex={-1} aria-hidden>
        <Image
          src={room.images[0]}
          alt=""
          fill
          sizes={feature ? "(min-width: 1024px) 460px, 100vw" : "(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          priority={priority}
        />
      </Link>
      <div className={feature ? "lg:col-span-7" : ""}>
        <p className="text-sm text-muted">{room.kind === "VILLA" ? "Villa" : "Room"}, {room.sizeSqm} m², sleeps {room.maxGuests}</p>
        <h3 className={`mt-1 ${feature ? "text-4xl sm:text-5xl" : "text-[1.6rem]"}`}>
          <Link href={href} className="hover:underline hover:decoration-2 hover:underline-offset-4">
            {room.name}
          </Link>
        </h3>
        <p className={`mt-2 max-w-prose text-muted ${feature ? "text-lg" : ""}`}>{room.tagline}</p>
        {feature && <p className="mt-4 max-w-prose">{room.description}</p>}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <StatusNote tone={status.tone}>{status.text}</StatusNote>
          {price !== null && (
            <p className={feature ? "text-right" : ""}>
              <span className="font-display text-2xl">{formatINR(price)}</span>
              <span className="block text-sm text-muted">a night on average, with breakfast and GST</span>
            </p>
          )}
        </div>
        {feature && (
          <Link href={href} className="btn-primary mt-6">
            See the {room.kind === "VILLA" ? "villa" : "room"} and rates
          </Link>
        )}
      </div>
    </article>
  );
}
