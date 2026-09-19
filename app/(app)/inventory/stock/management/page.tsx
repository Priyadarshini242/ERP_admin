"use client";

import clsx from "clsx";
import { ArrowLeftRight, Ban, CheckCircle2, History, Layers, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import type { BatchOption } from "@/components/DocumentForm";
import { DataTable, FilterBar, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Field, Input, Modal, Pill, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { demoFor } from "@/lib/demo";
import { fmtDate, money, moneyCompact, n, qty, titleCase, today } from "@/lib/format";
import { useList, useMasters } from "@/lib/hooks";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const EXPIRY_FILTERS = [
  { key: "all", label: "All batches" },
  { key: "in_stock", label: "In stock" },
  { key: "near", label: "Near expiry" },
  { key: "expired", label: "Expired" },
  { key: "blocked", label: "Blocked" },
];

function StockManagementInner() {
  const params = useSearchParams();
  const { warehouses, products } = useMasters("vendor");
  const [view, setView] = useState<"batch" | "product">((params.get("view") as "batch" | "product") ?? "batch");
  const [q, setQ] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [lowStock, setLowStock] = useState(params.get("lowStock") === "true");
  const [filter, setFilter] = useState(params.get("filter") ?? "all");
  const [page, setPage] = useState(1);
  const [transfer, setTransfer] = useState<Row | null>(null);
  const [history, setHistory] = useState<Row | null>(null);
  const [trace, setTrace] = useState<number | null>(null);
  const [block, setBlock] = useState<Row | null>(null);

  const batchList = useList<Row>(view === "batch" ? "/inventory/stock/batches" : null, { q, warehouseId, filter, page, pageSize: 25 });
  const productList = useList<Row>(view === "product" ? "/inventory/stock" : null, { q, warehouseId, lowStock: lowStock || undefined, page, pageSize: 25 });
  const list = view === "batch" ? batchList : productList;
  const summary = list.data?.summary as Record<string, unknown> | undefined;

  const batchColumns: Column<Row>[] = [
    { key: "product", header: "Product", render: (r) => <span><span className="font-medium text-slate-900 dark:text-white">{r.product.name}</span> <span className="text-xs text-slate-400">{r.product.sku}</span></span> },
    { key: "batchNo", header: "Batch", render: (r) => <button onClick={(e) => { e.stopPropagation(); setTrace(r.batchId); }} className="font-mono text-brand-600 hover:underline dark:text-brand-300">{r.batchNo}</button> },
    { key: "warehouse", header: "Warehouse", render: (r) => r.warehouse.name },
    { key: "expiryDate", header: "Expiry", render: (r) => (r.expiryDate ? <span className={clsx(r.state === "EXPIRED" && "text-red-600 dark:text-red-400", r.state === "NEAR_EXPIRY" && "text-amber-700 dark:text-amber-400")}>{fmtDate(r.expiryDate)}{r.daysToExpiry != null && <span className="ml-1 text-[11px] text-slate-400">({r.daysToExpiry < 0 ? `${-r.daysToExpiry}d ago` : `${r.daysToExpiry}d`})</span>}</span> : <span className="text-slate-400">—</span>) },
    { key: "quantity", header: "On hand", align: "right", render: (r) => <span className={clsx("font-medium tabular-nums", n(r.quantity) <= 0 ? "text-slate-400" : "text-slate-900 dark:text-white")}>{qty(r.quantity)} {r.product.unit}</span> },
    { key: "mrp", header: "MRP", align: "right", render: (r) => money(r.mrp) },
    { key: "unitCost", header: "Cost", align: "right", render: (r) => money(r.unitCost) },
    { key: "value", header: "Value", align: "right", render: (r) => money(r.value) },
    { key: "state", header: "State", render: (r) => <StatusBadge value={r.state} /> },
    { key: "source", header: "Source", render: (r) => <span className="text-xs text-slate-500">{r.source ?? "—"}</span> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button title="Trace" onClick={() => setTrace(r.batchId)} className="rounded p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-ink-700"><History className="h-4 w-4" /></button>
          <button title="Transfer this batch" onClick={() => setTransfer(r)} className="rounded p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-ink-700"><ArrowLeftRight className="h-4 w-4" /></button>
          {r.status === "BLOCKED" ? (
            <button title="Release batch" onClick={() => setBlock(r)} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"><CheckCircle2 className="h-4 w-4" /></button>
          ) : (
            <button title="Block / quarantine batch" onClick={() => setBlock(r)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Ban className="h-4 w-4" /></button>
          )}
        </div>
      ),
    },
  ];

  const productColumns: Column<Row>[] = [
    { key: "product", header: "Product", render: (r) => <span><span className="font-medium text-slate-900 dark:text-white">{r.product.name}</span> <span className="text-xs text-slate-400">{r.product.sku}</span></span> },
    { key: "category", header: "Category", render: (r) => r.product.category ?? "—" },
    { key: "warehouse", header: "Warehouse", render: (r) => r.warehouse.name },
    { key: "quantity", header: "On hand", align: "right", render: (r) => <span className={`font-medium tabular-nums ${n(r.quantity) <= 0 ? "text-red-700 dark:text-red-400" : r.isLow ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>{qty(r.quantity)} {r.product.unit}</span> },
    { key: "reorderLevel", header: "Reorder at", align: "right", render: (r) => (n(r.reorderLevel) > 0 ? qty(r.reorderLevel) : "—") },
    { key: "cost", header: "Cost", align: "right", render: (r) => money(r.product.purchasePrice) },
    { key: "value", header: "Value", align: "right", render: (r) => money(r.value) },
    { key: "flag", header: "", render: (r) => (n(r.quantity) <= 0 ? <StatusBadge value="OUT" /> : r.isLow ? <StatusBadge value="LOW" /> : null) },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button title="Batches of this product" onClick={() => { setView("batch"); setQ(r.product.sku); setPage(1); }} className="rounded p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-ink-700"><Layers className="h-4 w-4" /></button>
          <button title="Movement history" onClick={() => setHistory(r)} className="rounded p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-ink-700"><History className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Stock Management</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Every unit tracked by batch: on-hand per lot and warehouse, expiry state, valuation at batch cost, full trace from purchase bill to customer.
            {list.demo && <Pill tone="warning" className="ml-2 align-middle">offline · demo data</Pill>}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setTransfer({})}><ArrowLeftRight className="h-4 w-4" /> Transfer stock</Button>
      </div>

      {summary && view === "batch" && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Tile label="Batches" value={String(summary.batches ?? 0)} />
          <Tile label="Quantity on hand" value={qty(summary.quantity)} />
          <Tile label="Value (batch cost)" value={moneyCompact(summary.value)} />
          <Tile label="Near expiry" value={qty(summary.nearExpiryQty)} tone={n(summary.nearExpiryQty) > 0 ? "warn" : undefined} onClick={() => { setFilter("near"); setPage(1); }} />
          <Tile label="Expired" value={qty(summary.expiredQty)} tone={n(summary.expiredQty) > 0 ? "danger" : undefined} onClick={() => { setFilter("expired"); setPage(1); }} />
        </div>
      )}
      {summary && view === "product" && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Tile label="Total quantity" value={qty(summary.totalQty)} />
          <Tile label="Stock value (at cost)" value={moneyCompact(summary.totalValue)} />
          <Tile label="Low / out of stock" value={String(summary.lowStockCount ?? 0)} tone={n(summary.lowStockCount) ? "warn" : undefined} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-ink-700 dark:bg-ink-850">
        {(["batch", "product"] as const).map((t) => (
          <button key={t} onClick={() => { setView(t); setPage(1); }} className={clsx("rounded-md px-3 py-1.5 text-sm transition", view === t ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-800")}>
            {t === "batch" ? "Batch-wise" : "Product-wise"}
          </button>
        ))}
      </div>

      <FilterBar>
        <Field label="Search" className="min-w-[200px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-8" placeholder={view === "batch" ? "product, SKU or batch no." : "product name or SKU"} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </Field>
        <Field label="Warehouse">
          <Select value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </Field>
        {view === "batch" ? (
          <Field label="Expiry / state">
            <Select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
              {EXPIRY_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </Select>
          </Field>
        ) : (
          <label className="flex h-9 items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} className="h-4 w-4 rounded border-slate-300" />
            Low stock only
          </label>
        )}
      </FilterBar>

      <DataTable
        columns={view === "batch" ? batchColumns : productColumns}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        onRowClick={view === "batch" ? (r) => setTrace(r.batchId) : undefined}
        empty={view === "batch" ? "No batches match" : "No stock rows"}
        pagination={list.data ? { page: list.data.page, pages: list.data.pages, total: list.data.total, pageSize: list.data.pageSize, onPage: setPage } : undefined}
      />

      <TransferModal open={Boolean(transfer)} onClose={() => setTransfer(null)} preset={transfer} warehouses={warehouses} products={products} onSaved={() => { setTransfer(null); list.reload(); }} />
      <HistoryModal row={history} onClose={() => setHistory(null)} />
      <TraceModal batchId={trace} onClose={() => setTrace(null)} />
      <BlockModal row={block} onClose={() => setBlock(null)} onSaved={() => { setBlock(null); list.reload(); }} />
    </div>
  );
}

export default function StockManagementPage() {
  return (
    <Suspense>
      <StockManagementInner />
    </Suspense>
  );
}

function Tile({ label, value, tone, onClick }: { label: string; value: string; tone?: "warn" | "danger"; onClick?: () => void }) {
  const Cmp = onClick ? "button" : "div";
  return (
    <Cmp onClick={onClick} className={clsx("card p-4 text-left", onClick && "transition hover:-translate-y-px hover:shadow-md")}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={clsx("mt-1 text-2xl font-semibold", tone === "warn" ? "text-amber-700 dark:text-amber-400" : tone === "danger" ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white")}>{value}</p>
    </Cmp>
  );
}

function TransferModal({ open, onClose, preset, warehouses, products, onSaved }: { open: boolean; onClose: () => void; preset: Row | null; warehouses: { id: number; name: string }[]; products: { id: number; name: string; sku: string; trackBatches?: boolean }[]; onSaved: () => void }) {
  const [productId, setProductId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [batchId, setBatchId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [options, setOptions] = useState<BatchOption[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<string | null>(null);

  const presetKey = preset ? `${preset.id ?? "new"}` : null;
  if (!open && key !== null) setKey(null);
  if (open && presetKey !== key) {
    setKey(presetKey);
    setProductId(preset?.product?.id ? String(preset.product.id) : "");
    setFrom(preset?.warehouse?.id ? String(preset.warehouse.id) : "");
    setBatchId(preset?.batchId ? String(preset.batchId) : "");
    setTo("");
    setQuantity("");
    setError(null);
  }

  const product = products.find((p) => String(p.id) === productId);
  const tracked = product ? product.trackBatches !== false : false;

  useEffect(() => {
    if (!productId || !from || !tracked) {
      setOptions([]);
      return;
    }
    api<BatchOption[]>("/inventory/batches/lookup", { query: { productId: Number(productId), warehouseId: Number(from), date } })
      .then(setOptions)
      .catch(() => setOptions((demoFor("/inventory/batches/lookup") as BatchOption[] | null) ?? []));
  }, [productId, from, date, tracked]);

  const valid = productId && from && to && from !== to && n(quantity) > 0 && (!tracked || batchId);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api("/inventory/stock/transfer", { method: "POST", body: { productId: Number(productId), fromWarehouseId: Number(from), toWarehouseId: Number(to), quantity, date, batchId: batchId ? Number(batchId) : null, note: note || null } });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Transfer stock between warehouses" onClose={onClose} width="max-w-lg">
      {error && <Alert kind="error" title={error.message} items={error.errors} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Product" required className="col-span-2">
          <Select value={productId} onChange={(e) => { setProductId(e.target.value); setBatchId(""); }}>
            <option value="">— select —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
          </Select>
        </Field>
        <Field label="From" required>
          <Select value={from} onChange={(e) => { setFrom(e.target.value); setBatchId(""); }}>
            <option value="">— select —</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </Field>
        <Field label="To" required error={from && to && from === to ? "Must differ from source" : undefined}>
          <Select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">— select —</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </Field>
        {tracked && (
          <Field label="Batch" required className="col-span-2" hint="the lot keeps its identity in the destination warehouse">
            <Select value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={!from}>
              <option value="">— choose batch —</option>
              {options.map((o) => <option key={o.batchId} value={o.batchId}>{o.label}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Quantity" required>
          <Input type="number" step="any" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note" className="col-span-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
        </Field>
      </div>
      {warehouses.length < 2 && <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">Add a second warehouse under Settings to use transfers.</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!valid} loading={busy}>Transfer</Button>
      </div>
    </Modal>
  );
}

function HistoryModal({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const { items, loading, error } = useList<Row>(row ? "/inventory/stock/movements" : null, row ? { productId: row.product.id, warehouseId: row.warehouse.id, pageSize: 50 } : {});
  return (
    <Modal open={Boolean(row)} title={row ? `Movements · ${row.product.name} @ ${row.warehouse.name}` : ""} onClose={onClose} width="max-w-4xl">
      {row && (
        <DataTable
          columns={[
            { key: "movementDate", header: "Date", render: (m) => fmtDate(m.movementDate) },
            { key: "direction", header: "", render: (m) => <StatusBadge value={m.direction} /> },
            { key: "batch", header: "Batch", render: (m) => <span className="font-mono text-xs">{m.batch?.batchNo ?? "—"}</span> },
            { key: "refType", header: "Reference", render: (m) => <span>{titleCase(m.refType)} <span className="text-xs text-slate-400">{m.refNo ?? ""}</span></span> },
            { key: "quantity", header: "Qty", align: "right", render: (m) => <span className={m.direction === "OUT" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>{m.direction === "OUT" ? "−" : "+"}{qty(m.quantity)}</span> },
            { key: "balanceAfter", header: "Balance", align: "right", render: (m) => qty(m.balanceAfter) },
            { key: "createdBy", header: "By", render: (m) => m.createdBy?.fullName ?? "—" },
            { key: "note", header: "Note", render: (m) => m.note ?? "" },
          ]}
          rows={items}
          loading={loading}
          error={error}
          empty="No movements yet"
        />
      )}
    </Modal>
  );
}

/** Full traceability of one batch: where it came from, where it sits, where every unit went. */
function TraceModal({ batchId, onClose }: { batchId: number | null; onClose: () => void }) {
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!batchId) {
      setData(null);
      return;
    }
    setError(null);
    api<Row>(`/inventory/batches/${batchId}`)
      .then(setData)
      .catch((e) => {
        const fb = demoFor(`/inventory/batches/${batchId}`) as Row | null;
        if (fb) setData(fb);
        else setError(e instanceof ApiError ? e.message : "API not reachable");
      });
  }, [batchId]);
  const b = data?.batch;
  return (
    <Modal open={Boolean(batchId)} title={b ? `Batch ${b.batchNo} · ${b.product.name}` : "Batch trace"} onClose={onClose} width="max-w-4xl">
      {error && <Alert kind="error" title={error} />}
      {data && b && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Kv k="Status" v={<StatusBadge value={b.status} />} />
            <Kv k="Expiry" v={b.expiryDate ? fmtDate(b.expiryDate) : "—"} />
            <Kv k="Mfg date" v={b.mfgDate ? fmtDate(b.mfgDate) : "—"} />
            <Kv k="MRP / cost" v={`${money(b.mrp)} / ${money(b.unitCost)}`} />
            <Kv k="Source" v={`${b.sourceRefNo ?? titleCase(b.sourceRefType ?? "")}${b.vendor ? ` · ${b.vendor.name}` : ""}`} />
            <Kv k="Received" v={qty(data.totals.in)} />
            <Kv k="Issued" v={qty(data.totals.out)} />
            <Kv k="On hand" v={qty(data.onHand)} />
          </div>
          {b.statusReason && <Alert kind="warning" title={b.statusReason} />}
          <div className="flex flex-wrap gap-2 text-xs">
            {data.stock.map((s: Row) => (
              <span key={s.warehouse.id} className="rounded-full border border-slate-200 px-2 py-0.5 dark:border-ink-700">{s.warehouse.name}: <b>{qty(s.quantity)}</b></span>
            ))}
          </div>
          <table className="min-w-full text-sm">
            <thead className="thead text-xs uppercase">
              <tr>
                <th className="th">Date</th>
                <th className="th"></th>
                <th className="th">Document</th>
                <th className="th">Party</th>
                <th className="th">Warehouse</th>
                <th className="th text-right">Qty</th>
                <th className="th text-right">Batch balance</th>
                <th className="th">By</th>
              </tr>
            </thead>
            <tbody className="divide-y-ui">
              {data.movements.map((m: Row) => (
                <tr key={m.id}>
                  <td className="td">{fmtDate(m.date)}</td>
                  <td className="td"><StatusBadge value={m.direction} /></td>
                  <td className="td">{titleCase(m.refType)} <span className="text-xs text-slate-400">{m.refNo ?? ""}</span></td>
                  <td className="td">{m.party ?? <span className="text-slate-400">—</span>}</td>
                  <td className="td">{m.warehouse.name}</td>
                  <td className={clsx("td text-right tabular-nums", m.direction === "OUT" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>{m.direction === "OUT" ? "−" : "+"}{qty(m.quantity)}</td>
                  <td className="td text-right tabular-nums">{m.batchBalanceAfter != null ? qty(m.batchBalanceAfter) : "—"}</td>
                  <td className="td">{m.by ?? "—"}</td>
                </tr>
              ))}
              {data.movements.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">No movements recorded</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function BlockModal({ row, onClose, onSaved }: { row: Row | null; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blocking = row?.status !== "BLOCKED";
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/inventory/batches/${row!.batchId}/${blocking ? "block" : "unblock"}`, { method: "POST", body: { reason } });
      setReason("");
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "API not reachable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={Boolean(row)} title={row ? `${blocking ? "Block" : "Release"} batch ${row.batchNo}` : ""} onClose={onClose} width="max-w-md">
      {error && <Alert kind="error" title={error} />}
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        {blocking ? "Blocked batches cannot be sold (quarantine / recall hold). Returns, adjustments and transfers still work." : "Releasing makes the batch sellable again."}
      </p>
      <Field label="Reason" required={blocking}>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={blocking ? "e.g. Recall notice 12/2026" : "optional"} />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={blocking ? "danger" : "primary"} onClick={save} disabled={blocking && reason.trim().length < 3} loading={busy}>{blocking ? "Block batch" : "Release batch"}</Button>
      </div>
    </Modal>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-2 dark:border-ink-700">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{k}</p>
      <p className="font-medium text-slate-800 dark:text-slate-100">{v}</p>
    </div>
  );
}
