import Link from "next/link";
import { RESORT } from "@/lib/resort";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-display text-lg whitespace-nowrap text-ink">
            {RESORT.name}
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-4">
            <Link href="/#rooms" className="hidden rounded-full px-3 py-2 text-muted hover:text-ink sm:inline">
              Rooms & villas
            </Link>
            <Link href="/enquire" className="rounded-full px-3 py-2 whitespace-nowrap text-muted hover:text-ink">
              <span className="sm:hidden">Events</span>
              <span className="hidden sm:inline">Weddings & offsites</span>
            </Link>
            <Link href="/#rooms" className="btn-primary btn-sm whitespace-nowrap">
              Book direct
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-sand/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-display text-base text-ink">{RESORT.name}</p>
            <p className="mt-1">A working coffee estate in {RESORT.place}.</p>
          </div>
          <div>
            <p>Check-in {RESORT.checkInTime} · Check-out {RESORT.checkOutTime}</p>
            <p className="mt-1">
              {RESORT.phone} · {RESORT.email}
            </p>
          </div>
          <div className="sm:text-right">
            <Link href="/privacy" className="underline-offset-4 hover:underline">
              Privacy & your data
            </Link>
            <span className="mx-2">·</span>
            <Link href="/staff/login" className="underline-offset-4 hover:underline">
              Staff
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
