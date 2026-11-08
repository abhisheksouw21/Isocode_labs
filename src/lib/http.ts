import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError } from "./errors";

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError("BAD_JSON", "Request body must be JSON");
  }
  return schema.parse(body);
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      const data = await fn(...args);
      return data instanceof Response ? data : NextResponse.json(data ?? { ok: true });
    } catch (err) {
      if (err instanceof AppError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return NextResponse.json(
          { error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", code: "VALIDATION", issues: err.issues },
          { status: 400 },
        );
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong on our side. Please try again.", code: "INTERNAL" }, { status: 500 });
    }
  };
}

const buckets = new Map<string, { tokens: number; at: number }>();

/**
 * Small in-memory token bucket per IP. On serverless each instance has its own
 * memory, so this blunts bursts rather than enforcing a hard global limit.
 */
export function rateLimit(req: Request, key: string, perMinute: number) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(id) ?? { tokens: perMinute, at: now };
  b.tokens = Math.min(perMinute, b.tokens + ((now - b.at) / 60_000) * perMinute);
  b.at = now;
  if (b.tokens < 1) throw new AppError("RATE_LIMITED", "Too many requests. Please wait a minute.", 429);
  b.tokens -= 1;
  buckets.set(id, b);
}
