/** Immediate visual feedback while a destination route is streamed or hydrated. */
export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Loading page" role="status">
      <div className="h-7 w-56 rounded-lg bg-slate-200 dark:bg-ink-800" />
      <div className="h-4 w-96 max-w-full rounded bg-slate-100 dark:bg-ink-800/70" />
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-ink-700 dark:bg-ink-850">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-ink-800" />
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-ink-800" />
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-ink-800" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((row) => <div key={row} className="h-12 rounded-lg bg-slate-50 dark:bg-ink-800/60" />)}
        </div>
      </div>
      <span className="sr-only">Loading page</span>
    </div>
  );
}
