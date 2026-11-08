import { searchAvailability } from "@/lib/booking";
import { handle, rateLimit } from "@/lib/http";
import { staySchema } from "@/lib/validation";

export const GET = handle(async (req: Request) => {
  rateLimit(req, "availability", 60);
  const p = new URL(req.url).searchParams;
  const stay = staySchema.parse({ checkIn: p.get("in"), checkOut: p.get("out"), adults: p.get("adults") ?? 2, children: p.get("children") ?? 0 });
  const rooms = await searchAvailability(stay);
  return { rooms: rooms.map(({ slug, name, fits, available, plans }) => ({ slug, name, fits, available, plans: plans.map((pl) => ({ code: pl.code, name: pl.name, total: pl.quote.total })) })) };
});
