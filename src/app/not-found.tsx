import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="eyebrow">404</p>
      <h1 className="text-3xl">We couldn&apos;t find that page</h1>
      <Link href="/" className="btn-primary">
        Back to the estate
      </Link>
    </div>
  );
}
