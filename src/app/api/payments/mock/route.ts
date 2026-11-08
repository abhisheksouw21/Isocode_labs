import { settlePayment } from "@/lib/booking";
import { handle, parseJson, rateLimit } from "@/lib/http";
import { paymentSchema } from "@/lib/validation";

/** Stands in for a gateway's server-to-server callback in test mode. */
export const POST = handle(async (req: Request) => {
  rateLimit(req, "pay", 20);
  const { ref, outcome, idempotencyKey } = await parseJson(req, paymentSchema);
  await new Promise((r) => setTimeout(r, 600));
  const { booking, payment, replay } = await settlePayment(ref, idempotencyKey, outcome);
  return { status: booking.status, payment: payment.status, replay };
});
