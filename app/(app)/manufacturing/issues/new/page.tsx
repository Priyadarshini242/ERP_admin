"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, ApiError, type Issue } from "@/lib/api";
import { fmtDate, money, qty, today } from "@/lib/format";
import { batchLabel, lookupBatches, productLabel, useMfgMasters, type BatchOption, type Rec } from "@/lib/manufacturing";

interface Line {
  productId: string;
  batchId: string;
  quantity: string;
  note: string;
  batches: BatchOption[];
}
interface Preview {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  lines: { index: number; productId: number; batchId: number | null; allocations: { batchId: number; batchNo: string; quantity: string }[]; planned: { plannedQty: string; issuedQty: string; returnedQty: string } | null }[];
}

const blank = (): Line => ({ productId: "", batchId: "", quantity: "", note: "", batches: [] });

function NewMaterialIssueInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { products } = useMfgMasters();
  const [orders, setOrders] = useState<Rec[]>([]);
  const [order, setOrder] = useState<Rec | null>(null);
  const [f, setF] = useState({ orderId: params.get("orderId") ?? "", type: (params.get("type") === "RETURN" ? "RETURN" : "ISSUE") as "ISSUE" | "RETURN", issueDate: today(), notes: "" });
  const [lines, setLines] = useState<Line[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  // open work orders
  useEffect(() => {
    Promise.all([api<{ items: Rec[] }>("/manufacturing/orders", { query: { status: "RELEASED", pageSize: 100 } }), api<{ items: Rec[] }>("/manufacturing/orders", { query: { status: "IN_PROGRESS", pageSize: 100 } })])
      .then(([a, b]) => setOrders([...a.items, ...b.items].sort((x, y) => x.orderNo.localeCompare(y.orderNo))))
      .catch(() => setOrders([]));
  }, []);

  // load the chosen order and seed lines from its open components
  useEffect(() => {
    if (!f.orderId) return setOrder(null);
    api<Rec>(`/manufacturing/orders/${f.orderId}`)
      .then(async (o) => {
        setOrder(o);
        const comps: Rec[] = (o.items ?? []).filter((i: Rec) => i.role === "COMPONENT");
        const seeded: Line[] = await Promise.all(
          comps.map(async (i: Rec) => {
            const balance = f.type === "ISSUE" ? Number(i.plannedQty) - Number(i.issuedQty) + Number(i.returnedQty) : Number(i.issuedQty) - Number(i.returnedQty);
            const batches = i.product?.trackBatches ? await lookupBatches(i.productId, o.warehouseId, f.issueDate, f.type === "RETURN") : [];
            return { productId: String(i.productId), batchId: "", quantity: balance > 0 ? balance.toFixed(3) : "", note: "", batches };
          }),
        );
        setLines(seeded.filter((l) => l.quantity !== "").length ? seeded.filter((l) => l.quantity !== "") : seeded);
      })
      .catch(() => setOrder(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.orderId, f.type]);

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  async function changeProduct(i: number, productId: string) {
    const p = products.find((x) => String(x.id) === productId);
    const batches = p?.trackBatches && order ? await lookupBatches(Number(productId), order.warehouseId, f.issueDate, f.type === "RETURN") : [];
    setLine(i, { productId, batchId: "", batches });
  }

  const body = useMemo(
    () => ({
      orderId: Number(f.orderId),
      type: f.type,
      issueDate: f.issueDate,
      notes: f.notes || null,
      items: lines.filter((l) => l.productId && Number(l.quantity) > 0).map((l) => ({ productId: Number(l.productId), batchId: l.batchId ? Number(l.batchId) : null, quantity: l.quantity, note: l.note || null })),
    }),
    [f, lines],
  );
  const ready = Boolean(f.orderId && f.issueDate && body.items.length);
  // position of each visual line inside body.items (blank lines are skipped)
  const bodyIndex = lines.reduce<number[]>((acc, l) => { acc.push(l.productId && Number(l.quantity) > 0 ? acc.filter((x) => x >= 0).length : -1); return acc; }, []);

  useEffect(() => {
    if (!ready) return setPreview(null);
    const t = setTimeout(() => api<Preview>("/manufacturing/issues/validate", { method: "POST", body }).then(setPreview).catch(() => setPreview(null)), 400);
    return () => clearTimeout(t);
  }, [body, ready]);

  const fieldError = (name: string) => error?.errors.find((e) => e.field === name)?.message ?? preview?.errors.find((e) => e.field === name)?.message;
  const lineError = (i: number, col: string) => (bodyIndex[i] >= 0 ? fieldError(`items[${bodyIndex[i]}].${col}`) : undefined);
  const total = lines.reduce((s, l) => {
    const b = l.batches.find((x) => String(x.batchId) === l.batchId);
    const p = products.find((x) => String(x.id) === l.productId);
    return s + Number(l.quantity || 0) * Number(b?.unitCost ?? p?.purchasePrice ?? 0);
  }, 0);

  async function save(submit: boolean) {
    setBusy(submit ? "submit" : "save");
    setError(null);
    try {
      const created = await api<{ id: number }>("/manufacturing/issues", { method: "POST", body: { ...body, submit } });
      router.push(`/manufacturing/issues?open=${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable — start the backend to save"));
    } finally {
      setBusy(null);
    }
  }

  const isReturn = f.type === "RETURN";
  return (
    <div>
      <PageHeader title={isReturn ? "New Material Return" : "New Material Issue"} subtitle={isReturn ? "Return unused material from the shop floor to stores — the original batch is required." : "Issue components to a released work order. Leave the batch blank to let the system pick FEFO at posting."} backHref="/manufacturing/issues" backLabel="Back to list" />
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
            <Field label="Type">
              <Select value={f.type} onChange={(e) => set("type", e.target.value)}>
                <option value="ISSUE">Issue to production</option>
                <option value="RETURN">Return to stores</option>
              </Select>
            </Field>
            <Field label="Date" required error={fieldError("issueDate")}>
              <Input type="date" value={f.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-4">
              <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          {order && (
            <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-ink-700 dark:bg-ink-900/40 sm:grid-cols-4">
              <div><span className="text-slate-400">Product</span><br /><b>{order.product?.name}</b></div>
              <div><span className="text-slate-400">Store</span><br /><b>{order.warehouse?.name}</b></div>
              <div><span className="text-slate-400">Status</span><br /><StatusBadge value={order.status} /></div>
              <div><span className="text-slate-400">Issued so far</span><br /><b>{money(order.issuedCost)}</b></div>
            </div>
          )}
        </Card>

        <Card title="Summary">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Lines</dt><dd>{body.items.length}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Estimated cost</dt><dd className="font-semibold">{money(total)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Ledger</dt><dd className="text-xs">{isReturn ? "Dr Inventory / Cr WIP" : "Dr WIP / Cr Inventory"}</dd></div>
          </dl>
          <div className="mt-4 flex flex-col gap-2">
            <Button loading={busy === "submit"} disabled={!ready || busy !== null || (preview ? !preview.ok : false)} onClick={() => save(true)}>Save & submit for approval</Button>
            <Button variant="secondary" loading={busy === "save"} disabled={!ready || busy !== null} onClick={() => save(false)}>Save as draft</Button>
            <Button variant="ghost" onClick={() => router.push("/manufacturing/issues")}>Cancel</Button>
          </div>
        </Card>
      </div>

      <Card title="Materials" className="mt-4" padded={false} actions={<Button size="sm" variant="secondary" disabled={!order} onClick={() => setLines((ls) => [...ls, blank()])}><Plus className="h-3.5 w-3.5" /> Add line</Button>}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="thead">
              <tr>
                <th className="th w-8">#</th>
                <th className="th min-w-[240px]">Material</th>
                <th className="th min-w-[260px]">Batch</th>
                <th className="th w-28 text-right">Qty</th>
                <th className="th w-32 text-right">Plan · issued</th>
                <th className="th">FEFO preview</th>
                <th className="th">Note</th>
                <th className="th w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y-ui">
              {lines.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">{order ? "No open components — add a line" : "Choose a work order to load its components"}</td></tr>
              )}
              {lines.map((l, i) => {
                const p = products.find((x) => String(x.id) === l.productId);
                const pv = bodyIndex[i] >= 0 ? preview?.lines.find((x) => x.index === bodyIndex[i]) : undefined;
                const oi = order?.items?.find((x: Rec) => String(x.productId) === l.productId);
                return (
                  <tr key={i}>
                    <td className="td text-slate-400">{i + 1}</td>
                    <td className="td">
                      <Select value={l.productId} onChange={(e) => changeProduct(i, e.target.value)}>
                        <option value="">Select material…</option>
                        {products.map((m) => <option key={m.id} value={m.id}>{productLabel(m)}</option>)}
                      </Select>
                      {lineError(i, "productId") && <span className="text-xs text-red-600">{lineError(i, "productId")}</span>}
                    </td>
                    <td className="td">
                      {p?.trackBatches ? (
                        <Select value={l.batchId} onChange={(e) => setLine(i, { batchId: e.target.value })}>
                          <option value="">{isReturn ? "Select original batch…" : "Auto (FEFO at post)"}</option>
                          {l.batches.map((b) => <option key={b.batchId} value={b.batchId} disabled={!isReturn && b.sellable === false}>{batchLabel(b)}</option>)}
                        </Select>
                      ) : (
                        <span className="text-xs text-slate-400">not batch-tracked</span>
                      )}
                      {lineError(i, "batchId") && <span className="text-xs text-red-600">{lineError(i, "batchId")}</span>}
                    </td>
                    <td className="td">
                      <Input type="number" step="0.001" min="0" className="text-right" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                      {lineError(i, "quantity") && <span className="text-xs text-red-600">{lineError(i, "quantity")}</span>}
                    </td>
                    <td className="td text-right text-xs text-slate-500">{oi ? `${qty(oi.plannedQty)} · ${qty(Number(oi.issuedQty) - Number(oi.returnedQty))}` : <span className="text-amber-600">unplanned</span>}</td>
                    <td className="td text-xs">
                      {pv?.allocations?.length ? pv.allocations.map((a) => <span key={a.batchId} className="mr-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-ink-800">{a.batchNo} × {qty(a.quantity)}</span>) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td"><Input value={l.note} onChange={(e) => setLine(i, { note: e.target.value })} /></td>
                    <td className="td"><button className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove line"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {order?.fgExpiryDate && <p className="px-4 py-2 text-xs text-slate-400">FG lot {order.fgBatchNo} expires {fmtDate(order.fgExpiryDate)} — components expiring before that are flagged by validation.</p>}
      </Card>
    </div>
  );
}

export default function NewMaterialIssuePage() {
  return (
    <Suspense>
      <NewMaterialIssueInner />
    </Suspense>
  );
}
