"use client";

import { ArrowRight, Compass, HardHat } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Card, PageHeader } from "@/components/ui";
import { findMenuEntry, moduleForPath } from "@/lib/nav";

/**
 * Catch-all for menu entries whose screen is not built yet (and for mistyped URLs).
 * Real routes always win over this one — it only renders when nothing else matched.
 */
export default function PlaceholderPage() {
  const pathname = usePathname();
  const entry = findMenuEntry(pathname);
  const mod = entry?.module ?? moduleForPath(pathname);
  const siblings = (entry?.siblings ?? mod.items).filter((s) => s.href && s.href.split("?")[0] !== pathname);

  return (
    <div>
      <PageHeader
        title={entry?.item.label ?? "Page not found"}
        subtitle={entry ? [mod.title, ...entry.trail].join(" › ") : `No screen is mapped to ${pathname}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <HardHat className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{entry ? "This screen is next in the build queue" : "Nothing here yet"}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {entry
                  ? `“${entry.item.label}” is part of the ${mod.title} menu. The menu, routing and approval plumbing are in place; the screen itself is not built yet, so nothing is lost by opening it.`
                  : "This address does not match any screen in the menu. Use the module rail on the left, or press Ctrl+K to search every page."}
              </p>
              <p className="mt-3 font-mono text-xs text-slate-400 dark:text-slate-500">{pathname}</p>
            </div>
          </div>
        </Card>

        <Card title={<span className="inline-flex items-center gap-2"><Compass className="h-4 w-4 text-brand-500" /> Nearby in {mod.title}</span>}>
          <div className="space-y-1">
            {siblings.slice(0, 8).map((s) => (
              <Link
                key={s.label}
                href={s.href!}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-ink-800 dark:hover:text-white"
              >
                {s.icon ? <s.icon className="h-4 w-4 text-slate-400" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
                <span className="flex-1 truncate">{s.label}</span>
                {s.soon ? <span className="text-[10px] uppercase tracking-wide text-slate-400">soon</span> : <ArrowRight className="h-3.5 w-3.5 opacity-40" />}
              </Link>
            ))}
            {siblings.length === 0 && <p className="text-sm text-slate-400">No other entries in this section.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
