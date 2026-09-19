"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, ApiError, type Issue } from "@/lib/api";
import { fmtDate, money, qty, today } from "@/lib/format";
import { productLabel, useMfgMasters, type Rec } from "@/lib/manufacturing";

interface Preview {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  plannedCost: string;
  fgBatchNo: string;
  fgMfgDate: string;
  fgExpiryDate: string | null;
  bom: { id: number; bomNo: string; version: number; name: string } | null;
  items: Rec[];
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const { products, warehouses } = useMfgMasters();
  const [f, setF] = useState({ productId: "", bomId: "", plannedQty: "", orderDate: today(), warehouseId: "", fgWarehouseId: "", plannedStartDate: "", plannedEndDate: "", fgBatchNo: "", fgMfgDate: "", fgExpiryDate: "", fgMrp: "", reference: "", notes: "" });
  const [boms, setBoms] = useState<Rec[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"validate" | "save" | "submit" | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const product = products.find((p) => String(p.id) === f.productId);
  const outputs = products.filter((p) => !p.productType || p.productType === "FINISHED_GOODS" || p.productType === "SEMI_FINISHED");

  useEffect(() => {
    if (!warehouses.length) return;
    const def = warehouses.find((w) => w.isDefault) ?? warehouses[0];
    setF((s) => ({ ...s, warehouseId: s.warehouseId || String(def.id), fgWarehouseId: s.fgWarehouseId || String(def.id) }));
  }, [warehouses]);

  useEffect(() => {
    if (!f.productId) return setBoms([]);
    api<{ items: Rec[] }>("/manufacturing/boms", { query: { productId: f.productId, status: "ACTIVE", pageSize: 50 } })
      .then((r) => {
        setBoms(r.items);
        const def = r.items.find((b) => b.isDefault) ?? r.items[0];
        setF((s) => ({ ...s, bomId: def ? String(def.id) : "", plannedQty: s.plannedQty || (product?.stdBatchSize ? String(product.stdBatchSize) : def ? String(def.batchSize) : "") }));
      })
      .catch(() => setBoms([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.productId]);

  const body = useMemo(
    () => ({
      productId: Number(f.productId),
      bomId: f.bomId ? Number(f.bomId) : null,
      plannedQty: f.plannedQty,
      orderDate: f.orderDate,
      warehouseId: f.warehouseId ? Number(f.warehouseId) : null,
      fgWarehouseId: f.fgWarehouseId ? Number(f.fgWarehouseId) : null,
      plannedStartDate: f.plannedStartDate || null,
      plannedEndDate: f.plannedEndDate || null,
      fgBatchNo: f.fgBatchNo || null,
      fgMfgDate: f.fgMfgDate || null,
      fgExpiryDate: f.fgExpiryDate || null,
      fgMrp: f.fgMrp || null,
      reference: f.reference || null,
      notes: f.notes || null,
    }),
    [f],
  );
  const ready = Boolean(f.productId && Number(f.plannedQty) > 0 && f.orderDate);

  // live explosion preview (debounced)
  useEffect(() => {
    if (!ready) return setPreview(null);
    const t = setTimeout(() => {
      api<Preview>("/manufacturing/orders/validate", { method: "POST", body }).then(setPreview).catch(() => setPreview(null));
    }, 400);
    return () => clearTimeout(t);
  }, [body, ready]);

  const fieldError = (name: string) => error?.errors.find((e) => e.field === name)?.message ?? preview?.errors.find((e) => e.field === name)?.message;

  async function save(submit: boolean) {
    setBusy(submit ? "submit" : "save");
    setError(null);
    try {
      const created = await api<{ id: number }>("/manufacturing/orders", { method: "POST", body: { ...body, submit } });
      router.push(`/manufacturing/orders?open=${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable — start the backend to save"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader title="Create Work Order" subtitle="Explodes the active BOM by planned quantity, fixes the finished-goods lot number and reserves the recipe cost." backHref="/manufacturing/orders" backLabel="Back to list" />
      {error && <Alert kind="error" title={error.message} items={error.errors} onClose={() => setError(null)} />}
      {preview && preview.errors.length > 0 && !error && <Alert kind="error" title="Fix these before saving" items={preview.errors} />}
      {preview && preview.warnings.length > 0 && <Alert kind="warning" title="Warnings" items={preview.warnings} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Order" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Product to manufacture" required error={fieldError("productId")} className="sm:col-span-2">
              <Select value={f.productId} onChange={(e) => set("productId", e.target.value)}>
                <option value="">Select product…</option>
                {outputs.map((p) => <option key={p.id} value={p.id}>{productLabel(p)}</option>)}
              </Select>
            </Field>
            <Field label="Order date" required error={fieldError("orderDate")}>
              <Input type="date" value={f.orderDate} onChange={(e) => set("orderDate", e.target.value)} />
            </Field>
            <Field label="BOM" required error={fieldError("bomId")} hint={boms.length === 0 && f.productId ? "No active BOM — create one first" : undefined}>
              <Select value={f.bomId} onChange={(e) => set("bomId", e.target.value)}>
                <option value="">Default active BOM</option>
                {boms.map((b) => <option key={b.id} value={b.id}>{b.bomNo} v{b.version} · {b.name}{b.isDefault ? " (default)" : ""}</option>)}
              </Select>
            </Field>
            <Field label="Planned quantity" required error={fieldError("plannedQty")}>
              <Input type="number" step="0.001" min="0" value={f.plannedQty} onChange={(e) => set("plannedQty", e.target.value)} />
            </Field>
            <Field label="Unit"><Input value={product?.unit ?? ""} disabled /></Field>
            <Field label="Issue materials from" required error={fieldError("warehouseId")}>
              <Select value={f.warehouseId} onChange={(e) => set("warehouseId", e.target.value)}>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Receive finished goods into" required error={fieldError("fgWarehouseId")}>
              <Select value={f.fgWarehouseId} onChange={(e) => set("fgWarehouseId", e.target.value)}>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Reference" hint="Customer PO / sales order ref">
              <Input value={f.reference} onChange={(e) => set("reference", e.target.value)} />
            </Field>
            <Field label="Planned start"><Input type="date" value={f.plannedStartDate} onChange={(e) => set("plannedStartDate", e.target.value)} /></Field>
            <Field label="Planned end"><Input type="date" value={f.plannedEndDate} onChange={(e) => set("plannedEndDate", e.target.value)} /></Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
              <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Finished-goods lot">
            <div className="grid gap-3">
              <Field label="FG batch no." hint={preview?.fgBatchNo && !f.fgBatchNo ? `Auto: ${preview.fgBatchNo}` : "Blank = work order number"} error={fieldError("fgBatchNo")}>
                <Input value={f.fgBatchNo} placeholder={preview?.fgBatchNo ?? "WO number"} onChange={(e) => set("fgBatchNo", e.target.value.toUpperCase())} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mfg date" hint={preview?.fgMfgDate && !f.fgMfgDate ? fmtDate(preview.fgMfgDate) : undefined}>
                  <Input type="date" value={f.fgMfgDate} onChange={(e) => set("fgMfgDate", e.target.value)} />
                </Field>
                <Field label="Expiry" hint={preview?.fgExpiryDate && !f.fgExpiryDate ? `Shelf life → ${fmtDate(preview.fgExpiryDate)}` : undefined} error={fieldError("fgExpiryDate")}>
                  <Input type="date" value={f.fgExpiryDate} onChange={(e) => set("fgExpiryDate", e.target.value)} />
                </Field>
              </div>
              <Field label="MRP"><Input type="number" step="0.01" min="0" value={f.fgMrp} placeholder={product?.mrp ?? ""} onChange={(e) => set("fgMrp", e.target.value)} /></Field>
            </div>
          </Card>
          <Card title="Summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">BOM</dt><dd>{preview?.bom ? `${preview.bom.bomNo} v${preview.bom.version}` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Components</dt><dd>{preview?.items.filter((i) => i.role === "COMPONENT").length ?? 0}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Planned material cost</dt><dd className="font-semibold">{money(preview?.plannedCost ?? 0)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Per unit</dt><dd>{money(preview && Number(f.plannedQty) > 0 ? Number(preview.plannedCost) / Number(f.plannedQty) : 0)}</dd></div>
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              <Button loading={busy === "submit"} disabled={!ready || busy !== null || (preview ? !preview.ok : false)} onClick={() => save(true)}>Save & submit for approval</Button>
              <Button variant="secondary" loading={busy === "save"} disabled={!ready || busy !== null} onClick={() => save(false)}>Save as draft</Button>
              <Button variant="ghost" onClick={() => router.push("/manufacturing/orders")}>Cancel</Button>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Exploded requirement" className="mt-4" padded={false}>
        <DataTable<Rec>
          bare
          empty={ready ? "Waiting for BOM explosion…" : "Choose a product and planned quantity to preview the material requirement"}
          columns={[
            { key: "product", header: "Material", render: (i) => <span>{i.product?.name ?? `#${i.productId}`}<span className="ml-1 text-xs text-slate-400">{i.product?.sku}</span></span> },
            { key: "role", header: "Role", render: (i) => <StatusBadge value={i.role} /> },
            { key: "plannedQty", header: "Required", align: "right", render: (i) => `${qty(i.plannedQty)} ${i.unit}` },
            { key: "estUnitCost", header: "Est. rate", align: "right", render: (i) => money(i.estUnitCost) },
            { key: "cost", header: "Est. cost", align: "right", render: (i) => (i.role === "COMPONENT" ? money(Number(i.plannedQty) * Number(i.estUnitCost)) : "—") },
          ]}
          rows={preview?.items ?? []}
        />
      </Card>
    </div>
  );
}
