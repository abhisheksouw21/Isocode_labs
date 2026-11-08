import { Phone } from "lucide-react";
import { EnquiryForm } from "@/components/EnquiryForm";
import { CONTACT } from "@/components/site/contact";
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";
import { RESORT } from "@/lib/resort";

export const metadata = { title: "Weddings, offsites and enquiries" };

export default function EnquirePage() {
  return (
    <div className="wrap grid gap-12 py-10 sm:py-14 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="max-w-2xl text-5xl sm:text-6xl">Plan a wedding, an offsite or a stay</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">Tell us what you have in mind. Your enquiry goes straight to the person who handles it.</p>
        <div className="mt-10">
          <EnquiryForm />
        </div>
      </div>
      <aside className="space-y-6 lg:pt-4">
        <div className="rounded-[var(--radius-ui)] bg-leaf p-6">
          <h2 className="text-2xl">Space on the estate</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between gap-4 border-b border-line pb-3">
              <dt>Lawns</dt>
              <dd className="font-semibold">{RESORT.venues.lawnCapacity} guests</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-3">
              <dt>Conference hall</dt>
              <dd className="font-semibold">{RESORT.venues.conferenceHallCapacity} seats</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-3">
              <dt>Boardroom</dt>
              <dd className="font-semibold">{RESORT.venues.boardroomCapacity} seats</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Rooms and villas</dt>
              <dd className="font-semibold">{RESORT.keys}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="text-2xl">Rather talk?</h2>
          <p className="mt-2 text-muted">We aim to reply to written enquiries within 30 minutes in working hours.</p>
          <div className="mt-4 grid gap-2">
            <a href={CONTACT.tel} className="btn-ghost w-full">
              <Phone className="size-4" aria-hidden /> Call {CONTACT.phoneLabel}
            </a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">
              <WhatsAppIcon className="size-5" /> Message us on WhatsApp
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
