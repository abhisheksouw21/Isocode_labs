"use client";

import { BellRing } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function StaffNav({ isGm, open, alerts }: { isGm: boolean; open: number; alerts: number }) {
  const path = usePathname();
  const items = [
    { href: "/staff/inbox", label: "Inbox", badge: alerts > 0 ? { n: alerts, alert: true } : open > 0 ? { n: open, alert: false } : null },
    ...(isGm
      ? [
          { href: "/staff/rates", label: "Rates & allotment", badge: null },
          { href: "/staff/promos", label: "Promos & GST", badge: null },
          { href: "/staff/bookings", label: "Bookings", badge: null },
        ]
      : []),
  ];
  return (
    <nav aria-label="Staff" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto text-sm">
      {items.map((i) => {
        const active = path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={`relative flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-ui)] px-3 ${active ? "bg-leaf text-ink" : "text-muted hover:text-ink"}`}>
            {i.label}
            {i.badge && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 text-xs leading-6 font-semibold ${i.badge.alert ? "bg-alert text-white" : "bg-line text-ink"}`}>
                {i.badge.alert && <BellRing className="size-3.5" aria-hidden />}
                {i.badge.n}
                <span className="sr-only">{i.badge.alert ? " complaint alerts" : " open enquiries"}</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
