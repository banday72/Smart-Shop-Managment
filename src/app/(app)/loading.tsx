export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-3xl border bg-white p-5 shadow-sm">
            <span className="block h-11 w-11 animate-pulse rounded-2xl bg-slate-100" />
            <span className="mt-5 block h-3 w-24 animate-pulse rounded bg-slate-100" />
            <span className="mt-2 block h-6 w-32 animate-pulse rounded bg-slate-100" />
            <span className="mt-2 block h-2.5 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="h-72 animate-pulse rounded-3xl border bg-white shadow-sm" />
        <div className="h-72 animate-pulse rounded-3xl border bg-[#0b1220]/90 shadow-sm" />
      </section>
      <section className="h-64 animate-pulse rounded-3xl border bg-white shadow-sm" />
    </div>
  );
}
