"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { fmtDate, qty, today } from "@/lib/format";
import { productLabel, QC_TYPES, useMfgMasters, type Rec } from "@/lib/manufacturing";

function NewQcInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { products } = useMfgMasters();
  const [f, setF] = useState({ productId: params.get("productId") ?? "", batchId: params.get("batchId") ?? "", type: "MANUAL", inspectionDate: today(), sampleQty: "", arNo: "", remarks: "" });
  const [batches, setBatches] = useState<Rec[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!f.productId) return setBatches([]);
    api<{ items: Rec[] }>("/inventory/batches", { query: { productId: f.productId, pageSize: 200 } })
      .then((r) => setBatches(r.items))
      .catch(() => setBatches([]));
  }, [f.productId]);

  const batch = batches.find((b) => String(b.id) === f.batchId);
  const fieldError = (name: string) => error?.errors.find((e) => e.field === name)?.message;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: number }>("/manufacturing/qc", { method: "POST", body: { batchId: Number(f.batchId), type: f.type, inspectionDate: f.inspectionDate, sampleQty: f.sampleQty || null, arNo: f.arNo || null, remarks: f.remarks || null } });
      router.push(`/manufacturing/qc?open=${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable — start the backend to save"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="New QC Inspection" subtitle="Open an inspection on any lot (incoming, finished or retest). Findings and the decision are recorded on the inspection before it goes for approval." backHref="/manufacturing/qc" backLabel="Back to list" />
      {error && <Alert kind="error" title={error.message} items={error.errors} onClose={() => setError(null)} />}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Lot under test" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product" required>
              <Select value={f.productId} onChange={(e) => { set("productId", e.target.value); set("batchId", ""); }}>
                <option value="">Select product…</option>
                {products.filter((p) => p.trackBatches !== false).map((p) => <option key={p.id} value={p.id}>{productLabel(p)}</option>)}
              </Select>
            </Field>
            <Field label="Lot / batch" required error={fieldError("batchId")}>
              <Select value={f.batchId} onChange={(e) => set("batchId", e.target.value)} disabled={!f.productId}>
                <option value="">{f.productId ? "Select lot…" : "Choose a product first"}</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.batchNo} · {b.qcStatus} · on hand {qty(b.onHand)}{b.expiryDate ? ` · exp ${fmtDate(b.expiryDate)}` : ""}</option>)}
              </Select>
            </Field>
            <Field label="Inspection type">
              <Select value={f.type} onChange={(e) => set("type", e.target.value)}>
                {QC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Date" required error={fieldError("inspectionDate")}><Input type="date" value={f.inspectionDate} onChange={(e) => set("inspectionDate", e.target.value)} /></Field>
            <Field label="Sample qty"><Input type="number" step="0.001" min="0" value={f.sampleQty} onChange={(e) => set("sampleQty", e.target.value)} /></Field>
            <Field label="A.R. No."><Input value={f.arNo} onChange={(e) => set("arNo", e.target.value)} /></Field>
            <Field label="Remarks" className="sm:col-span-2"><Textarea rows={3} value={f.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field>
          </div>
        </Card>
        <Card title="Lot summary">
          {batch ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Lot</dt><dd className="font-mono">{batch.batchNo}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">QC status</dt><dd><StatusBadge value={batch.qcStatus} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Operational</dt><dd><StatusBadge value={batch.status} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">On hand</dt><dd>{qty(batch.onHand)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Mfg → expiry</dt><dd>{batch.mfgDate ? fmtDate(batch.mfgDate) : "—"} → {batch.expiryDate ? fmtDate(batch.expiryDate) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Source</dt><dd>{batch.sourceRefNo ?? batch.sourceRefType ?? "—"}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-slate-400">Pick a lot to see its status.</p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Button loading={busy} disabled={!f.batchId || !f.inspectionDate} onClick={save}>Open inspection</Button>
            <Button variant="ghost" onClick={() => router.push("/manufacturing/qc")}>Cancel</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function NewQcPage() {
  return (
    <Suspense>
      <NewQcInner />
    </Suspense>
  );
}
