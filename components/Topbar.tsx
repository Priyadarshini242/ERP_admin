"use client";

import clsx from "clsx";
import { Bell, CheckCircle2, ChevronDown, LogOut, Menu, Moon, Search, Settings, Sun, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api";
import { AUTH_ENABLED, clearToken, getUser, type AuthUser } from "@/lib/auth";
import { demoFor } from "@/lib/demo";
import { flattenNav } from "@/lib/nav";

import { useTheme } from "./ThemeProvider";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [alerts, setAlerts] = useState<{ lowStockCount: number; outOfStockCount: number } | null>(null);
  const [approvals, setApprovals] = useState<{ actionable: number; rejected: number; pending: number } | null>(null);
  const [menu, setMenu] = useState<"user" | "bell" | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
    api<{ lowStockCount: number; outOfStockCount: number }>("/inventory/stock/summary")
      .then(setAlerts)
      .catch(() => setAlerts(null));
    const loadApprovals = () =>
      api<{ actionable: number; rejected: number; pending: number }>("/approvals/summary")
        .then(setApprovals)
        .catch(() => setApprovals(demoFor("/approvals/summary") as { actionable: number; rejected: number; pending: number } | null));
    loadApprovals();
    window.addEventListener("approvals:changed", loadApprovals);
    window.addEventListener("focus", loadApprovals);
    return () => {
      window.removeEventListener("approvals:changed", loadApprovals);
      window.removeEventListener("focus", loadApprovals);
    };
  }, []);

  // Ctrl/Cmd + K opens the search palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const name = user?.fullName ?? "Administrator";
  const role = user?.role ?? "ADMIN";
  const alertCount = (alerts?.lowStockCount ?? 0) + (alerts?.outOfStockCount ?? 0) + (approvals?.actionable ?? 0) + (approvals?.rejected ?? 0);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-ink-700 dark:bg-ink-900/90 sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-800 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <button
        onClick={() => setPaletteOpen(true)}
        className="flex h-10 w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 transition hover:border-slate-300 dark:border-ink-700 dark:bg-ink-800 dark:text-slate-500 dark:hover:border-ink-700"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search anything… </span>
        <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-ink-700 dark:bg-ink-900 dark:text-slate-400 sm:inline">Ctrl + K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* Theme */}
        <button onClick={toggle} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-800">
          {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setMenu(menu === "bell" ? null : "bell")} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-800" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{alertCount > 99 ? "99+" : alertCount}</span>
            )}
          </button>
          {menu === "bell" && (
            <Dropdown onClose={() => setMenu(null)} className="w-72">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Notifications</p>
              {approvals && (
                <>
                  <DropdownLink href="/approvals" onClick={() => setMenu(null)}>
                    <span className="flex-1">Awaiting your approval</span>
                    <span className="rounded-full bg-amber-100 px-2 text-[11px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{approvals.actionable}</span>
                  </DropdownLink>
                  <DropdownLink href="/approvals?status=APPROVED" onClick={() => setMenu(null)}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="flex-1">Approved documents</span>
                  </DropdownLink>
                  {approvals.rejected > 0 && (
                    <DropdownLink href="/approvals?status=REJECTED" onClick={() => setMenu(null)}>
                      <span className="flex-1">Rejected — needs attention</span>
                      <span className="rounded-full bg-red-100 px-2 text-[11px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">{approvals.rejected}</span>
                    </DropdownLink>
                  )}
                </>
              )}
              {alerts ? (
                <>
                  <DropdownLink href="/inventory/stock/management?lowStock=true" onClick={() => setMenu(null)}>
                    <span className="flex-1">Low-stock products</span>
                    <span className="rounded-full bg-amber-100 px-2 text-[11px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{alerts.lowStockCount}</span>
                  </DropdownLink>
                  <DropdownLink href="/inventory/stock/management?lowStock=true" onClick={() => setMenu(null)}>
                    <span className="flex-1">Out of stock</span>
                    <span className="rounded-full bg-red-100 px-2 text-[11px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">{alerts.outOfStockCount}</span>
                  </DropdownLink>
                </>
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">API not reachable</p>
              )}
            </Dropdown>
          )}
        </div>

        {/* User */}
        <div className="relative">
          <button onClick={() => setMenu(menu === "user" ? null : "user")} className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100 dark:hover:bg-ink-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initials(name) || "U"}</span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-slate-800 dark:text-slate-100">{name}</span>
              <span className="block text-[11px] leading-tight text-slate-500 dark:text-slate-400">{role.charAt(0) + role.slice(1).toLowerCase()}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>
          {menu === "user" && (
            <Dropdown onClose={() => setMenu(null)}>
              <div className="border-b border-slate-100 px-3 py-2 dark:border-ink-700">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email ?? "admin@erp.local"}</p>
              </div>
              <DropdownLink href="/settings" onClick={() => setMenu(null)}>
                <UserCircle2 className="h-4 w-4" /> Profile & settings
              </DropdownLink>
              <DropdownLink href="/settings" onClick={() => setMenu(null)}>
                <Settings className="h-4 w-4" /> Preferences
              </DropdownLink>
              <button onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </Dropdown>
          )}
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}

function Dropdown({ children, onClose, className }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className={clsx("card absolute right-0 z-40 mt-2 w-56 overflow-hidden py-1 shadow-lg", className)}>{children}</div>
    </>
  );
}

function DropdownLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-ink-800">
      {children}
    </Link>
  );
}

/** Ctrl+K page search over the navigation tree. */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const pages = useMemo(() => flattenNav(), []);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? pages.filter((p) => p.label.toLowerCase().includes(s) || p.path.toLowerCase().includes(s)) : pages;
    return list.slice(0, 12);
  }, [q, pages]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 pt-[12vh] backdrop-blur-[2px]" onClick={onClose}>
      <div className="card w-full max-w-lg overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 dark:border-ink-700">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setIdx((i) => Math.min(i + 1, results.length - 1));
              else if (e.key === "ArrowUp") setIdx((i) => Math.max(i - 1, 0));
              else if (e.key === "Enter" && results[idx]) go(results[idx].href);
              else if (e.key === "Escape") onClose();
            }}
            placeholder="Jump to a page…"
            className="h-12 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-ink-700">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {results.map((r, i) => (
            <li key={r.href}>
              <button
                onMouseEnter={() => setIdx(i)}
                onClick={() => go(r.href)}
                className={clsx("flex w-full items-center justify-between px-4 py-2 text-left text-sm", i === idx ? "bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-200" : "text-slate-700 dark:text-slate-200")}
              >
                <span>{r.label}</span>
                <span className="text-xs text-slate-400">{r.path}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">No matching page</li>}
        </ul>
      </div>
    </div>
  );
}
