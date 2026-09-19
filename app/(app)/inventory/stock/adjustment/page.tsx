"use client";

import { Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { ApprovalPanel } from "@/components/ApprovalPanel";
import type { BatchOption } from "@/components/DocumentForm";
import { DataTable, FilterBar, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Card, Field, Input, Modal, Pill, Select, Textarea } from "@/components/ui";
import { api, ApiError, type Issue } from "@/lib/api";
import { approvalLabel, type ApprovalState } from "@/lib/approvals";
import { demoFor } from "@/lib/demo";
import { fmtDate, money, n, qty, titleCase, today } from "@/lib/format";
import { useList, useMasters } from "@/lib/hooks";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;

const REASONS = ["PHYSICAL_COUNT", "DAMAGE", "EXPIRY", "THEFT", "OPENING", "REBATCH", "OTHER"];
const APPROVAL_OPTIONS = ["NONE", "PENDING_L1", "PENDING_L2", "PENDING_L3", "APPROVED", "REJECTED"];

interface Line {
  productId: number | null;
  mode: "change" | "count";
  value: string;
  unitCost: string;
  note: string;
  batchId: number | null;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  mrp: string;
}
const emptyLine = (): Line => ({ productId: null, mode: "change", value: "", unitCost: "", note: "", batchId: null, batchNo: "", mfgDate: "", expiryDate: "", mrp: "" });

function StockAdjustmentInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState("");
  const [approval, setApproval] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, items, loading, error, reload, demo } = useList<Doc>("/inventory/adjustments", { status, approvalStatus: approval, page, pageSize: 20 });

  const openId = params.get("open");
  useEffect(() => {
    if (!openId) return;
    api<Doc>(`/inventory/adjustments/${openId}`).then(setSelected).catch(() => {
      const row = items.find((d) => String(d.id) === openId);
      if (row) setSelected(row);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, items.length]);

  async function run(verb: "post" | "cancel") {
    if (!selected) return;
    if (verb === "post" && !window.confirm("This adjustment has completed three-level approval. Post it now? Stock balances and the ledger will be updated.")) return;
    setBusy(true);
    setActionError(null);
    try {
      setSelected(await api<Doc>(`/inventory/adjustments/${selected.id}/${verb}`, { method: "POST" }));
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<Doc>[] = [
    { key: "adjustmentNo", header: "No.", render: (d) => <span className="font-medium text-slate-900 dark:text-white">{d.adjustmentNo}</span> },
    { key: "adjustmentDate", header: "Date", render: (d) => fmtDate(d.adjustmentDate) },
    { key: "warehouse", header: "Warehouse", render: (d) => d.warehouse?.name },
    { key: "reason", header: "Reason", render: (d) => titleCase(d.reason) },
    { key: "items", header: "Lines", align: "right", render: (d) => d.items?.length ?? 0 },
    { key: "net", header: "Net qty", align: "right", render: (d) => qty((d.items ?? []).reduce((s: number, i: Doc) => s + n(i.qtyChange), 0)) },
    { key: "status", header: "Status", render: (d) => <StatusBadge value={d.status} /> },
    { key: "approvalStatus", header: "Approval", render: (d) => (d.status === "DRAFT" ? <StatusBadge value={d.approvalStatus ?? "NONE"} /> : <span className="text-xs text-slate-400">—</span>) },
    { key: "createdBy", header: "By", render: (d) => d.createdBy?.fullName ?? "—" },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Stock Adjustment</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Physical counts, damage, expiry, opening stock and re-batching — by batch. Posting (after three-level approval) writes stock movements and an inventory adjustment voucher.
            {demo && <Pill tone="warning" className="ml-2 align-middle">offline · demo data</Pill>}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New adjustment
        </Button>
      </div>

      <FilterBar>
        <Field label="Status">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {["DRAFT", "POSTED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{titleCase(s)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Approval">
          <Select value={approval} onChange={(e) => { setApproval(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {APPROVAL_OPTIONS.map((s) => <option key={s} value={s}>{approvalLabel(s)}</option>)}
          </Select>
        </Field>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        error={error}
        onRowClick={(d) => { setSelected(d); setActionError(null); }}
        pagination={data ? { page: data.page, pages: data.pages, total: data.total, pageSize: data.pageSize, onPage: setPage } : undefined}
      />

      <Modal open={Boolean(selected)} title={selected ? `${selected.adjustmentNo} · ${selected.warehouse?.name}` : ""} onClose={() => setSelected(null)} width="max-w-4xl">
        {selected && (
          <div>
            {actionError && <Alert kind="error" title={actionError.message} items={actionError.errors} />}
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              {fmtDate(selected.adjustmentDate)} · {titleCase(selected.reason)} · <StatusBadge value={selected.status} />{selected.status === "DRAFT" && <> · <StatusBadge value={selected.approvalStatus ?? "NONE"} /></>}
              {selected.notes && <span className="block text-xs text-slate-400 dark:text-slate-500">{selected.notes}</span>}
            </p>
            <table className="min-w-full text-sm">
              <thead className="thead text-xs uppercase">
                <tr>
                  <th className="th">Product</th>
                  <th className="th">Batch</th>
                  <th className="th text-right">Before</th>
                  <th className="th text-right">Change</th>
                  <th className="th text-right">After</th>
                  <th className="th text-right">Unit cost</th>
                  <th className="th">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y-ui">
                {selected.items.map((i: Doc) => (
                  <tr key={i.id}>
                    <td className="td">{i.product?.name} <span className="text-xs text-slate-400">{i.product?.sku}</span></td>
                    <td className="td text-xs">{(i.batch?.batchNo ?? i.batchNo) ? <><span className="font-mono">{i.batch?.batchNo ?? i.batchNo}</span> <span className="text-slate-400">exp {fmtDate(i.batch?.expiryDate ?? i.expiryDate)}</span></> : <span className="text-slate-300">—</span>}</td>
                    <td className="td text-right tabular-nums">{qty(i.qtyBefore)}</td>
                    <td className={`td text-right font-medium tabular-nums ${n(i.qtyChange) < 0 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>{n(i.qtyChange) > 0 ? "+" : ""}{qty(i.qtyChange)}</td>
                    <td className="td text-right tabular-nums">{qty(i.qtyAfter)}</td>
                    <td className="td text-right tabular-nums">{money(i.unitCost)}</td>
                    <td className="td text-slate-500 dark:text-slate-400">{i.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4">
              <ApprovalPanel docType="ADJ" docId={selected.id} docStatus={selected.status} onChange={(s: ApprovalState) => { setSelected({ ...selected, approvalStatus: s.approvalStatus }); reload(); }} />
            </div>
            {selected.status === "DRAFT" && (
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="danger" onClick={() => run("cancel")} loading={busy}>Cancel adjustment</Button>
                {selected.approvalStatus === "APPROVED" ? (
                  <Button onClick={() => run("post")} loading={busy}>Post</Button>
                ) : (
                  <span className="self-center text-xs text-slate-500 dark:text-slate-400">Post unlocks after level 3 approval.</span>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <NewAdjustmentModal open={open} onClose={() => setOpen(false)} onSaved={(d) => { setOpen(false); reload(); if (d) setSelected(d); }} />
    </div>
  );
}

export default function StockAdjustmentPage() {
  return (
    <Suspense>
      <StockAdjustmentInner />
    </Suspense>
  );
}

function NewAdjustmentModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (doc: Doc | null) => void }) {
  const { products, warehouses, loading } = useMasters("vendor");
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState("PHYSICAL_COUNT");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);
  const [batchOptions, setBatchOptions] = useState<Record<string, BatchOption[]>>({});

  useEffect(() => {
    if (!warehouseId && warehouses.length) setWarehouseId((warehouses.find((w) => w.isDefault) ?? warehouses[0]).id);
  }, [warehouses, warehouseId]);

  // batch options per product (incl. empty batches, so counts can be entered per lot)
  useEffect(() => {
    if (!warehouseId) return;
    for (const id of new Set(lines.map((l) => l.productId).filter((x): x is number => !!x))) {
      const key = `${id}:${warehouseId}`;
      if (batchOptions[key]) continue;
      api<BatchOption[]>("/inventory/batches/lookup", { query: { productId: id, warehouseId, date, includeEmpty: true } })
        .then((rows) => setBatchOptions((m) => ({ ...m, [key]: rows })))
        .catch(() => setBatchOptions((m) => ({ ...m, [key]: (demoFor("/inventory/batches/lookup") as BatchOption[] | null) ?? [] })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.map((l) => l.productId).join(","), warehouseId]);
  const optionsFor = (id: number | null) => (id && warehouseId ? (batchOptions[`${id}:${warehouseId}`] ?? []) : []);

  const issues = useMemo<Issue[]>(() => {
    const out: Issue[] = [];
    if (!warehouseId) out.push({ message: "Select a warehouse" });
    const real = lines.filter((l) => l.productId);
    if (!real.length) out.push({ message: "Add at least one product" });
    const seen = new Set<string>();
    lines.forEach((l, i) => {
      if (!l.productId) return;
      const p = products.find((x) => x.id === l.productId);
      const tracked = p?.trackBatches !== false;
      const key = `${l.productId}|${l.batchId ?? l.batchNo.trim().toUpperCase()}`;
      if (seen.has(key)) out.push({ message: `${p?.name} ${tracked ? "batch " + (l.batchNo || l.batchId) : ""} appears more than once` });
      seen.add(key);
      if (l.value === "" || Number.isNaN(Number(l.value))) out.push({ message: `Line ${i + 1}: enter a quantity` });
      else if (l.mode === "change" && n(l.value) === 0) out.push({ message: `${p?.name}: change cannot be zero` });
      else if (l.mode === "count" && n(l.value) < 0) out.push({ message: `${p?.name}: counted quantity cannot be negative` });
      if (tracked) {
        if (!l.batchId && !l.batchNo.trim()) out.push({ message: `${p?.name}: choose or enter the batch` });
        if (!l.batchId && l.batchNo.trim() && p?.hasExpiry && !l.expiryDate) out.push({ message: `${p?.name}: expiry date required for new batch ${l.batchNo}` });
        if (!l.batchId && l.mode === "change" && n(l.value) < 0) out.push({ message: `${p?.name}: cannot remove stock from a batch that does not exist yet` });
      }
    });
    return out;
  }, [lines, warehouseId, products]);

  const upd = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function save(submit: boolean) {
    setBusy(submit ? "submit" : "draft");
    setError(null);
    try {
      const created = await api<Doc>("/inventory/adjustments", {
        method: "POST",
        body: {
          warehouseId,
          adjustmentDate: date,
          reason,
          notes: notes || null,
          items: lines
            .filter((l) => l.productId)
            .map((l) => ({
              productId: l.productId,
              ...(l.mode === "change" ? { qtyChange: l.value } : { newQty: l.value }),
              unitCost: l.unitCost === "" ? null : l.unitCost,
              note: l.note || null,
              batchId: l.batchId ?? null,
              batchNo: l.batchId ? null : l.batchNo || null,
              mfgDate: l.mfgDate || null,
              expiryDate: l.expiryDate || null,
              mrp: l.mrp || null,
            })),
          submit,
        },
      });
      setLines([emptyLine()]);
      setNotes("");
      onSaved(created);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable — the adjustment was not saved"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} title="New stock adjustment" onClose={onClose} width="max-w-5xl">
      {error && <Alert kind="error" title={error.message} items={error.errors} onClose={() => setError(null)} />}
      {loading ? (
        <p className="text-sm text-slate-400">Loading masters…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Warehouse" required>
              <Select value={warehouseId ?? ""} onChange={(e) => setWarehouseId(Number(e.target.value))}>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Date" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Reason">
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}
              </Select>
            </Field>
            <Field label="Notes" className="md:col-span-4">
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>

          <Card title="Lines" padded={false} actions={<Button size="sm" variant="secondary" onClick={() => setLines((ls) => [...ls, emptyLine()])}><Plus className="h-4 w-4" /> Add</Button>}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="thead text-xs uppercase">
                  <tr>
                    <th className="th" style={{ minWidth: 220 }}>Product</th>
                    <th className="th" style={{ minWidth: 280 }}>Batch · expiry · MRP</th>
                    <th className="th">Entry</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Unit cost</th>
                    <th className="th">Note</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y-ui">
                  {lines.map((l, i) => {
                    const p = products.find((x) => x.id === l.productId);
                    const tracked = p ? p.trackBatches !== false : false;
                    const opts = optionsFor(l.productId);
                    const picked = opts.find((o) => o.batchId === l.batchId);
                    return (
                      <tr key={i} className="align-top">
                        <td className="td">
                          <Select value={l.productId ?? ""} onChange={(e) => { const id = e.target.value ? Number(e.target.value) : null; const prod = products.find((x) => x.id === id); upd(i, { productId: id, unitCost: prod ? String(n(prod.purchasePrice)) : "", batchId: null, batchNo: "", expiryDate: "", mfgDate: "", mrp: prod && n(prod.mrp) > 0 ? String(n(prod.mrp)) : "" }); }}>
                            <option value="">— select product —</option>
                            {products.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.sku}{x.stockQty !== undefined ? ` · stock ${qty(x.stockQty)}` : ""}</option>)}
                          </Select>
                          {p && <span className="mt-1 block text-[11px] text-slate-400">on hand (all warehouses): {qty(p.stockQty)} {p.unit}{tracked ? " · batch-tracked" : ""}</span>}
                        </td>
                        <td className="td">
                          {!p ? <span className="text-xs text-slate-300">—</span> : !tracked ? <span className="text-xs text-slate-400">not batch-tracked</span> : (
                            <div className="grid grid-cols-2 gap-1.5">
                              <Select className="col-span-2" value={l.batchId ?? (l.batchNo ? "__new" : "")} onChange={(e) => { const v = e.target.value; if (v === "__new") upd(i, { batchId: null, batchNo: "" }); else { const id = v ? Number(v) : null; const o = opts.find((x) => x.batchId === id); upd(i, { batchId: id, batchNo: o?.batchNo ?? "", expiryDate: o?.expiryDate?.slice(0, 10) ?? "", mrp: o && n(o.mrp) > 0 ? String(n(o.mrp)) : l.mrp }); } }}>
                                <option value="">— choose batch —</option>
                                {opts.map((o) => <option key={o.batchId} value={o.batchId}>{o.label}</option>)}
                                <option value="__new">+ New batch…</option>
                              </Select>
                              {!l.batchId && (
                                <>
                                  <Input className="col-span-2 font-mono" placeholder="New batch no." value={l.batchNo} onChange={(e) => upd(i, { batchNo: e.target.value.toUpperCase() })} />
                                  <Input type="date" title="Mfg date" value={l.mfgDate} onChange={(e) => upd(i, { mfgDate: e.target.value })} />
                                  <Input type="date" title="Expiry date" value={l.expiryDate} onChange={(e) => upd(i, { expiryDate: e.target.value })} />
                                  <Input type="number" step="0.01" placeholder="MRP" className="col-span-2 text-right" value={l.mrp} onChange={(e) => upd(i, { mrp: e.target.value })} />
                                </>
                              )}
                              {picked && <span className="col-span-2 text-[11px] text-slate-400">{qty(picked.quantity)} in this warehouse · exp {picked.expiryDate ? fmtDate(picked.expiryDate) : "—"}</span>}
                            </div>
                          )}
                        </td>
                        <td className="td">
                          <Select value={l.mode} onChange={(e) => upd(i, { mode: e.target.value as Line["mode"] })} className="w-36">
                            <option value="change">± change</option>
                            <option value="count">counted total</option>
                          </Select>
                        </td>
                        <td className="td"><Input type="number" step="any" value={l.value} onChange={(e) => upd(i, { value: e.target.value })} className="w-28 text-right" placeholder={l.mode === "change" ? "+10 / -3" : "counted"} /></td>
                        <td className="td"><Input type="number" step="0.01" min="0" value={l.unitCost} onChange={(e) => upd(i, { unitCost: e.target.value })} className="w-28 text-right" /></td>
                        <td className="td"><Input value={l.note} onChange={(e) => upd(i, { note: e.target.value })} placeholder="optional" /></td>
                        <td className="px-2 py-2"><button onClick={() => setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, j) => j !== i)))} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {issues.length > 0 && <Alert kind="error" title="Fix before saving" items={issues} />}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto text-[11px] text-slate-400">Needs three approvals before it can be posted.</span>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="secondary" onClick={() => save(false)} disabled={issues.length > 0} loading={busy === "draft"}>Save draft</Button>
            <Button onClick={() => save(true)} disabled={issues.length > 0} loading={busy === "submit"}>Save & submit for approval</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
