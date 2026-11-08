import { ingestEnquiry } from "@/lib/enquiries";
import { handle, parseJson, rateLimit } from "@/lib/http";
import { enquirySchema } from "@/lib/validation";

const TYPE_LABEL = { stay: "Stay", wedding: "Wedding", offsite: "Corporate offsite", other: "Other" } as const;

export const POST = handle(async (req: Request) => {
  rateLimit(req, "enquiry", 5);
  const input = await parseJson(req, enquirySchema);
  const details = [
    input.type !== "other" ? `Enquiry type: ${TYPE_LABEL[input.type]}` : null,
    input.dates ? `Dates: ${input.dates}` : null,
    input.guests ? `${input.guests} guests` : null,
    input.budget ? `Budget ${input.budget}` : null,
  ].filter(Boolean);
  const message = details.length ? `${input.message}\n\n${details.join(". ")}` : input.message;
  const row = await ingestEnquiry({
    channel: "WEB",
    fromName: input.name,
    fromContact: input.contact,
    message,
    form: { type: input.type, dates: input.dates ?? null, guests: input.guests ?? null, budget: input.budget ?? null },
  });
  return { ref: row.ref };
});
