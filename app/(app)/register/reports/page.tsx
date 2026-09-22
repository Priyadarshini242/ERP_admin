"use client";

import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { DataTable, FilterBar } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Card, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { fmtDate, isoDate, money, n, titleCase } from "@/lib/format";
import { useFetch } from "@/lib/hooks";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TABS = [
  { key: "trial-balance", label: "Trial Balance" },
  { key: "day-book", label: "Day Book" },
  { key: "outstanding", label: "Receivables / Payables" },
  { key: "sales-summary", label: "Sales Summary" },
  { key: "purchase-summary", label: "Purchase Summary" },
  { key: "gst-summary", label: "GST Summary" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function monthStart() {
  const d = new Date();
  return isoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

function ReportsPageInner() {
  const params = useSearchParams();
  const requestedTab = TABS.some((t) => t.key === params.get("tab")) ? (params.get("tab") as Tab) : "trial-balance";
  const [tab, setTab] = useState<Tab>(requestedTab);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(isoDate());
  const [asOf, setAsOf] = useState(isoDate());
  const [type, setType] = useState<"receivable" | "payable">(params.get("type") === "payable" ? "payable" : "receivable");

  // A sidebar link changes the query string without unmounting this page.
  // Sync the report view with that URL so every sidebar entry works.
  useEffect(() => {
    setTab(requestedTab);
    setType(params.get("type") === "payable" ? "payable" : "receivable");
  }, [params, requestedTab]);

  const query =
    tab === "trial-balance" ? { asOf } : tab === "outstanding" ? { type, asOf } : { from, to };
  const { data, loading, error } = useFetch<any>(`/register/reports/${tab}`, query);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Accounting reports built from the double-entry ledger" />

      <FilterBar>
        {tab === "trial-balance" || tab === "outstanding" ? (
          <Field label="As of"><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field>
        ) : (
          <>
            <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </>
        )}
        {tab === "outstanding" && (
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as "receivable" | "payable")}>
              <option value="receivable">Receivables (customers)</option>
              <option value="payable">Payables (vendors)</option>
            </Select>
          </Field>
        )}
      </FilterBar>

      {error && <Alert kind="error" title={error} />}
      {loading && !data ? <Spinner /> : data ? <Report tab={tab} data={data} /> : null}
    </div>
  );
}

