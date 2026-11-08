import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap flex min-h-dvh flex-col justify-center py-16">
      <p className="text-muted">Error 404</p>
      <h1 className="mt-2 text-5xl">This page isn&apos;t on the estate map</h1>
      <p className="mt-4 max-w-md text-lg">The link may be old, or the booking reference may have a typo.</p>
      <Link href="/" className="btn-primary mt-8 w-fit">
        Go to the home page
      </Link>
    </main>
  );
}
