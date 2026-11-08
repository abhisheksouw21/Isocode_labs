import { Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { RESORT } from "@/lib/resort";
import { CONTACT } from "./contact";
import { MenuCloser } from "./MenuCloser";
import { WhatsAppIcon } from "./WhatsAppIcon";

const NAV = [
  { href: "/#rooms", label: "Rooms and villas" },
  { href: "/enquire", label: "Weddings and offsites" },
  { href: "/#visit", label: "Getting here" },
];

/** The mobile menu is a <details> element, so it opens and closes without JavaScript. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-mist">
      <a href="#main" className="sr-only-focusable">
        Skip to content
      </a>
      <div className="wrap flex h-16 items-center gap-6">
        <Link href="/" className="font-display text-xl whitespace-nowrap text-ink">
          {RESORT.name}
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-[var(--radius-ui)] px-3 py-2.5 text-[0.95rem] text-ink hover:bg-leaf">
              {n.label}
            </Link>
          ))}
          <a href={CONTACT.tel} className="ml-2 inline-flex items-center gap-2 rounded-[var(--radius-ui)] px-3 py-2.5 text-[0.95rem] text-ink hover:bg-leaf">
            <Phone className="size-4" aria-hidden />
            {CONTACT.phoneLabel}
          </a>
          <Link href="/#rooms" className="btn-primary ml-2">
            Book a room
          </Link>
        </nav>

        <details id="site-menu" className="group ml-auto lg:hidden">
          <summary className="btn-ghost btn-sm list-none [&::-webkit-details-marker]:hidden">
            <Menu className="size-5 group-open:hidden" aria-hidden />
            <X className="hidden size-5 group-open:block" aria-hidden />
            <span>Menu</span>
          </summary>
          <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-mist">
            <nav aria-label="Main" className="wrap flex flex-col py-6">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="border-b border-line py-4 font-display text-2xl text-ink">
                  {n.label}
                </Link>
              ))}
              <Link href="/#rooms" className="btn-primary mt-8 w-full">
                Book a room
              </Link>
              <div className="mt-8 grid gap-3">
                <a href={CONTACT.tel} className="btn-ghost w-full">
                  <Phone className="size-4" aria-hidden /> Call {CONTACT.phoneLabel}
                </a>
                <a href={CONTACT.whatsapp} className="btn-ghost w-full" target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-5" /> Message us on WhatsApp
                </a>
              </div>
            </nav>
          </div>
        </details>
        <MenuCloser id="site-menu" />
      </div>
    </header>
  );
}
