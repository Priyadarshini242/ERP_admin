"use client";

import clsx from "clsx";
import { ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen, Search, Settings, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { AUTH_ENABLED, clearToken, getUser, getVisibleMenuKeys } from "@/lib/auth";
import { demoFor } from "@/lib/demo";
import { MODULES, moduleForPath, type NavItem, type NavModule } from "@/lib/nav";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "ERP SYSTEM";
const TAGLINE = process.env.NEXT_PUBLIC_APP_TAGLINE ?? "Retail · Wholesale · Manufacturing";

/** Current location including the query string, so "?view=batch" links can be marked active. */
function useCurrent() {
  const pathname = usePathname();
  const params = useSearchParams();
  const qs = params.toString();
  return { path: pathname, full: qs ? `${pathname}?${qs}` : pathname, moduleKey: params.get("module") };
}

/** A leaf is active when its href matches; with a query string every parameter it names must match. */
function leafActive(href: string, cur: { path: string; full: string }): boolean {
  const [path, qs] = href.split("?");
  if (cur.path !== path && !cur.path.startsWith(`${path}/`)) return false;
  if (!qs) return true;
  const want = new URLSearchParams(qs);
  const have = new URLSearchParams(cur.full.split("?")[1] ?? "");
  for (const [k, v] of want) if (have.get(k) !== v) return false;
  return true;
}

function itemActive(item: NavItem, cur: { path: string; full: string }): boolean {
  if (item.href && leafActive(item.href, cur)) return true;
  return item.children?.some((c) => itemActive(c, cur)) ?? false;
}

function useActionableCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () =>
      api<{ actionable: number }>("/approvals/summary")
        .then((s) => setCount(s.actionable))
        .catch(() => setCount((demoFor("/approvals/summary") as { actionable: number } | null)?.actionable ?? 0));
    load();
    window.addEventListener("approvals:changed", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("approvals:changed", load);
      window.removeEventListener("focus", load);
    };
  }, []);
  return count;
}

const matches = (item: NavItem, q: string): boolean =>
  !q || item.label.toLowerCase().includes(q) || (item.children?.some((c) => matches(c, q)) ?? false);

function visibleItems(items: NavItem[], moduleKey: string, allowed: string[] | null, trail: string[] = []): NavItem[] {
  if (!allowed) return items;
  return items.flatMap((item) => {
    const path = [...trail, item.label];
    const children = item.children ? visibleItems(item.children, moduleKey, allowed, path) : undefined;
    if (item.children) return children?.length ? [{ ...item, children }] : [];
    return item.href && allowed.includes(`${moduleKey}/${path.join("/")}`) ? [item] : [];
  });
}

/* ───────────────────────── rail ───────────────────────── */

function Rail({ active, modules, onNavigate }: { active: NavModule; modules: NavModule[]; onNavigate: () => void }) {
  const router = useRouter();
  return (
    <div className="flex h-full w-[72px] shrink-0 flex-col items-center gap-1 border-r border-slate-200/80 bg-slate-50 py-3 dark:border-ink-700 dark:bg-ink-950">
      <Link href="/dashboard" title={APP} className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/25 transition hover:scale-105">
        <Sparkles className="h-5 w-5" />
      </Link>

      <div className="scroll-thin flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto px-1.5">
        {modules.map((m) => {
          const Icon = m.icon;
          const on = m.key === active.key;
          return (
            <Link
              key={m.key}
              href={m.homeHref}
              onClick={onNavigate}
              onMouseEnter={() => router.prefetch(m.homeHref)}
              onFocus={() => router.prefetch(m.homeHref)}
              title={`${m.title} — ${m.subtitle}`}
              className={clsx("group relative flex w-full flex-col items-center gap-1 rounded-xl py-2 transition", on ? "text-brand-700 dark:text-brand-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100")}
            >
              {on && <span aria-hidden className="absolute -left-1.5 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-brand-600" />}
              <span
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-xl border transition",
                  on
                    ? "border-brand-200 bg-white text-brand-600 shadow-sm dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300"
                    : "border-transparent bg-transparent group-hover:border-slate-200 group-hover:bg-white dark:group-hover:border-ink-700 dark:group-hover:bg-ink-800",
                )}
              >
                <Icon className="h-[20px] w-[20px]" />
              </span>
              <span className={clsx("text-[9.5px] font-bold uppercase tracking-wider", on ? "" : "text-slate-400 dark:text-slate-500")}>{m.label}</span>
            </Link>
          );
        })}
      </div>

      <Link href="/settings" title="Settings" className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-ink-800 dark:hover:text-slate-200">
        <Settings className="h-[18px] w-[18px]" />
      </Link>
    </div>
  );
}

