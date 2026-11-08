import { createHold, quoteRoom } from "@/lib/booking";
import { handle, parseJson, rateLimit } from "@/lib/http";
import { holdSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  rateLimit(req, "hold", 10);
  const input = await parseJson(req, holdSchema);
  const { room, plan } = await quoteRoom(input);
  const booking = await createHold({ ...input, roomTypeId: room.id, ratePlanId: plan.id, promoCode: input.promoCode || undefined });
  return { ref: booking.ref, holdExpiresAt: booking.holdExpiresAt, total: booking.total };
});
