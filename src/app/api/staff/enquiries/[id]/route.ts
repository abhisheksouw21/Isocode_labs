import { requireStaff } from "@/lib/auth";
import { acknowledgeAlert, getEnquiry, markReplied, refreshFacts, rerouteEnquiry, saveDraft, setStatus } from "@/lib/enquiries";
import { AppError, notFound } from "@/lib/errors";
import { handle, parseJson } from "@/lib/http";
import { enquiryActionSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

async function loadId(ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) throw notFound("Enquiry");
  return id;
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await requireStaff();
  const row = await getEnquiry(await loadId(ctx));
  if (!row) throw notFound("Enquiry");
  return row;
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const s = await requireStaff();
  const id = await loadId(ctx);
  const body = await parseJson(req, enquiryActionSchema);
  const current = await getEnquiry(id);
  if (!current) throw notFound("Enquiry");
  const isOwnerOrGm = s.role === "GM" || current.enquiry.assigneeId === s.userId;

  switch (body.action) {
    case "reroute":
      return rerouteEnquiry(id, body.lane, s.name);
    case "saveDraft":
      if (!isOwnerOrGm) throw new AppError("FORBIDDEN", "Only the owner or the GM can edit this draft", 403);
      return saveDraft(id, body.draft, s.name);
    case "refreshFacts":
      return refreshFacts(id, s.name);
    case "markReplied":
      if (!isOwnerOrGm) throw new AppError("FORBIDDEN", "Only the owner or the GM can mark this replied", 403);
      return markReplied(id, s.name, body.confirmUnverified ?? false);
    case "close":
      return setStatus(id, "CLOSED", s.name);
    case "reopen":
      return setStatus(id, "NEW", s.name);
    case "ackAlert":
      if (s.role !== "GM") throw new AppError("FORBIDDEN", "Only the GM can acknowledge alerts", 403);
      return acknowledgeAlert(id, s.name);
  }
});
