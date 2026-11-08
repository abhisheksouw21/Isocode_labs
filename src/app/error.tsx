"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap flex min-h-[60vh] flex-col justify-center py-16">
      <h1 className="text-4xl">This page didn&apos;t load</h1>
      <p className="mt-4 max-w-md text-lg">The problem is on our side. Try loading it again.</p>
      <button onClick={reset} className="btn-primary mt-8 w-fit">
        Load the page again
      </button>
    </main>
  );
}
