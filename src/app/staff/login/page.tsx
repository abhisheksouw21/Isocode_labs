import { redirect } from "next/navigation";
import { LoginForm } from "@/components/staff/LoginForm";
import { getSession } from "@/lib/auth";
import { RESORT } from "@/lib/resort";

export const metadata = { title: "Staff sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect("/staff/inbox");
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/staff") ? next : "/staff/inbox";
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-center">{RESORT.name}</p>
        <h1 className="mt-1 text-center text-3xl">Staff sign in</h1>
        <div className="card mt-6 p-6">
          <LoginForm next={safeNext} />
        </div>
        <p className="mt-4 text-center text-xs text-muted">Demo accounts are listed in deployment.md.</p>
      </div>
    </div>
  );
}
