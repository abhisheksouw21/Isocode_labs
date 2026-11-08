import Image from "next/image";
import Link from "next/link";
import { GuestDetailsForm } from "@/components/GuestDetailsForm";
import { Stepper } from "@/components/Stepper";
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
    error = err instanceof AppError ? err.message : "We couldn't load this rate. Please try again.";
  }
  const back = `/rooms/${roomSlug}?${stayQuery(stay)}`;
  const available = data && data.avail.fits && data.avail.available > 0 && data.quote;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Stepper current={2} />
      {(error || !available) && (
        <div className="card mt-8 p-6">
          <h1 className="text-2xl">This rate isn&apos;t available</h1>
          <p className="mt-2 text-sm text-muted">
            {error ?? (data && !data.avail.fits ? "This room doesn't fit your group." : "It sold out or closed for these dates.")}
          </p>
          <Link href={`/?${stayQuery(stay)}#rooms`} className="btn-primary mt-5">
            See available rooms
          </Link>
        </div>
      )}
      {data && available && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <GuestDetailsForm stay={stay} roomSlug={data.room.slug} planCode={data.plan.code} initialQuote={data.quote!} />
          <aside className="card h-fit overflow-hidden lg:sticky lg:top-20">
            <div className="relative aspect-[3/2] bg-sand">
              <Image src={data.room.images[0]} alt={data.room.name} fill sizes="360px" className="object-cover" />
            </div>
            <div className="space-y-1 p-5 text-sm">
              <p className="eyebrow">Step 1 · Your stay</p>
              <p className="font-display text-xl">{data.room.name}</p>
              <p className="text-muted">
                {formatRange(stay.checkIn, stay.checkOut)} · {nightsBetween(stay.checkIn, stay.checkOut)} nights
              </p>
              <p className="text-muted">
                {stay.adults} adult{stay.adults > 1 ? "s" : ""}
                {stay.children ? `, ${stay.children} child${stay.children > 1 ? "ren" : ""}` : ""} · {data.plan.name}
              </p>
              <Link href={back} className="inline-block pt-1 text-estate underline underline-offset-4">
                Change
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
