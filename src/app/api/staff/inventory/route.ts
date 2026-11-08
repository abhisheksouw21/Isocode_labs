import { inventoryGrid, updateInventory } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { isIsoDate, todayAtResort } from "@/lib/dates";
import { handle, parseJson } from "@/lib/http";
import { inventoryPatchSchema } from "@/lib/validation";

export const GET = handle(async (req: Request) => {
  await requireStaff("GM");
  const p = new URL(req.url).searchParams;
  const from = p.get("from") && isIsoDate(p.get("from")!) ? p.get("from")! : todayAtResort();
  const days = Math.min(31, Math.max(7, Number(p.get("days")) || 14));
  return inventoryGrid(from, days);
});

export const PATCH = handle(async (req: Request) => {
  await requireStaff("GM");
  return updateInventory(await parseJson(req, inventoryPatchSchema));
});
