import { NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/lib/booking";
import { purgeExpiredEnquiries } from "@/lib/enquiries";

/** Called by Vercel Cron. Holds are also released lazily on every search and hold. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const released = await releaseExpiredHolds();
  const purged = await purgeExpiredEnquiries();
  return NextResponse.json({ released, purged });
}
