"use client";

import { ArrowDown, ArrowUp, Search, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Card, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { fmtDate, qty } from "@/lib/format";
import { productLabel, useMfgMasters, type Rec } from "@/lib/manufacturing";

interface Trace {
  batch: Rec;
  ancestors: Rec[];
  descendants: Rec[];
  suppliers: Rec[];
  customers: Rec[];
}
interface Recall {
  batch: Rec;
  affectedBatches: number;
  descendants: Rec[];
  onHand: Rec[];
  customers: Rec[];
  totalShipped: string;
}

function GenealogyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { products } = useMfgMasters();
  const [productId, setProductId] = useState("");
  const [batches, setBatches] = useState<Rec[]>([]);
  const [batchId, setBatchId] = useState(params.get("batchId") ?? "");
  const [trace, setTrace] = useState<Trace | null>(null);
  const [recall, setRecall] = useState<Recall | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [blocked, setBlocked] = useState<number | null>(null);

  useEffect(() => {
    if (!productId) return setBatches([]);
    api<{ items: Rec[] }>("/inventory/batches", { query: { productId, pageSize: 200 } }).then((r) => setBatches(r.items)).catch(() => setBatches([]));
  }, [productId]);

  useEffect(() => {
    if (!batchId) {
      setTrace(null);
      setRecall(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([api<Trace>(`/manufacturing/genealogy/${batchId}`), api<Recall>(`/manufacturing/recall/${batchId}`)])
      .then(([t, r]) => {
        if (!alive) return;
        setTrace(t);
        setRecall(r);
        if (!productId) setProductId(String(t.batch.productId));
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "API not reachable — genealogy needs the backend running"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  function pick(id: string) {
    setBatchId(id);
    router.replace(id ? `/manufacturing/genealogy?batchId=${id}` : "/manufacturing/genealogy");
  }

  async function block() {
    setBlocking(true);
    try {
      const r = await api<{ blocked: number }>(`/manufacturing/recall/${batchId}/block`, { method: "POST", body: { reason } });
      setBlocked(r.blocked);
      setBlockOpen(false);
      setReason("");
      const [t, rc] = await Promise.all([api<Trace>(`/manufacturing/genealogy/${batchId}`), api<Recall>(`/manufacturing/recall/${batchId}`)]);
      setTrace(t);
      setRecall(rc);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "API not reachable");
    } finally {
      setBlocking(false);
    }
  }

  const b = trace?.batch;
  return (
    <div>
      <PageHeader title="Genealogy & Recall" subtitle="Trace any lot backwards to its supplier batches and forwards through every production generation to the customers who received it." />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Product">
            <Select value={productId} onChange={(e) => { setProductId(e.target.value); pick(""); }}>
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{productLabel(p)}</option>)}
            </Select>
          </Field>
          <Field label="Lot / batch">
            <Select value={batchId} onChange={(e) => pick(e.target.value)} disabled={!productId}>
              <option value="">{productId ? "Select lot…" : "Choose a product first"}</option>
              {batches.map((x) => <option key={x.id} value={x.id}>{x.batchNo} · {x.qcStatus} · on hand {qty(x.onHand)}</option>)}
            </Select>
          </Field>
          <Field label="Or batch id">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-8" placeholder="e.g. 12" defaultValue={batchId} onKeyDown={(e) => { if (e.key === "Enter") pick((e.target as HTMLInputElement).value.trim()); }} />
            </div>
          </Field>
        </div>
      </Card>

      {error && <Alert kind="error" title={error} onClose={() => setError(null)} />}
      {blocked != null && <Alert kind="success" title={`${blocked} batch${blocked === 1 ? "" : "es"} placed on recall hold`} onClose={() => setBlocked(null)} />}
      {loading && <p className="text-sm text-slate-400">Tracing…</p>}

      {b && recall && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Lot</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white"><span className="font-mono">{b.batchNo}</span> <span className="text-base font-medium text-slate-500">{b.product?.name}</span></p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <StatusBadge value={b.qcStatus} />
                  <StatusBadge value={b.status} />
                  <StatusBadge value={b.product?.productType} />
                  <span>mfg {b.mfgDate ? fmtDate(b.mfgDate) : "—"} · exp {b.expiryDate ? fmtDate(b.expiryDate) : "—"}</span>
                  {b.productionOrder && <Link className="text-brand-700 hover:underline dark:text-brand-400" href={`/manufacturing/orders?open=${b.productionOrder.id}`}>made on {b.productionOrder.orderNo}</Link>}
                  {b.sourceRefNo && <span>source {b.sourceRefNo}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/manufacturing/qc/new?productId=${b.productId}&batchId=${b.id}`}><Button variant="secondary" size="sm">Open QC inspection</Button></Link>
                <Button variant="danger" size="sm" onClick={() => setBlockOpen(true)}><ShieldAlert className="h-4 w-4" /> Recall hold ({recall.affectedBatches})</Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[
                ["Upstream lots", trace!.ancestors.length],
                ["Downstream lots", trace!.descendants.length],
                ["Shipped to customers", `${qty(recall.totalShipped)} · ${recall.customers.length} cust.`],
                ["On hand (all affected)", qty(recall.onHand.reduce((s, r) => s + Number(r.quantity), 0))],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-ink-700 dark:bg-ink-900/40">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{v}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={<span className="inline-flex items-center gap-2"><ArrowUp className="h-4 w-4 text-sky-500" /> Upstream — what went into it</span>} padded={false}>
              <DataTable<Rec>
                bare
                empty="No parent lots (purchased or legacy stock)"
                columns={[
                  { key: "depth", header: "Gen", render: (r) => `−${r.depth}` },
                  { key: "batchNo", header: "Lot", render: (r) => <button className="font-mono text-brand-700 hover:underline dark:text-brand-400" onClick={() => pick(String(r.batchId))}>{r.batchNo}</button> },
                  { key: "product", header: "Product", render: (r) => <span>{r.productName}<span className="ml-1 text-xs text-slate-400">{r.sku}</span></span> },
                  { key: "quantity", header: "Consumed", align: "right", render: (r) => qty(r.quantity) },
                  { key: "via", header: "Via", render: (r) => <Link className="text-xs text-brand-700 hover:underline dark:text-brand-400" href={`/manufacturing/orders?open=${r.via.productionOrderId}`}>{r.via.orderNo}</Link> },
                  { key: "qcStatus", header: "QC", render: (r) => <StatusBadge value={r.qcStatus} /> },
                ]}
                rows={trace!.ancestors}
                rowKey={(r) => r.batchId}
              />
              <div className="border-t border-slate-200 dark:border-ink-700">
                <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Supplier receipts</p>
                <DataTable<Rec>
                  bare
                  empty="No purchase receipts in this chain"
                  columns={[
                    { key: "batchNo", header: "Lot", render: (r) => <span className="font-mono text-xs">{r.batchNo}</span> },
                    { key: "bill", header: "Bill", render: (r) => (r.bill ? <Link className="text-brand-700 hover:underline dark:text-brand-400" href={`/purchase/register?open=${r.bill.id}`}>{r.bill.billNo}</Link> : "—") },
                    { key: "vendor", header: "Vendor", render: (r) => r.bill?.vendor?.name ?? "—" },
                    { key: "date", header: "Date", render: (r) => fmtDate(r.date) },
                    { key: "quantity", header: "Qty", align: "right", render: (r) => qty(r.quantity) },
                  ]}
                  rows={trace!.suppliers}
                  rowKey={(r) => `${r.batchId}-${r.bill?.id ?? ""}-${r.date}`}
                />
              </div>
            </Card>

            <Card title={<span className="inline-flex items-center gap-2"><ArrowDown className="h-4 w-4 text-emerald-500" /> Downstream — where it went</span>} padded={false}>
              <DataTable<Rec>
                bare
                empty="Not consumed by any production order"
                columns={[
                  { key: "depth", header: "Gen", render: (r) => `+${r.depth}` },
                  { key: "batchNo", header: "Lot", render: (r) => <button className="font-mono text-brand-700 hover:underline dark:text-brand-400" onClick={() => pick(String(r.batchId))}>{r.batchNo}</button> },
                  { key: "product", header: "Product", render: (r) => <span>{r.productName}<span className="ml-1 text-xs text-slate-400">{r.sku}</span></span> },
                  { key: "quantity", header: "Produced", align: "right", render: (r) => qty(r.quantity) },
                  { key: "via", header: "Via", render: (r) => <Link className="text-xs text-brand-700 hover:underline dark:text-brand-400" href={`/manufacturing/orders?open=${r.via.productionOrderId}`}>{r.via.orderNo}</Link> },
                  { key: "qcStatus", header: "QC", render: (r) => <span className="inline-flex gap-1"><StatusBadge value={r.qcStatus} />{r.status !== "ACTIVE" && <StatusBadge value={r.status} />}</span> },
                ]}
                rows={trace!.descendants}
                rowKey={(r) => r.batchId}
              />
              <div className="border-t border-slate-200 dark:border-ink-700">
                <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Customers affected</p>
                <DataTable<Rec>
                  bare
                  empty="Nothing shipped yet"
                  columns={[
                    { key: "name", header: "Customer" },
                    { key: "phone", header: "Phone", render: (r) => r.phone ?? "—" },
                    { key: "invoices", header: "Invoices", render: (r) => r.invoices.join(", ") },
                    { key: "quantity", header: "Qty", align: "right", render: (r) => qty(r.quantity) },
                  ]}
                  rows={recall.customers}
                  rowKey={(r) => r.customerId}
                />
              </div>
            </Card>
          </div>

          <Card title="On-hand stock in the affected chain" padded={false}>
            <DataTable<Rec>
              bare
              empty="No stock on hand in any affected lot"
              columns={[
                { key: "batchNo", header: "Lot", render: (r) => <span className="font-mono text-xs">{r.batchNo}</span> },
                { key: "product", header: "Product" },
                { key: "warehouse", header: "Warehouse", render: (r) => r.warehouse?.name },
                { key: "quantity", header: "Qty", align: "right", render: (r) => qty(r.quantity) },
              ]}
              rows={recall.onHand}
              rowKey={(r) => `${r.batchId}-${r.warehouse?.id}`}
            />
          </Card>
        </div>
      )}

      {!batchId && !loading && (
        <Card>
          <p className="text-sm text-slate-500">Select a lot above, or open one from a work order, QC inspection or Stock Management batch view.</p>
        </Card>
      )}

      <Modal open={blockOpen} title="Recall hold" onClose={() => setBlockOpen(false)}>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          This blocks <b>{recall?.affectedBatches ?? 0}</b> batch{recall?.affectedBatches === 1 ? "" : "es"} (this lot and everything made from it). Sales and production issues from those lots stop immediately; returns and adjustments stay allowed.
        </p>
        <Field label="Reason" required>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Market complaint MC-2026-014 — potency out of spec" />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setBlockOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={blocking} disabled={reason.trim().length < 3} onClick={block}>Place hold</Button>
        </div>
      </Modal>
    </div>
  );
}

export default function GenealogyPage() {
  return (
    <Suspense>
      <GenealogyInner />
    </Suspense>
  );
}
