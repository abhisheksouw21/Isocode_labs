export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-64 rounded bg-sand" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[3/2] bg-sand" />
            <div className="space-y-2 p-5">
              <div className="h-5 w-40 rounded bg-sand" />
              <div className="h-4 w-56 rounded bg-sand" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
