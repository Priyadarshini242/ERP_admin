"use client";

import clsx from "clsx";
import { ArrowUpRight, CalendarDays, Package, RefreshCw, ShoppingCart, Truck, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pill, Spinner } from "@/components/ui";
import { DEMO_DASHBOARD } from "@/lib/demo";
import { fmtDate, fmtLongDate, money0, n } from "@/lib/format";
import { useFetch } from "@/lib/hooks";

type Summary = typeof DEMO_DASHBOARD;

export default function DashboardPage() {
  const { data, loading, error, reload, demo } = useFetch<Summary>("/dashboard/summary", { year: new Date().getFullYear() }, [], DEMO_DASHBOARD);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <p className="text-red-600">{error ?? "No dashboard data"}</p>;
  const chart = data.monthlySeries.map((row) => ({ month: row.month, sales: n(row.sales), purchase: n(row.purchase) }));
  const metrics = [
    ["Total Sales", money0(data.sales.month), `${data.sales.growthPct}% vs last month`, ShoppingCart, "blue", "/sales/register"], ["Total Purchase", money0(data.purchases.month), `${data.purchases.growthPct}% vs last month`, Truck, "green", "/purchase/register"], ["Stock Value", money0(data.inventory.value), `${data.counts.products} products`, Package, "amber", "/inventory/stock/management"], ["Total Customers", data.counts.customers.toLocaleString("en-IN"), `${data.counts.customersGrowthPct}% vs last month`, Users, "violet", "/masters/parties?role=customer"], ["Total Suppliers", data.counts.suppliers.toLocaleString("en-IN"), `${data.counts.suppliersGrowthPct}% vs last month`, Users, "rose", "/masters/parties?role=vendor"],
  ] as const;
  return <div className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1><p className="mt-0.5 text-sm text-slate-500">Welcome back, Administrator! Here&apos;s your business overview for today. {demo && <Pill tone="warning">offline · demo data</Pill>}</p></div><div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:flex dark:border-ink-700 dark:bg-ink-900"><CalendarDays className="h-4 w-4" />{fmtLongDate()}</span><button onClick={reload} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 dark:border-ink-700 dark:bg-ink-900"><RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} /></button></div></header>
    <section className="grid gap-3 md:grid-cols-3">{metrics.slice(0, 3).map(([label, value, note, Icon, tone, href]) => <Metric key={label} label={label} value={value} note={note} Icon={Icon} tone={tone} href={href} />)}</section>
    <section className="grid gap-3 md:grid-cols-2">{metrics.slice(3).map(([label, value, note, Icon, tone, href]) => <Metric key={label} label={label} value={value} note={note} Icon={Icon} tone={tone} href={href} />)}</section>
    <Card title="Sales & Purchase Overview"><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 8, right: 8, left: -12 }}><defs><linearGradient id="sales" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity=".3" /><stop offset="1" stopColor="#3b82f6" stopOpacity=".02" /></linearGradient><linearGradient id="purchase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".25" /><stop offset="1" stopColor="#10b981" stopOpacity=".02" /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8eef6" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${v / 1000}K`} /><Tooltip formatter={(v) => money0(v as number)} /><Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fill="url(#sales)" /><Area type="monotone" dataKey="purchase" stroke="#10b981" strokeWidth={2.5} fill="url(#purchase)" /></AreaChart></ResponsiveContainer></div></Card>
    <section className="grid gap-4 xl:grid-cols-2"><Activity title="Recent Sales" href="/sales/register" rows={data.recentInvoices.map((x) => ({ date: x.invoiceDate, party: x.customer, amount: x.grandTotal, status: x.status }))} /><Activity title="Recent Purchase" href="/purchase/register" rows={data.recentBills.map((x) => ({ date: x.invoiceDate, party: x.vendor, amount: x.grandTotal, status: x.status }))} /><Stock rows={data.stockAlerts} /><FastMovingProductsWithPO products={data.topProducts} lowStockIds={data.stockAlerts.map((stock) => stock.productId)} /></section>
  </div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-ink-700 dark:bg-ink-900"><div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold dark:border-ink-700">{title}</div><div className="p-4">{children}</div></section>; }
