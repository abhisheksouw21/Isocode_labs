import { Phone } from "lucide-react";
import Link from "next/link";
import { RESORT } from "@/lib/resort";
import { CONTACT } from "./contact";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function SiteFooter() {
  return (
    <footer className="bg-canopy text-mist">
      <div className="wrap grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-display text-3xl text-white">{RESORT.name}</p>
          <p className="mt-2 max-w-sm text-mist/85">Rooms and villas on a coffee estate in {RESORT.place}.</p>
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold tracking-normal text-white">Talk to us</h2>
          <ul className="mt-3 space-y-1">
            <li>
              <a href={CONTACT.tel} className="inline-flex min-h-11 items-center gap-2 text-mist hover:text-white hover:underline">
                <Phone className="size-4" aria-hidden /> {CONTACT.phoneLabel}
              </a>
            </li>
            <li>
              <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-mist hover:text-white hover:underline">
                <WhatsAppIcon className="size-4" mono /> WhatsApp
              </a>
            </li>
            <li>
              <a href={CONTACT.mailto} className="inline-flex min-h-11 items-center text-mist hover:text-white hover:underline">
                {CONTACT.email}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold tracking-normal text-white">Your stay</h2>
          <ul className="mt-3 space-y-1">
            <li className="flex min-h-11 items-center">Check-in from {RESORT.checkInTime}</li>
            <li className="flex min-h-11 items-center">Check-out by {RESORT.checkOutTime}</li>
            <li>
              <Link href="/privacy" className="inline-flex min-h-11 items-center text-mist hover:text-white hover:underline">
                Privacy and your data
              </Link>
            </li>
            <li>
              <Link href="/staff/login" className="inline-flex min-h-11 items-center text-mist hover:text-white hover:underline">
                Staff sign-in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="wrap border-t border-mist/20 py-5 text-sm text-mist/80">Photographs are stand-ins until the estate&apos;s own photography is ready.</p>
    </footer>
  );
}
