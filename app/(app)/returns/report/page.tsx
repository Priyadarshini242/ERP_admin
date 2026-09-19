"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { FilterBar } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/components/ThemeProvider";
import { Card, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { fmtDate, isoDate, money, moneyCompact, n, qty, titleCase } from "@/lib/format";
import { DEMO_RETURNS_REPORT } from "@/lib/demo";
import { useFetch } from "@/lib/hooks";

interface Report {
  summary: { salesReturns: { count: number; amount: string }; purchaseReturns: { count: number; amount: string } };
  byReason: { reason: string; sales: number; purchase: number; salesAmount: string; purchaseAmount: string }[];
  byProduct: { productId: number; sku: string; name: string; salesQty: string; purchaseQty: string; amount: string }[];
  monthly: { month: string; salesReturns: string; purchaseReturns: string }[];
  recent: { type: string; id: number; no: string; date: string; party: string; reason: string; amount: string }[];
}

// Two series -> categorical slots 1 & 2 from the dataviz reference palette; legend + direct labels via tooltip
const SERIES = { light: { sales: "#2a78d6", purchase: "#eb6834" }, dark: { sales: "#3987e5", purchase: "#d95926" } };

function monthsAgo(k: number) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - k, 1);
  return isoDate(d);
}

export default function ReturnsReportPage() {
  const [from, setFrom] = useState(monthsAgo(5));
  const [to, setTo] = useState(isoDate());
  const { data, loading, error } = useFetch<Report>("/returns/report", { from, to }, [], DEMO_RETURNS_REPORT);
  const { theme } = useTheme();
  const colors = theme === "dark" ? SERIES.dark : SERIES.light;
  const GRID = theme === "dark" ? "#1c2740" : "#e5e7eb";
  const AXIS_TEXT = theme === "dark" ? "#94a3b8" : "#64748b";

  const chart = (data?.monthly ?? []).map((m) => ({ month: m.month, "Sales returns": n(m.salesReturns), "Purchase returns": n(m.purchaseReturns) }));

  return (
    <div>
      <PageHeader title="Returns Report" subtitle="Sales vs purchase returns by month, reason and product" />
      <FilterBar>
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </FilterBar>

      {loading && !data ? (
        <Spinner />
      ) : error || !data ? (
        <p className="text-red-600 dark:text-red-400">{error ?? "No data"}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Sales returns" value={moneyCompact(data.summary.salesReturns.amount)} sub={`${data.summary.salesReturns.count} documents`} />
            <Tile label="Purchase returns" value={moneyCompact(data.summary.purchaseReturns.amount)} sub={`${data.summary.purchaseReturns.count} documents`} />
            <Tile label="Net stock effect" value={`${data.summary.salesReturns.count - data.summary.purchaseReturns.count >= 0 ? "+" : ""}${data.summary.salesReturns.count - data.summary.purchaseReturns.count}`} sub="returns in − returns out" />
            <Tile label="Top reason" value={titleCase([...data.byReason].sort((a, b) => b.sales + b.purchase - (a.sales + a.purchase))[0]?.reason) || "—"} sub="by document count" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="Monthly returns value" className="lg:col-span-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={8} barGap={2}>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={{ stroke: GRID }} />
                    <YAxis tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => moneyCompact(v)} />
                    <Tooltip formatter={(v) => money(v as number)} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID, background: theme === "dark" ? "#0f1729" : "#fff", color: theme === "dark" ? "#e2e8f0" : "#0f172a" }} cursor={{ fill: "rgba(42,120,214,0.06)" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Sales returns" fill={colors.sales} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Purchase returns" fill={colors.purchase} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="By reason" padded={false}>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-ink-800/70 text-xs uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-right">Sales</th>
                    <th className="px-3 py-2 text-right">Purchase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-ink-700">
                  {data.byReason.map((r) => (
                    <tr key={r.reason}>
                      <td className="px-3 py-2">{titleCase(r.reason)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.sales} · {moneyCompact(r.salesAmount)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.purchase} · {moneyCompact(r.purchaseAmount)}
                      </td>
                    </tr>
                  ))}
                  {data.byReason.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-slate-400 dark:text-slate-500">
                        No posted returns in this range
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Most returned products" padded={false}>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-ink-800/70 text-xs uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-right">From customers</th>
                    <th className="px-3 py-2 text-right">To vendors</th>
                    <th className="px-3 py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-ink-700">
                  {data.byProduct.map((p) => (
                    <tr key={p.productId}>
                      <td className="px-3 py-2">
                        {p.name} <span className="text-xs text-slate-400 dark:text-slate-500">{p.sku}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{qty(p.salesQty)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qty(p.purchaseQty)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(p.amount)}</td>
                    </tr>
                  ))}
                  {data.byProduct.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-400 dark:text-slate-500">
                        Nothing returned yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            <Card title="Recent returns" padded={false}>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-ink-800/70 text-xs uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">No.</th>
                    <th className="px-3 py-2 text-left">Party</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-ink-700">
                  {data.recent.map((r) => (
                    <tr key={`${r.type}-${r.id}`}>
                      <td className="px-3 py-2">
                        <StatusBadge value={r.type === "SALES" ? "IN" : "OUT"} /> <span className="font-medium">{r.no}</span>
                      </td>
                      <td className="px-3 py-2">
                        {r.party} <span className="text-xs text-slate-400 dark:text-slate-500">· {titleCase(r.reason)}</span>
                      </td>
                      <td className="px-3 py-2">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-850 p-4 shadow-sm">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}
