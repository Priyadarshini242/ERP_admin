"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("erp_sidebar") === "collapsed");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem("erp_sidebar", c ? "expanded" : "collapsed");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <div className={clsx("flex min-w-0 flex-1 flex-col transition-[padding]")}>
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
        <footer className="flex items-center justify-between px-6 py-3 text-[11px] text-slate-400 dark:text-slate-500">
          <span>© {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME ?? "QuickERP"}</span>
          <span>Modern ERP · Simple · Scalable · Efficient</span>
        </footer>
      </div>
    </div>
  );
}
