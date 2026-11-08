import { quoteRoom } from "@/lib/booking";
import { handle, parseJson, rateLimit } from "@/lib/http";
import { quoteSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  rateLimit(req, "quote", 60);
  const input = await parseJson(req, quoteSchema);
  const { quote, promo, avail } = await quoteRoom(input);
  return { quote, promo, available: avail.fits ? avail.available : 0 };
});