function Metric({ label, value, note, Icon, tone, href }: { label: string; value: string; note: string; Icon: typeof ShoppingCart; tone: string; href: string }) { const colors: Record<string, string> = { blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600", rose: "bg-rose-50 text-rose-600" }; return <Link href={href} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-ink-700 dark:bg-ink-900"><span className={clsx("flex h-12 w-12 items-center justify-center rounded-xl", colors[tone])}><Icon className="h-6 w-6" /></span><span><small className="text-slate-500">{label}</small><strong className="block text-2xl tracking-tight">{value}</strong><small className="flex items-center text-emerald-600"><ArrowUpRight className="h-3 w-3" />{note}</small></span></Link>; }
function Activity({ title, href, rows }: { title: string; href: string; rows: { date: string; party: string; amount: string; status: string }[] }) { return <Card title={title}><Link href={href} className="float-right -mt-9 text-xs font-semibold text-brand-600">View All ›</Link><table className="w-full text-left text-xs"><thead className="text-[10px] uppercase text-slate-400"><tr><th className="py-2">Date</th><th>{title === "Recent Sales" ? "Customer" : "Supplier"}</th><th className="text-right">Amount</th><th>Status</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-slate-100 dark:border-ink-800"><td className="py-2.5 text-slate-500">{fmtDate(r.date)}</td><td className="font-medium">{r.party}</td><td className="text-right">{money0(r.amount)}</td><td><Pill tone={r.status === "DRAFT" ? "neutral" : "success"}>{r.status === "DRAFT" ? "Draft" : "Completed"}</Pill></td></tr>)}</tbody></table></Card>; }
function Stock({ rows }: { rows: Summary["stockAlerts"] }) { return <Card title="Stock Alerts"><table className="w-full text-left text-xs"><thead className="text-[10px] uppercase text-slate-400"><tr><th className="py-2">Product</th><th>SKU</th><th className="text-right">Stock</th><th>Status</th></tr></thead><tbody>{rows.map((r) => <tr key={r.productId} className="border-t border-slate-100 dark:border-ink-800"><td className="py-2.5 font-medium">{r.name}</td><td className="font-mono text-slate-500">{r.sku}</td><td className="text-right">{r.quantity} {r.unit}</td><td><Pill tone={r.status === "OUT" ? "danger" : "warning"}>{r.status === "OUT" ? "Out of Stock" : "Low Stock"}</Pill></td></tr>)}</tbody></table></Card>; }
function FastMovingProducts({ products }: { products: Summary["topProducts"] }) { const max = Math.max(...products.map((product) => product.quantitySold), 1); return <Card title="Fast Moving Products"><Link href="/masters/products" className="float-right -mt-9 text-xs font-semibold text-brand-600">View products ›</Link><p className="mb-3 text-xs text-slate-500">Best-selling products by quantity sold this month.</p><div className="space-y-3">{products.map((product, index) => <Link href="/masters/products" key={product.productId} className="group flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10">{index + 1}</span><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-xs">{product.name}</strong><span className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200">{product.quantitySold.toLocaleString("en-IN")} sold</span></span><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800"><span className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-sky-400" style={{ width: `${product.quantitySold / max * 100}%` }} /></span><small className="mt-1 flex items-center gap-1 text-slate-400"><TrendingUp className="h-3 w-3 text-emerald-500" />{product.sku} · {money0(product.revenue)}</small></span></Link>)}</div></Card>; }
function PurchaseSuggestion({ products }: { products: Summary["topProducts"] }) {
  return (
    <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm dark:border-brand-500/20 dark:from-brand-500/10 dark:to-ink-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Purchase replenishment</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a separate PO for each fast-moving, low-stock product.</p>
        </div>
        <span className="rounded-xl bg-brand-100 p-2 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300"><ShoppingCart className="h-5 w-5" /></span>
      </div>
      <div className="mt-4 space-y-2">
        {products.map((product) => (
          <div key={product.productId} className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white/80 px-3 py-2.5 dark:border-ink-700 dark:bg-ink-900/70">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{product.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{product.sku} · {product.quantitySold.toLocaleString("en-IN")} sold · Qty 50</p></div>
            <Link href={`/purchase/orders/new?products=${product.productId}&quantity=50&source=dashboard`} className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700">Create PO</Link>
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No fast-moving products currently need replenishment.</p>}
      </div>
    </section>
  );
}
function FastMovingProductsWithPO({ products, lowStockIds }: { products: Summary["topProducts"]; lowStockIds: number[] }) {
  const max = Math.max(...products.map((product) => product.quantitySold), 1);
  const lowStock = new Set(lowStockIds);
  return (
    <Card title="Fast Moving Products">
      <Link href="/masters/products" className="float-right -mt-9 text-xs font-semibold text-brand-600">View products ›</Link>
      <p className="mb-3 text-xs text-slate-500">Best-selling products by quantity sold this month. Low-stock items can be ordered directly at a default quantity of 50.</p>
      <div className="space-y-3">
        {products.map((product, index) => {
          const needsReorder = lowStock.has(product.productId);
          return (
            <div key={product.productId} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2"><strong className="truncate text-xs">{product.name}</strong><span className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200">{product.quantitySold.toLocaleString("en-IN")} sold</span></div>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800"><span className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-sky-400" style={{ width: `${product.quantitySold / max * 100}%` }} /></span>
                <small className="mt-1 flex items-center gap-1 text-slate-400"><TrendingUp className="h-3 w-3 text-emerald-500" />{product.sku} · {money0(product.revenue)}{needsReorder && <span className="font-semibold text-amber-600">· low stock</span>}</small>
              </div>
              {needsReorder ? <Link href={`/purchase/orders/new?products=${product.productId}&quantity=50&source=dashboard`} className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700">Create PO</Link> : <Link href="/masters/products" className="shrink-0 text-xs font-semibold text-brand-600">View</Link>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
