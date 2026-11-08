import { z } from "zod";
import { setPromoActive } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { handle, parseJson } from "@/lib/http";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireStaff("GM");
  const { active } = await parseJson(req, z.object({ active: z.boolean() }));
  return setPromoActive(Number((await ctx.params).id), active);
});
