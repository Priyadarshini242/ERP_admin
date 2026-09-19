"use client";

import clsx from "clsx";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Package,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/components/ThemeProvider";
import { Card, Pill, Select, Spinner } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { DEMO_DASHBOARD } from "@/lib/demo";
import { count, fmtDate, fmtLongDate, money, money0, moneyCompact, n, qty } from "@/lib/format";
import { useFetch } from "@/lib/hooks";

type Summary = typeof DEMO_DASHBOARD;

// Two categorical series: Sales = slot 1 blue, Purchase = slot 3 aqua-green (dataviz reference palette).
const SERIES = { light: { sales: "#2a78d6", purchase: "#1baf7a" }, dark: { sales: "#3987e5", purchase: "#199e70" } };

export default function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, loading, error, reload, demo } = useFetch<Summary>("/dashboard/summary", { year }, [], DEMO_DASHBOARD);
  const { theme } = useTheme();
  const colors = theme === "dark" ? SERIES.dark : SERIES.light;
  const [firstName, setFirstName] = useState("Admin");
  useEffect(() => {
    const u = getUser();
    if (u?.fullName) setFirstName(u.fullName.split(" ").filter((w) => w.length > 2)[0] ?? u.fullName);
  }, []);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <p className="text-red-600">{error ?? "No data"}</p>;

  const chart = data.monthlySeries.map((m) => ({ month: m.month, Sales: n(m.sales), Purchase: n(m.purchase) }));
  const gridColor = theme === "dark" ? "#1c2740" : "#e5e7eb";
  const axisColor = theme === "dark" ? "#94a3b8" : "#64748b";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Welcome back, {firstName}! Here&apos;s your business overview for today.
            {demo && <Pill tone="warning" className="ml-2 align-middle">offline · demo data</Pill>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="card flex h-10 items-center gap-2 px-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {fmtLongDate()}
          </span>
          <button onClick={reload} title="Refresh" className="card flex h-10 w-10 items-center justify-center text-slate-500 hover:text-brand-600 dark:text-slate-400">
            <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Kpi label="Total Sales" value={money0(data.sales.month)} delta={data.sales.growthPct} icon={ShoppingCart} tone="blue" href="/sales/register" />
        <Kpi label="Total Purchase" value={money0(data.purchases.month)} delta={data.purchases.growthPct} icon={Truck} tone="green" href="/purchase/register" />
        <Kpi label="Stock Value" value={money0(data.inventory.value)} delta={null} sub={`${count(data.counts.products)} products`} icon={Package} tone="amber" href="/inventory/stock/management" />
      </div>
      {/* KPI row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Kpi label="Total Customers" value={count(data.counts.customers)} delta={data.counts.customersGrowthPct} icon={Users} tone="violet" href="/masters/parties?role=customer" />
        <Kpi label="Total Suppliers" value={count(data.counts.suppliers)} delta={data.counts.suppliersGrowthPct} icon={UserRound} tone="rose" href="/masters/parties?role=vendor" />
      </div>

      {/* Chart */}
      <Card
        title="Sales & Purchase Overview"
        actions={
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-4 text-xs text-slate-600 dark:text-slate-300 sm:flex">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors.sales }} /> Sales</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors.purchase }} /> Purchase</span>
            </div>
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-8 w-auto py-1 text-xs">
              {[0, 1, 2].map((k) => {
                const y = new Date().getFullYear() - k;
                return (
                  <option key={y} value={y}>
                    {k === 0 ? "This Year" : y}
                  </option>
                );
              })}
            </Select>
          </div>
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.sales} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.sales} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gPurchase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.purchase} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.purchase} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={{ stroke: gridColor }} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))} />
              <Tooltip
                formatter={(v, name) => [money(v as number), String(name)]}
                labelFormatter={(l) => `${l} ${year}`}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: gridColor, background: theme === "dark" ? "#0f1729" : "#fff", color: theme === "dark" ? "#e2e8f0" : "#0f172a" }}
                cursor={{ stroke: gridColor }}
              />
              <Area type="monotone" dataKey="Sales" stroke={colors.sales} strokeWidth={2} fill="url(#gSales)" dot={{ r: 3, strokeWidth: 2, fill: theme === "dark" ? "#0f1729" : "#fff" }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="Purchase" stroke={colors.purchase} strokeWidth={2} fill="url(#gPurchase)" dot={{ r: 3, strokeWidth: 2, fill: theme === "dark" ? "#0f1729" : "#fff" }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent tables */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Recent Sales" actions={<ViewAll href="/sales/register" />} padded={false}>
          <MiniTable
            head={["#", "Date", "Customer", "Type", "Amount", "Status"]}
            rows={data.recentInvoices.map((i, idx) => [
              idx + 1,
              fmtDate(i.invoiceDate),
              <span key="c" className="font-medium text-slate-800 dark:text-slate-100">{i.customer}</span>,
              <StatusBadge key="t" value={i.customerType} />,
              <span key="a" className="tabular-nums">{money0(i.grandTotal)}</span>,
              <StatusBadge key="s" value={i.status} />,
            ])}
            align={[undefined, undefined, undefined, undefined, "right", undefined]}
            empty="No sales yet"
          />
        </Card>
        <Card title="Recent Purchase" actions={<ViewAll href="/purchase/register" />} padded={false}>
          <MiniTable
            head={["#", "Date", "Supplier", "Amount", "Status"]}
            rows={data.recentBills.map((b, idx) => [
              idx + 1,
              fmtDate(b.invoiceDate),
              <span key="v" className="font-medium text-slate-800 dark:text-slate-100">{b.vendor}</span>,
              <span key="a" className="tabular-nums">{money0(b.grandTotal)}</span>,
              <StatusBadge key="s" value={b.status} />,
            ])}
            align={[undefined, undefined, undefined, "right", undefined]}
            empty="No purchases yet"
          />
        </Card>
      </div>

      {/* Stock alerts + quick actions */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Stock Alerts" actions={<ViewAll href="/inventory/stock/management?lowStock=true" />} padded={false}>
          <MiniTable
            head={["Product", "SKU", "Current Stock", "Status"]}
            rows={data.stockAlerts.map((a) => [
              <span key="p" className="font-medium text-slate-800 dark:text-slate-100">{a.name}</span>,
              <span key="k" className="font-mono text-xs">{a.sku}</span>,
              <span key="q" className="tabular-nums">{qty(a.quantity)} {a.unit}</span>,
              <StatusBadge key="s" value={a.status} />,
            ])}
            align={[undefined, undefined, "right", undefined]}
            empty="Stock levels are healthy"
          />
        </Card>
        <Card title="Quick Actions">
          <div className="grid grid-cols-3 gap-3">
            <Quick href="/sales/register/new?type=B2B" label="New Sales (B2B)" icon={ShoppingCart} tone="blue" />
            <Quick href="/sales/register/new?type=B2C" label="New Sales (B2C)" icon={ShoppingCart} tone="green" />
            <Quick href="/purchase/register/new" label="New Purchase" icon={ShoppingBag} tone="violet" />
            <Quick href="/inventory/stock/adjustment" label="Stock Adjustment" icon={SlidersHorizontal} tone="rose" />
            <Quick href="/register/ac-ledger" label="View AC Ledger" icon={BookOpen} tone="teal" />
            <Quick href="/register/reports" label="Generate Report" icon={BarChart3} tone="indigo" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <Mini label="Receivables" value={moneyCompact(data.receivables.total)} tone={n(data.receivables.overdue) > 0 ? "danger" : undefined} />
            <Mini label="Payables" value={moneyCompact(data.payables.total)} />
            <Mini label="Open orders" value={`${data.orders.openSalesOrders} SO · ${data.orders.openPurchaseOrders} PO`} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────── pieces ─────────────────────────

const TONES = {
  blue: { bg: "bg-blue-50 dark:bg-ink-850", ring: "border-blue-100 dark:border-ink-700", icon: "bg-blue-100 text-blue-600 dark:bg-blue-600 dark:text-white" },
  green: { bg: "bg-emerald-50 dark:bg-ink-850", ring: "border-emerald-100 dark:border-ink-700", icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-600 dark:text-white" },
  amber: { bg: "bg-amber-50 dark:bg-ink-850", ring: "border-amber-100 dark:border-ink-700", icon: "bg-amber-100 text-amber-600 dark:bg-amber-500 dark:text-white" },
  violet: { bg: "bg-violet-50 dark:bg-ink-850", ring: "border-violet-100 dark:border-ink-700", icon: "bg-violet-100 text-violet-600 dark:bg-violet-600 dark:text-white" },
  rose: { bg: "bg-rose-50 dark:bg-ink-850", ring: "border-rose-100 dark:border-ink-700", icon: "bg-rose-100 text-rose-600 dark:bg-rose-600 dark:text-white" },
  teal: { bg: "bg-teal-50 dark:bg-ink-850", ring: "border-teal-100 dark:border-ink-700", icon: "bg-teal-100 text-teal-600 dark:bg-teal-600 dark:text-white" },
  indigo: { bg: "bg-indigo-50 dark:bg-ink-850", ring: "border-indigo-100 dark:border-ink-700", icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-600 dark:text-white" },
};
type Tone = keyof typeof TONES;

function Kpi({ label, value, delta, sub, icon: Icon, tone, href }: { label: string; value: string; delta: number | null; sub?: string; icon: LucideIcon; tone: Tone; href: string }) {
  const t = TONES[tone];
  return (
    <Link href={href} className={clsx("flex items-center gap-4 rounded-xl border p-4 shadow-card transition hover:-translate-y-px hover:shadow-md", t.bg, t.ring)}>
      <span className={clsx("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", t.icon)}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className="block truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs">
          {delta !== null && delta !== undefined ? (
            <>
              <span className={clsx("inline-flex items-center font-semibold", delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(delta).toFixed(0)}%
              </span>
              <span className="text-slate-400 dark:text-slate-500">vs last month</span>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">{sub ?? "at cost"}</span>
          )}
        </span>
      </span>
    </Link>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">
      View All ›
    </Link>
  );
}

function MiniTable({ head, rows, align = [], empty }: { head: string[]; rows: React.ReactNode[][]; align?: (string | undefined)[]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="thead">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={clsx("th", align[i] === "right" && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y-ui">
          {rows.map((r, i) => (
            <tr key={i} className="row-hover">
              {r.map((c, j) => (
                <td key={j} className={clsx("td py-2.5", align[j] === "right" && "text-right")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="px-3 py-8 text-center text-slate-400">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Quick({ href, label, icon: Icon, tone }: { href: string; label: string; icon: LucideIcon; tone: Tone }) {
  const t = TONES[tone];
  return (
    <Link href={href} className={clsx("flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition hover:-translate-y-px hover:shadow-md", t.bg, t.ring)}>
      <span className={clsx("flex h-11 w-11 items-center justify-center rounded-lg", t.icon)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-medium leading-tight text-slate-700 dark:text-slate-200">{label}</span>
    </Link>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-lg border border-slate-200 px-2 py-2 dark:border-ink-700">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={clsx("mt-0.5 truncate text-sm font-semibold", tone === "danger" ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-100")}>{value}</p>
    </div>
  );
}
