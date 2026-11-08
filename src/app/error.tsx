"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted">It&apos;s on our side, not yours. Please try again in a moment.</p>
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
