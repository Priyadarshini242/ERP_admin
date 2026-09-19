"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Card, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, ApiError, type Issue } from "@/lib/api";
import { fmtDate, money, qty, today } from "@/lib/format";
import { productLabel, useMfgMasters, type Rec } from "@/lib/manufacturing";

interface Line {
  kind: "OUTPUT" | "BY_PRODUCT";
  productId: string;
  quantity: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  mrp: string;
  unitCost: string;
  note: string;
}
interface Preview {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  lines: { index: number; productId: number; kind: string; batchNo: string; mfgDate: string | null; expiryDate: string | null; mrp: string | null }[];
  costing: { openWip: string; producedSoFar: string; plannedQty: string; overheadPct: string } | null;
}

const blank = (kind: Line["kind"] = "OUTPUT"): Line => ({ kind, productId: "", quantity: "", batchNo: "", mfgDate: "", expiryDate: "", mrp: "", unitCost: "", note: "" });

function NewReceiptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { products, warehouses } = useMfgMasters();
  const [orders, setOrders] = useState<Rec[]>([]);
  const [order, setOrder] = useState<Rec | null>(null);
  const [f, setF] = useState({ orderId: params.get("orderId") ?? "", receiptDate: today(), warehouseId: "", isFinal: false, scrapQty: "0", scrapReason: "", overheadAmount: "", deviationNote: "", notes: "" });
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    Promise.all([api<{ items: Rec[] }>("/manufacturing/orders", { query: { status: "RELEASED", pageSize: 100 } }), api<{ items: Rec[] }>("/manufacturing/orders", { query: { status: "IN_PROGRESS", pageSize: 100 } })])
      .then(([a, b]) => setOrders([...a.items, ...b.items].sort((x, y) => x.orderNo.localeCompare(y.orderNo))))
      .catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    if (!f.orderId) return setOrder(null);
    api<Rec>(`/manufacturing/orders/${f.orderId}`)
      .then((o) => {
        setOrder(o);
        const remaining = Math.max(0, Number(o.plannedQty) - Number(o.producedQty));
        const byProducts: Rec[] = (o.items ?? []).filter((i: Rec) => i.role === "BY_PRODUCT");
        setLines([
          { ...blank("OUTPUT"), productId: String(o.productId), quantity: remaining ? remaining.toFixed(3) : "", batchNo: o.fgBatchNo ?? "", mfgDate: o.fgMfgDate ? String(o.fgMfgDate).slice(0, 10) : "", expiryDate: o.fgExpiryDate ? String(o.fgExpiryDate).slice(0, 10) : "", mrp: o.fgMrp ?? "" },
          ...byProducts.map((b: Rec) => ({ ...blank("BY_PRODUCT"), productId: String(b.productId), quantity: String(Math.max(0, Number(b.plannedQty) - Number(b.receivedQty)).toFixed(3)), batchNo: o.fgBatchNo ?? "" })),
        ]);
        setF((s) => ({ ...s, warehouseId: String(o.fgWarehouseId), isFinal: remaining > 0 ? s.isFinal : true }));
      })
      .catch(() => setOrder(null));
  }, [f.orderId]);

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const body = useMemo(
    () => ({
      orderId: Number(f.orderId),
      receiptDate: f.receiptDate,
      warehouseId: f.warehouseId ? Number(f.warehouseId) : null,
      isFinal: f.isFinal,
      scrapQty: f.scrapQty || "0",
      scrapReason: f.scrapReason || null,
      overheadAmount: f.overheadAmount === "" ? null : f.overheadAmount,
      deviationNote: f.deviationNote || null,
      notes: f.notes || null,
      items: lines
        .filter((l) => Number(l.quantity) > 0)
        .map((l) => ({ kind: l.kind, productId: l.productId ? Number(l.productId) : null, quantity: l.quantity, batchNo: l.batchNo || null, mfgDate: l.mfgDate || null, expiryDate: l.expiryDate || null, mrp: l.mrp || null, unitCost: l.kind === "BY_PRODUCT" && l.unitCost !== "" ? l.unitCost : null, note: l.note || null })),
    }),
    [f, lines],
  );
  const ready = Boolean(f.orderId && f.receiptDate && body.items.some((i) => i.kind === "OUTPUT"));
  const bodyIndex = lines.reduce<number[]>((acc, l) => { acc.push(Number(l.quantity) > 0 ? acc.filter((x) => x >= 0).length : -1); return acc; }, []);

  useEffect(() => {
    if (!ready) return setPreview(null);
    const t = setTimeout(() => api<Preview>("/manufacturing/receipts/validate", { method: "POST", body }).then(setPreview).catch(() => setPreview(null)), 400);
    return () => clearTimeout(t);
  }, [body, ready]);

  const fieldError = (name: string) => error?.errors.find((e) => e.field === name)?.message ?? preview?.errors.find((e) => e.field === name)?.message;
  const lineError = (i: number, col: string) => (bodyIndex[i] >= 0 ? fieldError(`items[${bodyIndex[i]}].${col}`) : undefined);

  const outputQty = body.items.filter((i) => i.kind === "OUTPUT").reduce((s, i) => s + Number(i.quantity), 0);
  const producedAfter = Number(order?.producedQty ?? 0) + outputQty;
  const yieldPct = order && Number(order.plannedQty) > 0 ? (producedAfter / Number(order.plannedQty)) * 100 : 0;
  const openWip = Number(preview?.costing?.openWip ?? (order ? Number(order.issuedCost) - Number(order.absorbedCost) : 0));
  const remainingPlan = Math.max(0, Number(order?.plannedQty ?? 0) - Number(order?.producedQty ?? 0));
  const share = f.isFinal || remainingPlan <= 0 ? 1 : Math.min(1, outputQty / remainingPlan);
  const byProdValue = body.items.filter((i) => i.kind === "BY_PRODUCT").reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost ?? 0), 0);
  const material = openWip * share - byProdValue;
  const overhead = f.overheadAmount !== "" ? Number(f.overheadAmount) : material * (Number(preview?.costing?.overheadPct ?? order?.bom?.overheadPct ?? 0) / 100);
  const estUnit = outputQty > 0 ? (material + overhead) / outputQty : 0;
  const lowYield = order && f.isFinal && yieldPct < Number(order.bom?.yieldLowerLimitPct ?? 0);

  async function save(submit: boolean) {
    setBusy(submit ? "submit" : "save");
    setError(null);
    try {
      const created = await api<{ id: number }>("/manufacturing/receipts", { method: "POST", body: { ...body, submit } });
      router.push(`/manufacturing/receipts?open=${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable — start the backend to save"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader title="New Production Receipt" subtitle="Book finished output against a work order. Cost = share of open WIP − by-product value + overhead; the lot is created (and quarantined when QC is required) at posting." backHref="/manufacturing/receipts" backLabel="Back to list" />
      {error && <Alert kind="error" title={error.message} items={error.errors} onClose={() => setError(null)} />}
      {preview && preview.errors.length > 0 && !error && <Alert kind="error" title="Fix these before saving" items={preview.errors} />}
      {preview && preview.warnings.length > 0 && <Alert kind="warning" title="Warnings" items={preview.warnings} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Header" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Work order" required error={fieldError("orderId")} className="sm:col-span-2">
              <Select value={f.orderId} onChange={(e) => set("orderId", e.target.value)}>
                <option value="">Select open work order…</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNo} · {o.product?.name} · {qty(o.plannedQty)} {o.unit}</option>)}
              </Select>
            </Field>
            <Field label="Receipt date" required error={fieldError("receiptDate")}>
              <Input type="date" value={f.receiptDate} onChange={(e) => set("receiptDate", e.target.value)} />
            </Field>
            <Field label="Receive into" required error={fieldError("warehouseId")}>
              <Select value={f.warehouseId} onChange={(e) => set("warehouseId", e.target.value)}>
                <option value="">Work order FG store</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Scrap qty" error={fieldError("scrapQty")}>
              <Input type="number" step="0.001" min="0" value={f.scrapQty} onChange={(e) => set("scrapQty", e.target.value)} />
            </Field>
            <Field label="Scrap reason" error={fieldError("scrapReason")}>
              <Input value={f.scrapReason} onChange={(e) => set("scrapReason", e.target.value)} />
            </Field>
            <Field label="Overhead amount" hint={`Blank = BOM ${Number(preview?.costing?.overheadPct ?? order?.bom?.overheadPct ?? 0).toFixed(2)}% of material`} error={fieldError("overheadAmount")}>
              <Input type="number" step="0.01" min="0" value={f.overheadAmount} onChange={(e) => set("overheadAmount", e.target.value)} />
            </Field>
            <Field label=" " className="flex items-end pb-2">
              <Checkbox label="Final receipt — close the work order" checked={f.isFinal} onChange={(e) => set("isFinal", e.target.checked)} />
            </Field>
            <Field label="Deviation note" hint={lowYield ? `Yield ${yieldPct.toFixed(1)}% is below the BOM floor ${Number(order?.bom?.yieldLowerLimitPct).toFixed(1)}% — required` : "Required when closing below the yield floor"} error={fieldError("deviationNote")} className="sm:col-span-2 lg:col-span-4">
              <Textarea rows={2} value={f.deviationNote} onChange={(e) => set("deviationNote", e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-4">
              <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          {order && (
            <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-ink-700 dark:bg-ink-900/40 sm:grid-cols-5">
              <div><span className="text-slate-400">Product</span><br /><b>{order.product?.name}</b>{order.product?.qcRequired && <StatusBadge value="QC" label="QC required" className="ml-1" />}</div>
              <div><span className="text-slate-400">Planned · produced</span><br /><b>{qty(order.plannedQty)} · {qty(order.producedQty)}</b></div>
              <div><span className="text-slate-400">Open WIP</span><br /><b>{money(openWip)}</b></div>
              <div><span className="text-slate-400">FG lot</span><br /><b className="font-mono">{order.fgBatchNo}</b></div>
              <div><span className="text-slate-400">Status</span><br /><StatusBadge value={order.status} /></div>
            </div>
          )}
        </Card>

        <Card title="Costing preview">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Output qty</dt><dd>{qty(outputQty)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Yield after receipt</dt><dd className={lowYield ? "font-semibold text-amber-600" : ""}>{order ? `${yieldPct.toFixed(1)}%` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">WIP absorbed ({(share * 100).toFixed(0)}%)</dt><dd>{money(openWip * share)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">− By-product value</dt><dd>{money(byProdValue)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">+ Overhead</dt><dd>{money(overhead)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-ink-700"><dt className="text-slate-500">Est. unit cost</dt><dd className="font-semibold">{money(estUnit)}</dd></div>
          </dl>
          <div className="mt-4 flex flex-col gap-2">
            <Button loading={busy === "submit"} disabled={!ready || busy !== null || (preview ? !preview.ok : false)} onClick={() => save(true)}>Save & submit for approval</Button>
            <Button variant="secondary" loading={busy === "save"} disabled={!ready || busy !== null} onClick={() => save(false)}>Save as draft</Button>
            <Button variant="ghost" onClick={() => router.push("/manufacturing/receipts")}>Cancel</Button>
          </div>
        </Card>
      </div>

      <Card title="Output & by-products" className="mt-4" padded={false} actions={<div className="flex gap-2"><Button size="sm" variant="secondary" disabled={!order} onClick={() => setLines((ls) => [...ls, { ...blank("OUTPUT"), productId: order ? String(order.productId) : "", batchNo: order?.fgBatchNo ?? "" }])}><Plus className="h-3.5 w-3.5" /> Output lot</Button><Button size="sm" variant="secondary" disabled={!order} onClick={() => setLines((ls) => [...ls, blank("BY_PRODUCT")])}><Plus className="h-3.5 w-3.5" /> By-product</Button></div>}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="thead">
              <tr>
                <th className="th w-8">#</th>
                <th className="th w-28">Kind</th>
                <th className="th min-w-[220px]">Product</th>
                <th className="th w-28 text-right">Qty</th>
                <th className="th w-40">Lot no.</th>
                <th className="th w-36">Mfg</th>
                <th className="th w-36">Expiry</th>
                <th className="th w-24 text-right">MRP</th>
                <th className="th w-28 text-right">By-prod. rate</th>
                <th className="th">Note</th>
                <th className="th w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y-ui">
              {lines.map((l, i) => {
                const pv = bodyIndex[i] >= 0 ? preview?.lines.find((x) => x.index === bodyIndex[i]) : undefined;
                return (
                  <tr key={i}>
                    <td className="td text-slate-400">{i + 1}</td>
                    <td className="td"><StatusBadge value={l.kind} /></td>
                    <td className="td">
                      {l.kind === "OUTPUT" ? (
                        <span>{order ? productLabel(order.product) : "—"}</span>
                      ) : (
                        <Select value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })}>
                          <option value="">Select by-product…</option>
                          {products.map((m) => <option key={m.id} value={m.id}>{productLabel(m)}</option>)}
                        </Select>
                      )}
                      {lineError(i, "productId") && <span className="text-xs text-red-600">{lineError(i, "productId")}</span>}
                    </td>
                    <td className="td"><Input type="number" step="0.001" min="0" className="text-right" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />{lineError(i, "quantity") && <span className="text-xs text-red-600">{lineError(i, "quantity")}</span>}</td>
                    <td className="td"><Input className="font-mono" value={l.batchNo} placeholder={pv?.batchNo ?? order?.fgBatchNo ?? ""} onChange={(e) => setLine(i, { batchNo: e.target.value.toUpperCase() })} />{lineError(i, "batchNo") && <span className="text-xs text-red-600">{lineError(i, "batchNo")}</span>}</td>
                    <td className="td"><Input type="date" value={l.mfgDate} onChange={(e) => setLine(i, { mfgDate: e.target.value })} />{pv?.mfgDate && !l.mfgDate && <span className="text-xs text-slate-400">{fmtDate(pv.mfgDate)}</span>}</td>
                    <td className="td"><Input type="date" value={l.expiryDate} onChange={(e) => setLine(i, { expiryDate: e.target.value })} />{pv?.expiryDate && !l.expiryDate && <span className="text-xs text-slate-400">{fmtDate(pv.expiryDate)}</span>}{lineError(i, "expiryDate") && <span className="text-xs text-red-600">{lineError(i, "expiryDate")}</span>}</td>
                    <td className="td"><Input type="number" step="0.01" min="0" className="text-right" value={l.mrp} onChange={(e) => setLine(i, { mrp: e.target.value })} /></td>
                    <td className="td"><Input type="number" step="0.01" min="0" className="text-right" disabled={l.kind !== "BY_PRODUCT"} value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} /></td>
                    <td className="td"><Input value={l.note} onChange={(e) => setLine(i, { note: e.target.value })} /></td>
                    <td className="td"><button className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove line"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function NewProductionReceiptPage() {
  return (
    <Suspense>
      <NewReceiptInner />
    </Suspense>
  );
}