/* ───────────────────────── menu panel ───────────────────────── */

function Leaf({ item, cur, badge, depth = 1, moduleKey }: { item: NavItem; cur: { path: string; full: string }; badge?: number; depth?: number; moduleKey?: string }) {
  const on = item.href ? leafActive(item.href, cur) : false;
  const Icon = item.icon;
  const router = useRouter();
  const href = moduleKey ? withModule(item.href!, moduleKey) : item.href!;
  return (
    <Link
      href={href}
      // Prefetch on intent instead of loading every module's screen up front.
      onMouseEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
      className={clsx(
        "group relative flex items-center gap-2.5 rounded-lg py-[7px] pr-2 text-[13px] transition",
        depth > 1 ? "pl-7" : "pl-2.5",
        on ? "bg-brand-600 font-medium text-white shadow-sm shadow-brand-600/25" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-white",
      )}
    >
      {Icon ? (
        <Icon className={clsx("h-[15px] w-[15px] shrink-0", on ? "text-white" : "text-slate-400 group-hover:text-brand-500 dark:text-slate-500")} />
      ) : (
        <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", on ? "bg-white" : "bg-slate-300 dark:bg-ink-600")} />
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {item.soon && (
        <span className={clsx("rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide", on ? "bg-white/25 text-white" : "bg-slate-100 text-slate-400 dark:bg-ink-700 dark:text-slate-500")}>soon</span>
      )}
      {badge ? <span className={clsx("rounded-full px-1.5 text-[10px] font-bold", on ? "bg-white/25 text-white" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300")}>{badge}</span> : null}
    </Link>
  );
}

function firstHref(item: NavItem): string | undefined {
  if (item.href) return item.href;
  for (const child of item.children ?? []) {
    const href = firstHref(child);
    if (href) return href;
  }
  return undefined;
}

function withModule(href: string, moduleKey: string) {
  const [path, query] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("module", moduleKey);
  return `${path}?${params.toString()}`;
}

function Group({ item, cur, badge, query, moduleKey }: { item: NavItem; cur: { path: string; full: string }; badge?: number; query: string; moduleKey: string }) {
  const active = itemActive(item, cur);
  const [open, setOpen] = useState(active);
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (!item.children?.length) return <Leaf item={item} cur={cur} badge={item.href?.startsWith("/approvals") ? badge : undefined} moduleKey={moduleKey} />;

  const children = item.children.filter((c) => matches(c, query));
  const expanded = open || Boolean(query);
  const Icon = item.icon;
  const href = firstHref(item);
  const router = useRouter();

  return (
    <div className="select-none">
      <div className={clsx(
        "flex items-center rounded-lg text-[11px] font-bold uppercase tracking-wider transition",
        active ? "text-brand-700 dark:text-brand-300" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300",
      )}>
        {href ? (
          <Link href={withModule(href, moduleKey)} onMouseEnter={() => router.prefetch(withModule(href, moduleKey))} onFocus={() => router.prefetch(withModule(href, moduleKey))} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
            {Icon && <Icon className={clsx("h-4 w-4", active ? "text-brand-600 dark:text-brand-300" : "text-slate-400 dark:text-slate-500")} />}
            <span className="truncate text-left">{item.label}</span>
          </Link>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
            {Icon && <Icon className={clsx("h-4 w-4", active ? "text-brand-600 dark:text-brand-300" : "text-slate-400 dark:text-slate-500")} />}
            <span className="truncate text-left">{item.label}</span>
          </span>
        )}
        <button onClick={() => setOpen((o) => !o)} aria-expanded={expanded} aria-label={`Toggle ${item.label} menu`} className="mr-1 rounded p-1.5 hover:bg-slate-100 dark:hover:bg-ink-800">
          <ChevronRight className={clsx("h-3.5 w-3.5 opacity-60 transition-transform", expanded && "rotate-90")} />
        </button>
      </div>
      {expanded && (
        <div className="relative ml-[18px] space-y-0.5 border-l border-slate-200 pb-1 pl-1.5 dark:border-ink-700">
          {children.map((c) => (
            <Leaf key={c.label + (c.href ?? "")} item={c} cur={cur} badge={c.href?.startsWith("/approvals") ? badge : undefined} moduleKey={moduleKey} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── shell ───────────────────────── */

function SidebarInner({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapsed,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const cur = useCurrent();
  const router = useRouter();
  const actionable = useActionableCount();
  const routeModule = moduleForPath(cur.path);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [visibleKeys, setVisibleKeys] = useState<string[] | null>(null);
  const modules = MODULES;
  const active = modules.find((m) => m.key === cur.moduleKey) || modules.find((m) => m.key === routeModule.key) || modules[0] || routeModule;

  useEffect(() => {
    onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.full]);

  useEffect(() => {
    setUser(getUser());
    const onUserChanged = () => setUser(getUser());
    window.addEventListener("user:changed", onUserChanged);
    return () => window.removeEventListener("user:changed", onUserChanged);
  }, []);

  useEffect(() => {
    const refresh = () => setVisibleKeys(getVisibleMenuKeys());
    refresh();
    window.addEventListener("menu-access:changed", refresh);
    return () => window.removeEventListener("menu-access:changed", refresh);
  }, []);

  const visibleModules = useMemo(
    () => modules.map((module) => ({ ...module, items: visibleItems(module.items, module.key, visibleKeys) })).filter((module) => module.items.length > 0),
    [modules, visibleKeys],
  );
  const visibleActive = visibleModules.find((m) => m.key === active.key) ?? visibleModules[0] ?? active;

  const q = query.trim().toLowerCase();
  const items = useMemo(() => visibleActive.items.filter((i) => matches(i, q)), [visibleActive, q]);
  const name = user?.fullName ?? "Administrator";
  const role = user?.role ?? "ADMIN";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");

  async function logout() {
    if (AUTH_ENABLED) {
      try {
        await api("/auth/logout", { method: "POST" });
      } catch {
        /* ignore */
      }
    }
    clearToken();
    router.replace("/login");
  }

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-[1px] lg:hidden" onClick={onMobileClose} />}
      <aside className={clsx("fixed inset-y-0 left-0 z-40 flex transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <Rail active={visibleActive} modules={visibleModules} onNavigate={() => setQuery("")} />

        {!collapsed && (
          <div className="flex h-full w-[254px] flex-col border-r border-slate-200 bg-white dark:border-ink-700 dark:bg-ink-900">
            {/* brand + module heading */}
            <div className="border-b border-slate-200 px-3.5 pb-3 pt-3.5 dark:border-ink-700">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{APP}</p>
                  <p className="truncate text-[10.5px] text-slate-400 dark:text-slate-500">{TAGLINE}</p>
                </div>
                <button onClick={onToggleCollapsed} title="Hide menu" className="hidden rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-ink-800 dark:hover:text-slate-200 lg:block">
                  <PanelLeftClose className="h-4 w-4" />
                </button>
                <button onClick={onMobileClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Close menu">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100/40 px-3 py-2 dark:from-brand-500/10 dark:to-brand-500/5">
                  <p className="text-[12.5px] font-bold text-brand-800 dark:text-brand-200">{visibleActive.title}</p>
                  <p className="truncate text-[10.5px] text-brand-700/70 dark:text-brand-300/70">{visibleActive.subtitle}</p>
              </div>
              <div className="relative mt-2.5">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${visibleActive.label} menu…`}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-[12px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:border-ink-700 dark:bg-ink-850 dark:text-slate-200 dark:focus:bg-ink-800"
                />
              </div>
            </div>

            {/* menu */}
            <nav className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-2.5 py-2.5">
              {items.map((it) => (
                <Group key={it.label} item={it} cur={cur} badge={actionable} query={q} moduleKey={visibleActive.key} />
              ))}
              {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-400">No menu item matches “{query}”.</p>}
            </nav>

            {/* user + actions */}
            <div className="border-t border-slate-200 p-2.5 dark:border-ink-700">
              <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-ink-850">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-[11px] font-bold text-white">{initials}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{name}</p>
                  <p className="truncate text-[10.5px] text-slate-400 dark:text-slate-500">{role}</p>
                </div>
                <Link href="/settings" title="Settings" className="rounded-md p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-ink-800 dark:hover:text-slate-200">
                  <Settings className="h-4 w-4" />
                </Link>
                <button onClick={logout} title="Logout" className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {collapsed && (
        <button
          onClick={onToggleCollapsed}
          title="Show menu"
          className="fixed bottom-4 left-[80px] z-40 hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-brand-600 dark:border-ink-700 dark:bg-ink-800 dark:text-slate-300 lg:block"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}
    </>
  );
}

export function Sidebar(props: { mobileOpen: boolean; onMobileClose: () => void; collapsed: boolean; onToggleCollapsed: () => void }) {
  return (
    <Suspense>
      <SidebarInner {...props} />
    </Suspense>
  );
}
