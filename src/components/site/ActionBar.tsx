import { Phone } from "lucide-react";
import Link from "next/link";
import { CONTACT } from "./contact";
import { WhatsAppIcon } from "./WhatsAppIcon";

/** Phone-only bar with the three things a guest does from a phone: call, message, book. */
export function ActionBar({ bookHref, bookLabel = "Book a room" }: { bookHref: string; bookLabel?: string }) {
  return (
    <>
      <div className="h-[4.5rem] lg:hidden" aria-hidden />
      <nav aria-label="Quick actions" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        <div className="wrap grid grid-cols-[auto_auto_1fr] gap-2 py-2.5">
          <a href={CONTACT.tel} className="btn-ghost px-3 whitespace-nowrap" aria-label={`Call ${CONTACT.phoneLabel}`}>
            <Phone className="size-5" aria-hidden />
            <span className="text-sm">Call</span>
          </a>
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 whitespace-nowrap" aria-label="WhatsApp: message us">
            <WhatsAppIcon className="size-5" />
            <span className="text-sm">WhatsApp</span>
          </a>
          <Link href={bookHref} className="btn-primary px-3 text-sm whitespace-nowrap">
            {bookLabel}
          </Link>
        </div>
      </nav>
    </>
  );
}
