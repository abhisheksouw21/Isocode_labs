import { RESORT } from "@/lib/resort";

export const metadata = { title: "Privacy & your data" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-muted sm:px-6">
      <p className="eyebrow">Privacy notice</p>
      <h1 className="mt-1 text-4xl text-ink">How we use your details</h1>
      <p className="mt-4">
        {RESORT.name} handles your personal data under India&apos;s Digital Personal Data Protection Act, 2023. This notice explains what we collect and why.
      </p>
      <h2 className="mt-8 text-xl text-ink">What we collect</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>For bookings: your name, email, mobile number, stay dates and any requests you choose to share.</li>
        <li>For enquiries: your name, contact details and the message you send.</li>
        <li>We do not collect ID, passport or visa details online. These are checked at the front desk, including Form C for foreign nationals.</li>
      </ul>
      <h2 className="mt-8 text-xl text-ink">Why</h2>
      <p className="mt-2">Only to hold and manage your booking, reply to your enquiry, and meet our legal duties as a hotel. We don&apos;t send marketing without your separate consent.</p>
      <h2 className="mt-8 text-xl text-ink">How long we keep it</h2>
      <p className="mt-2">
        Enquiries that don&apos;t become a booking are deleted after {RESORT.enquiryRetentionDays / 30} months. Booking records are kept as long as tax and hotel regulations require.
      </p>
      <h2 className="mt-8 text-xl text-ink">Your rights</h2>
      <p className="mt-2">
        You can ask to see, correct or erase your data, or withdraw consent, by writing to {RESORT.email}. You can also raise a grievance with the Data Protection Board of India.
      </p>
    </article>
  );
}
