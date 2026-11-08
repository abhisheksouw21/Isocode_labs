import { requireStaff } from "@/lib/auth";
import { ingestEnquiry } from "@/lib/enquiries";
import { handle, parseJson } from "@/lib/http";
import { simulateSchema } from "@/lib/validation";

/** Stands in for the email-forwarding and WhatsApp webhooks in this build. */
export const POST = handle(async (req: Request) => {
  await requireStaff();
  const input = await parseJson(req, simulateSchema);
  const row = await ingestEnquiry(input);
  return { id: row.id, ref: row.ref, lane: row.lane };
});
