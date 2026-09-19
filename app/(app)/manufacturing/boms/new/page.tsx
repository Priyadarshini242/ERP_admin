"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/format";
import { productLabel, useMfgMasters } from "@/lib/manufacturing";

import { Alert, Button, Card, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";

interface Line {
  productId: string;
  role: "COMPONENT" | "BY_PRODUCT";
  quantity: string;
  unit: string;
  scrapPct: string;
  byProductValue: string;
  note: string;
}
const blank = (): Line => ({ productId: "", role: "COMPONENT", quantity: "1", unit: "", scrapPct: "0", byProductValue: "", note: "" });

export default function NewBomPage() {
  const router = useRouter();
  const { products } = useMfgMasters();
  const [f, setF] = useState({ productId: "", name: "", batchSize: "1", unit: "", expectedYieldPct: "100", yieldLowerLimitPct: "90", overheadPct: "0", shelfLifeDays: "", notes: "" });
  const [lines, setLines] = useState<Line[]>([blank(), blank()]);
  const [activate, setActivate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const product = products.find((p) => String(p.id) === f.productId);
  const outputs = products.filter((p) => !p.productType || p.productType === "FINISHED_GOODS" || p.productType === "SEMI_FINISHED");
  const materials = products.filter((p) => String(p.id) !== f.productId);

  const est = lines.reduce((s, l) => {
    const p = products.find((x) => String(x.id) === l.productId);
    if (!p || l.role !== "COMPONENT") return s;
    return s + Number(l.quantity || 0) * Number(p.purchasePrice || 0);
  }, 0);

  const fieldError = (name: string) => error?.errors.find((e) => e.field === name)?.message;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = {
        productId: Number(f.productId),
        name: f.name || `${product?.name ?? "BOM"} standard`,
        batchSize: f.batchSize,
        unit: f.unit || product?.unit || "PCS",
        expectedYieldPct: f.expectedYieldPct,
        yieldLowerLimitPct: f.yieldLowerLimitPct,
        overheadPct: f.overheadPct,
        shelfLifeDays: f.shelfLifeDays === "" ? null : Number(f.shelfLifeDays),
        notes: f.notes || null,
        items: lines
          .filter((l) => l.productId)
          .map((l) => ({
            productId: Number(l.productId),
            role: l.role,
            quantity: l.quantity,
            unit: l.unit || products.find((p) => String(p.id) === l.productId)?.unit || null,
            scrapPct: l.scrapPct || "0",
            byProductValue: l.role === "BY_PRODUCT" && l.byProductValue !== "" ? l.byProductValue : null,
            note: l.note || null,
          })),
      };
      const created = await api<{ id: number }>("/manufacturing/boms", { method: "POST", body });
      if (activate) await api(`/manufacturing/boms/${created.id}/activate`, { method: "POST" });
      router.push(`/manufacturing/boms?open=${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable — start the backend to save"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Bill of Materials" subtitle="Define the recipe once; every work order explodes it by planned quantity." backHref="/manufacturing/boms" backLabel="Back to list" />
      {error && <Alert kind="error" title={error.message} items={error.errors} onClose={() => setError(null)} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Output product" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Product" required error={fieldError("productId")} className="sm:col-span-2">
              <Select value={f.productId} onChange={(e) => { set("productId", e.target.value); const p = products.find((x) => String(x.id) === e.target.value); if (p && !f.unit) set("unit", p.unit); }}>
                <option value="">Select manufactured product…</option>
                {outputs.map((p) => <option key={p.id} value={p.id}>{productLabel(p)}</option>)}
              </Select>
            </Field>
            <Field label="BOM name" error={fieldError("name")}>
              <Input value={f.name} placeholder={product ? `${product.name} standard` : "e.g. Standard recipe"} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Batch size" required hint="Component quantities are per this batch" error={fieldError("batchSize")}>
              <Input type="number" step="0.001" min="0.001" value={f.batchSize} onChange={(e) => set("batchSize", e.target.value)} />
            </Field>
            <Field label="Unit">
              <Input value={f.unit} placeholder={product?.unit ?? "PCS"} onChange={(e) => set("unit", e.target.value)} />
            </Field>
            <Field label="Shelf life (days)" hint="Blank = product default">
              <Input type="number" min="0" value={f.shelfLifeDays} onChange={(e) => set("shelfLifeDays", e.target.value)} />
            </Field>
            <Field label="Expected yield %" error={fieldError("expectedYieldPct")}>
              <Input type="number" step="0.01" min="0" max="100" value={f.expectedYieldPct} onChange={(e) => set("expectedYieldPct", e.target.value)} />
            </Field>
            <Field label="Yield lower limit %" hint="Below this a deviation note is required to close" error={fieldError("yieldLowerLimitPct")}>
              <Input type="number" step="0.01" min="0" max="100" value={f.yieldLowerLimitPct} onChange={(e) => set("yieldLowerLimitPct", e.target.value)} />
            </Field>
            <Field label="Overhead %" hint="Absorbed into FG cost on top of material" error={fieldError("overheadPct")}>
              <Input type="number" step="0.01" min="0" value={f.overheadPct} onChange={(e) => set("overheadPct", e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
              <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card title="Summary">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Components</dt><dd>{lines.filter((l) => l.productId && l.role === "COMPONENT").length}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">By-products</dt><dd>{lines.filter((l) => l.productId && l.role === "BY_PRODUCT").length}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Est. material cost / batch</dt><dd className="font-semibold">{money(est)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Est. cost / unit</dt><dd>{money(Number(f.batchSize) > 0 ? est / Number(f.batchSize) : 0)}</dd></div>
          </dl>
          <div className="mt-4 border-t border-slate-200 pt-3 dark:border-ink-700">
            <Checkbox label="Activate immediately (becomes default recipe)" checked={activate} onChange={(e) => setActivate(e.target.checked)} />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Button loading={busy} disabled={!f.productId || !lines.some((l) => l.productId)} onClick={save}>Save BOM</Button>
            <Button variant="secondary" onClick={() => router.push("/manufacturing/boms")}>Cancel</Button>
          </div>
        </Card>
      </div>

      <Card title="Materials" className="mt-4" padded={false} actions={<Button size="sm" variant="secondary" onClick={() => setLines((ls) => [...ls, blank()])}><Plus className="h-3.5 w-3.5" /> Add line</Button>}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="thead">
              <tr>
                <th className="th w-8">#</th>
                <th className="th min-w-[260px]">Material</th>
                <th className="th">Role</th>
                <th className="th w-28 text-right">Qty / batch</th>
                <th className="th w-20">Unit</th>
                <th className="th w-24 text-right">Scrap %</th>
                <th className="th w-28 text-right">By-prod. value</th>
                <th className="th">Note</th>
                <th className="th w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y-ui">
              {lines.map((l, i) => {
                const p = products.find((x) => String(x.id) === l.productId);
                return (
                  <tr key={i}>
                    <td className="td text-slate-400">{i + 1}</td>
                    <td className="td">
                      <Select value={l.productId} onChange={(e) => { const np = products.find((x) => String(x.id) === e.target.value); setLine(i, { productId: e.target.value, unit: np?.unit ?? l.unit }); }}>
                        <option value="">Select material…</option>
                        {materials.map((m) => <option key={m.id} value={m.id}>{productLabel(m)}</option>)}
                      </Select>
                      {fieldError(`items[${i}].productId`) && <span className="text-xs text-red-600">{fieldError(`items[${i}].productId`)}</span>}
                    </td>
                    <td className="td">
                      <Select value={l.role} onChange={(e) => setLine(i, { role: e.target.value as Line["role"] })}>
                        <option value="COMPONENT">Component</option>
                        <option value="BY_PRODUCT">By-product</option>
                      </Select>
                    </td>
                    <td className="td"><Input type="number" step="0.001" min="0" className="text-right" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} /></td>
                    <td className="td"><Input value={l.unit} placeholder={p?.unit ?? ""} onChange={(e) => setLine(i, { unit: e.target.value })} /></td>
                    <td className="td"><Input type="number" step="0.01" min="0" className="text-right" disabled={l.role !== "COMPONENT"} value={l.scrapPct} onChange={(e) => setLine(i, { scrapPct: e.target.value })} /></td>
                    <td className="td"><Input type="number" step="0.01" min="0" className="text-right" disabled={l.role !== "BY_PRODUCT"} value={l.byProductValue} onChange={(e) => setLine(i, { byProductValue: e.target.value })} /></td>
                    <td className="td"><Input value={l.note} onChange={(e) => setLine(i, { note: e.target.value })} /></td>
                    <td className="td">
                      <button className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove line"><Trash2 className="h-4 w-4" /></button>
                    </td>
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