function Report({ tab, data }: { tab: Tab; data: any }) {
  switch (tab) {
    case "trial-balance":
      return (
        <DataTable
          columns={[
            { key: "code", header: "Code", render: (r: any) => <span className="font-mono text-xs">{r.code}</span> },
            { key: "name", header: "Ledger", render: (r: any) => <span className="font-medium text-slate-900 dark:text-white">{r.name}</span> },
            { key: "group", header: "Group", render: (r: any) => titleCase(r.group) },
            { key: "debit", header: "Debit", align: "right", render: (r: any) => (n(r.debit) ? money(r.debit) : "") },
            { key: "credit", header: "Credit", align: "right", render: (r: any) => (n(r.credit) ? money(r.credit) : "") },
          ]}
          rows={data.rows ?? []}
          empty="No balances yet"
          footer={
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right">Totals {n(data.totals?.difference) !== 0 && <span className="ml-2 text-red-600 dark:text-red-400">(difference {money(data.totals?.difference ?? 0)})</span>}</td>
              <td className="px-3 py-2 text-right">{money(data.totals?.debit ?? 0)}</td>
              <td className="px-3 py-2 text-right">{money(data.totals?.credit ?? 0)}</td>
            </tr>
          }
        />
      );

    case "day-book": {
      const vouchers = Array.isArray(data.vouchers) ? data.vouchers : [];
      const totals = data.totals ?? {};
      return (
        <div className="space-y-3">
          {vouchers.length === 0 && <p className="rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-850 p-8 text-center text-sm text-slate-400 dark:text-slate-500">No vouchers in this period</p>}
          {vouchers.map((v: any) => (
            <Card key={`${v.voucherType}-${v.voucherNo}`} title={<span>{fmtDate(v.entryDate)} · {titleCase(v.voucherType)} <span className="font-mono">{v.voucherNo}</span></span>} actions={<span className="text-xs text-slate-500 dark:text-slate-400">{money(v.debit)}</span>} padded={false}>
              <table className="min-w-full text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-ink-700">
                  {(v.lines ?? []).map((l: any) => (
                    <tr key={l.id}>
                      <td className="px-4 py-1.5"><span className="font-mono text-xs text-slate-400 dark:text-slate-500">{l.ledger.code}</span> {l.ledger.name}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums">{n(l.debit) ? money(l.debit) : ""}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums">{n(l.credit) ? money(l.credit) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {v.narration && <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{v.narration}</p>}
            </Card>
          ))}
          <p className="text-right text-sm text-slate-600 dark:text-slate-300">Period totals — Dr {money(totals.debit ?? 0)} · Cr {money(totals.credit ?? 0)}</p>
        </div>
      );
    }

    case "outstanding":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Tile label={`Total ${data.type}`} value={money(data.total)} />
            {Object.entries((data.ageing ?? {}) as Record<string, string>).map(([b, v]) => (
              <Tile key={b} label={`${b} days`} value={money(v)} tone={b === "90+" && n(v) > 0 ? "warn" : undefined} />
            ))}
          </div>
          <DataTable
            columns={[
              { key: "name", header: data.type === "receivable" ? "Customer" : "Vendor", render: (r: any) => <span className="font-medium text-slate-900 dark:text-white">{r.name}</span> },
              { key: "invoices", header: "Open docs", align: "right" },
              { key: "oldestDue", header: "Oldest due", render: (r: any) => fmtDate(r.oldestDue) },
              { key: "overdue", header: "Overdue", align: "right", render: (r: any) => <span className={n(r.overdue) > 0 ? "text-red-700 dark:text-red-400" : ""}>{money(r.overdue)}</span> },
              { key: "outstanding", header: "Outstanding", align: "right", render: (r: any) => <span className="font-medium">{money(r.outstanding)}</span> },
            ]}
            rows={data.parties ?? []}
            empty="Nothing outstanding"
          />
        </div>
      );

    case "sales-summary":
    case "purchase-summary":
      return (
        <DataTable
          columns={[
            { key: "month", header: "Month" },
            { key: "count", header: "Documents", align: "right" },
            { key: "taxable", header: "Taxable", align: "right", render: (r: any) => money(r.taxable) },
            { key: "tax", header: "Tax", align: "right", render: (r: any) => money(r.tax) },
            ...(tab === "sales-summary"
              ? [
                  { key: "b2b", header: "B2B", align: "right" as const, render: (r: any) => money(r.b2b) },
                  { key: "b2c", header: "B2C", align: "right" as const, render: (r: any) => money(r.b2c) },
                ]
              : []),
            { key: "total", header: "Total", align: "right", render: (r: any) => <span className="font-medium">{money(r.total)}</span> },
          ]}
          rows={data.months ?? []}
          empty="No posted documents in this period"
          footer={
            <tr>
              <td colSpan={tab === "sales-summary" ? 6 : 4} className="px-3 py-2 text-right">{data.count ?? 0} documents</td>
              <td className="px-3 py-2 text-right">{money(data.total ?? 0)}</td>
            </tr>
          }
        />
      );

    case "gst-summary": {
      const output = data.output ?? {};
      const input = data.input ?? {};
      const payable = data.payable ?? {};
      const row = (label: string, x: any, strong = false) => (
        <tr key={label} className={strong ? "font-semibold" : ""}>
          <td className="px-3 py-1.5">{label}</td>
          <td className="px-3 py-1.5 text-right tabular-nums">{money(x?.taxable ?? 0)}</td>
          <td className="px-3 py-1.5 text-right tabular-nums">{money(x?.cgst ?? 0)}</td>
          <td className="px-3 py-1.5 text-right tabular-nums">{money(x?.sgst ?? 0)}</td>
          <td className="px-3 py-1.5 text-right tabular-nums">{money(x?.igst ?? 0)}</td>
          <td className="px-3 py-1.5 text-right tabular-nums">{money(x?.tax ?? 0)}</td>
        </tr>
      );
      const head = (
        <thead className="bg-slate-50 dark:bg-ink-800/70 text-xs uppercase text-slate-500 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left">Source</th>
            <th className="px-3 py-2 text-right">Taxable</th>
            <th className="px-3 py-2 text-right">CGST</th>
            <th className="px-3 py-2 text-right">SGST</th>
            <th className="px-3 py-2 text-right">IGST</th>
            <th className="px-3 py-2 text-right">Total tax</th>
          </tr>
        </thead>
      );
      return (
        <div className="space-y-4">
          <Card title="Output tax (sales side)" padded={false}>
            <table className="min-w-full text-sm">{head}<tbody className="divide-y divide-slate-100 dark:divide-ink-700">{row("Sales invoices", output.sales)}{row("less Credit notes", output.creditNotes)}{row("less Sales returns", output.salesReturns)}{row("Net output", output.net, true)}</tbody></table>
          </Card>
          <Card title="Input tax credit (purchase side)" padded={false}>
            <table className="min-w-full text-sm">{head}<tbody className="divide-y divide-slate-100 dark:divide-ink-700">{row("Purchase bills", input.purchases)}{row("less Debit notes", input.debitNotes)}{row("less Purchase returns", input.purchaseReturns)}{row("Net input", input.net, true)}</tbody></table>
          </Card>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="CGST payable" value={money(payable.cgst ?? 0)} />
            <Tile label="SGST payable" value={money(payable.sgst ?? 0)} />
            <Tile label="IGST payable" value={money(payable.igst ?? 0)} />
            <Tile label="Net GST payable" value={money(payable.total ?? 0)} tone={n(payable.total) < 0 ? "good" : undefined} />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Negative net = input credit carried forward. <StatusBadge value="B2B" /> invoices need customer GSTIN for GSTR-1 reporting.</p>
        </div>
      );
    }
  }
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "warn" | "good" }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-850 p-4 shadow-sm">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={clsx("mt-1 text-xl font-semibold", tone === "warn" ? "text-red-700 dark:text-red-400" : tone === "good" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-white")}>{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsPageInner />
    </Suspense>
  );
}
