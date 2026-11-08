import { createPromo, listPromos } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { handle, parseJson } from "@/lib/http";
import { promoSchema } from "@/lib/validation";

export const GET = handle(async () => {
  await requireStaff("GM");
  return listPromos();
});

export const POST = handle(async (req: Request) => {
  await requireStaff("GM");
  return createPromo(await parseJson(req, promoSchema));
});
