import { EnquiryForm } from "@/components/EnquiryForm";
import { RESORT } from "@/lib/resort";

export const metadata = { title: "Weddings, offsites & enquiries" };

export default function EnquirePage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="eyebrow">Enquiries</p>
        <h1 className="mt-1 text-4xl">Plan something with us</h1>
        <p className="mt-3 max-w-xl text-muted">
          Weddings on the lawns, offsites in the hall, or a question about your stay. Tell us what you have in mind and the right person will reply.
        </p>
        <div className="mt-8">
          <EnquiryForm />
        </div>
      </div>
      <aside className="space-y-4 text-sm text-muted lg:pt-24">
        <div className="card p-5">
          <p className="font-display text-lg text-ink">At the estate</p>
          <ul className="mt-3 space-y-2">
            <li>Lawns for up to {RESORT.venues.lawnCapacity} guests</li>
            <li>Conference hall for {RESORT.venues.conferenceHallCapacity}, boardroom for {RESORT.venues.boardroomCapacity}</li>
            <li>{RESORT.keys} rooms and villas for your guests</li>
          </ul>
        </div>
        <p>
          Prefer to talk? Call {RESORT.phone}. We aim to reply to written enquiries within 30 minutes during working hours.
        </p>
      </aside>
    </div>
  );
}
