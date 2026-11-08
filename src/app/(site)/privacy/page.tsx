import { RESORT } from "@/lib/resort";

export const metadata = { title: "Privacy and your data" };

export default function PrivacyPage() {
  return (
    <article className="wrap max-w-3xl py-12 sm:py-16">
      <h1 className="text-5xl sm:text-6xl">How we use your details</h1>
      <p className="mt-5 text-lg">
        {RESORT.name} handles your personal data under India&apos;s Digital Personal Data Protection Act, 2023. This page says what we collect and why.
      </p>
      <div className="mt-10 space-y-10 text-lg [&_h2]:text-3xl [&_li]:mt-2 [&_p]:mt-3">
        <section>
          <h2>What we collect</h2>
          <ul className="mt-3 list-disc pl-6">
            <li>For bookings: your name, email, mobile number, stay dates and any requests you choose to share.</li>
            <li>For enquiries: your name, contact details and the message you send.</li>
            <li>No ID, passport or visa details online. We check these at the front desk, including Form C for guests from abroad.</li>
          </ul>
        </section>
        <section>
          <h2>Why</h2>
          <p>To hold and manage your booking, to reply to your enquiry, and to meet our legal duties as a hotel. No marketing without your separate consent.</p>
        </section>
        <section>
          <h2>How long we keep it</h2>
          <p>
            Enquiries that don&apos;t become a booking are deleted after {RESORT.enquiryRetentionDays / 30} months. Booking records are kept as long as tax and hotel rules require.
          </p>
        </section>
        <section>
          <h2>Your rights</h2>
          <p>
            Write to{" "}
            <a href={`mailto:${RESORT.email}`} className="link">
              {RESORT.email}
            </a>{" "}
            to see, correct or erase your data, or to withdraw consent. You can also take a grievance to the Data Protection Board of India.
          </p>
        </section>
      </div>
    </article>
  );
}
