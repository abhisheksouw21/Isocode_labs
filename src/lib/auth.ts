import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { AppError } from "./errors";

export const SESSION_COOKIE = "kh_session";
const SESSION_HOURS = 12;
let dummyHash: string | undefined;

export type Session = { userId: number; name: string; email: string; role: "STAFF" | "GM"; team: "RESERVATIONS" | "SALES" | "MANAGEMENT" };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(value);
}

export async function signSession(s: Session) {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { userId: payload.userId as number, name: payload.name as string, email: payload.email as string, role: payload.role as Session["role"], team: payload.team as Session["team"] };
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.trim().toLowerCase()));
  dummyHash ??= bcrypt.hashSync("timing-equaliser", 10);
  const ok = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
  if (!user || !ok) throw new AppError("BAD_LOGIN", "Email or password is incorrect", 401);
  const session: Session = { userId: user.id, name: user.name, email: user.email, role: user.role, team: user.team };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return session;
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** For server components: send unauthenticated users to sign in. */
export async function requireStaffPage(role?: "GM") {
  const s = await getSession();
  if (!s) redirect("/staff/login");
  if (role && s.role !== role) redirect("/staff/inbox?denied=1");
  return s;
}

/** For route handlers. */
export async function requireStaff(role?: "GM") {
  const s = await getSession();
  if (!s) throw new AppError("UNAUTHENTICATED", "Please sign in", 401);
  if (role && s.role !== role) throw new AppError("FORBIDDEN", "Only the GM can do this", 403);
  return s;
}
