"use client";

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
    <nav className="-mx-1 flex gap-1 overflow-x-auto text-sm">
      {items.map((i) => {
        const active = path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 ${active ? "bg-sand text-ink" : "text-muted hover:text-ink"}`}>
            {i.label}
            {i.badge && (
              <span className={`rounded-full px-1.5 text-[11px] leading-5 ${i.badge.alert ? "bg-alert text-white" : "bg-line text-ink"}`} title={i.badge.alert ? "Complaint alerts" : "Open enquiries"}>
                {i.badge.n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
