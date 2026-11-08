import Image from "next/image";
import Link from "next/link";
import type { RoomAvailability } from "@/lib/booking";
import type { RoomType } from "@/db/schema";
import { formatINR } from "@/lib/money";

export function RoomCard({ room, avail, query, nights, priority }: { room: RoomType; avail?: RoomAvailability; query: string; nights: number; priority?: boolean }) {
  const bb = avail?.plans.find((p) => p.code === "BB") ?? avail?.plans[0];
  const bookable = avail && avail.fits && avail.available > 0 && bb;
  let status: string;
  if (!avail) status = "Check dates to see prices";
  else if (!avail.fits) status = `Sleeps up to ${room.maxGuests} (${room.maxAdults} adults)`;
  else if (avail.available === 0) status = avail.closedNights.length ? "Closed on some of these nights" : "Sold out for these dates";
  else status = avail.available <= 2 ? `Only ${avail.available} left on our site` : "Available";

  return (
    <Link href={`/rooms/${room.slug}?${query}`} className="group card overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[3/2] overflow-hidden bg-sand">
        <Image
          src={room.images[0]}
          alt={`${room.name}: ${room.view.toLowerCase()} view`}
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          priority={priority}
        />
        {room.kind === "VILLA" && <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-estate">Villa</span>}
      </div>
      <div className="space-y-3 p-5">
        <div>
          <h3 className="text-xl text-ink">{room.name}</h3>
          <p className="mt-1 text-sm text-muted">{room.tagline}</p>
        </div>
        <p className="text-xs text-muted">
          {room.sizeSqm} m² · {room.bed} · sleeps {room.maxGuests}
        </p>
        <div className="flex items-end justify-between border-t border-line pt-3">
          <p className={`text-xs ${bookable ? (avail!.available <= 2 ? "text-clay" : "text-ok") : "text-muted"}`}>{status}</p>
          {bookable && (
            <p className="text-right">
              <span className="block text-lg font-medium text-ink">{formatINR(Math.round(bb.quote.total / nights))}</span>
              <span className="text-xs text-muted">avg / night incl. GST</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
