import { login } from "@/lib/auth";
import { handle, parseJson, rateLimit } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  rateLimit(req, "login", 8);
  const { email, password } = await parseJson(req, loginSchema);
  const s = await login(email, password);
  return { name: s.name, role: s.role };
});
