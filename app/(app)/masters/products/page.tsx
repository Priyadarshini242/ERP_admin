"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";

import { DataTable, FilterBar, type Column } from "@/components/DataTable";
import { Alert, Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { money, n, qty } from "@/lib/format";
import { useList } from "@/lib/hooks";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Product = Record<string, any>;

const EMPTY: Product = { sku: "", name: "", description: "", category: "", hsnCode: "", unit: "PCS", purchasePrice: "0", sellingPrice: "0", mrp: "0", taxRate: "12", reorderLevel: "0", isActive: true };

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Product | null>(null);
  const { data, items, loading, error, reload } = useList<Product>("/masters/products", { q, page, pageSize: 25 });

  const columns: Column<Product>[] = [
    { key: "sku", header: "SKU", render: (p) => <span className="font-mono text-xs">{p.sku}</span> },
    { key: "name", header: "Product", render: (p) => <span className="font-medium text-slate-900 dark:text-white">{p.name}</span> },
    { key: "category", header: "Category", render: (p) => p.category ?? "—" },
    { key: "hsnCode", header: "HSN", render: (p) => p.hsnCode ?? "—" },
    { key: "unit", header: "Unit" },
    { key: "purchasePrice", header: "Cost", align: "right", render: (p) => money(p.purchasePrice) },
    { key: "sellingPrice", header: "Price", align: "right", render: (p) => money(p.sellingPrice) },
    { key: "taxRate", header: "GST %", align: "right", render: (p) => `${n(p.taxRate)}%` },
    { key: "stockQty", header: "Stock", align: "right", render: (p) => <span className={n(p.reorderLevel) > 0 && n(p.stockQty) <= n(p.reorderLevel) ? "text-amber-700 dark:text-amber-400" : ""}>{qty(p.stockQty)}</span> },
    { key: "isActive", header: "", render: (p) => (p.isActive ? null : <span className="rounded bg-slate-100 dark:bg-ink-700 px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">inactive</span>) },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Products</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Prices and GST rate default onto every document line; reorder level drives low-stock alerts</p>
        </div>
        <Button onClick={() => setEdit({ ...EMPTY })}><Plus className="h-4 w-4" /> New product</Button>
      </div>
      <FilterBar>
        <Field label="Search" className="min-w-[220px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input className="pl-8" placeholder="name, SKU, HSN" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </Field>
      </FilterBar>
      <DataTable columns={columns} rows={items} loading={loading} error={error} onRowClick={setEdit} pagination={data ? { page: data.page, pages: data.pages, total: data.total, pageSize: data.pageSize, onPage: setPage } : undefined} />
      <ProductModal product={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />
    </div>
  );
}

function ProductModal({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Product>(EMPTY);
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const k = product ? String(product.id ?? "new") : null;
  if (k !== key) {
    setKey(k);
    if (product) setForm({ ...EMPTY, ...product, purchasePrice: String(product.purchasePrice ?? 0), sellingPrice: String(product.sellingPrice ?? 0), mrp: String(product.mrp ?? 0), taxRate: String(product.taxRate ?? 0), reorderLevel: String(product.reorderLevel ?? 0) });
    setError(null);
  }
  const set = (patch: Product) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body: Product = { ...form, sku: form.sku || undefined, description: form.description || null, category: form.category || null, hsnCode: form.hsnCode || null };
      delete body.id; delete body.stockQty; delete body.stock; delete body.createdAt; delete body.updatedAt;
      if (product?.id) await api(`/masters/products/${product.id}`, { method: "PUT", body });
      else await api("/masters/products", { method: "POST", body });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(product)} title={product?.id ? `Edit ${product.name}` : "New product"} onClose={onClose} width="max-w-2xl">
      {error && <Alert kind="error" title={error.message} items={error.errors} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="Name" required className="col-span-2"><Input value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="SKU" hint="auto if blank"><Input value={form.sku ?? ""} onChange={(e) => set({ sku: e.target.value })} /></Field>
        <Field label="Category"><Input value={form.category ?? ""} onChange={(e) => set({ category: e.target.value })} /></Field>
        <Field label="HSN code"><Input value={form.hsnCode ?? ""} onChange={(e) => set({ hsnCode: e.target.value })} maxLength={10} /></Field>
        <Field label="Unit"><Input value={form.unit} onChange={(e) => set({ unit: e.target.value.toUpperCase() })} maxLength={10} /></Field>
        <Field label="Purchase price"><Input type="number" step="0.01" min="0" value={form.purchasePrice} onChange={(e) => set({ purchasePrice: e.target.value })} /></Field>
        <Field label="Selling price"><Input type="number" step="0.01" min="0" value={form.sellingPrice} onChange={(e) => set({ sellingPrice: e.target.value })} /></Field>
        <Field label="MRP"><Input type="number" step="0.01" min="0" value={form.mrp} onChange={(e) => set({ mrp: e.target.value })} /></Field>
        <Field label="GST rate %"><Input type="number" step="0.01" min="0" max="100" value={form.taxRate} onChange={(e) => set({ taxRate: e.target.value })} /></Field>
        <Field label="Reorder level" hint="0 = no alert"><Input type="number" step="any" min="0" value={form.reorderLevel} onChange={(e) => set({ reorderLevel: e.target.value })} /></Field>
        <label className="flex h-9 items-end gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => set({ isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Active
        </label>
        <Field label="Description" className="col-span-2 md:col-span-3"><Textarea rows={2} value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} /></Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} loading={busy} disabled={!form.name}>Save</Button>
      </div>
    </Modal>
  );
}
