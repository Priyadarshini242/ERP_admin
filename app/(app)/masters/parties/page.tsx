"use client";

import { Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DataTable, FilterBar, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { money, titleCase } from "@/lib/format";
import { useList } from "@/lib/hooks";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Party = Record<string, any>;

const EMPTY: Party = { code: "", name: "", partyType: "CUSTOMER", customerType: "B2C", gstin: "", pan: "", phone: "", email: "", address: "", city: "", state: "", stateCode: "", pincode: "", creditLimit: "0", creditDays: 0, isActive: true };

function PartiesPageInner() {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [role, setRole] = useState(["customer", "vendor"].includes(params.get("role") ?? "") ? params.get("role")! : "");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Party | null>(null);
  const { data, items, loading, error, reload } = useList<Party>("/masters/parties", { q, role, page, pageSize: 25 });

  const columns: Column<Party>[] = [
    { key: "code", header: "Code", render: (p) => <span className="font-mono text-xs">{p.code}</span> },
    { key: "name", header: "Name", render: (p) => <span className="font-medium text-slate-900 dark:text-white">{p.name}</span> },
    { key: "partyType", header: "Type", render: (p) => <span>{titleCase(p.partyType)} {p.customerType && <StatusBadge value={p.customerType} />}</span> },
    { key: "gstin", header: "GSTIN", render: (p) => p.gstin ?? "—" },
    { key: "phone", header: "Phone", render: (p) => p.phone ?? "—" },
    { key: "state", header: "State", render: (p) => p.state ? `${p.state} (${p.stateCode ?? "?"})` : "—" },
    { key: "creditLimit", header: "Credit limit", align: "right", render: (p) => (Number(p.creditLimit) ? `${money(p.creditLimit)} / ${p.creditDays}d` : "—") },
    { key: "isActive", header: "", render: (p) => (p.isActive ? null : <span className="rounded bg-slate-100 dark:bg-ink-700 px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">inactive</span>) },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{role === "customer" ? "Client Leads" : role === "vendor" ? "Suppliers" : "Customers & Vendors"}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">GSTIN drives B2B classification and the state code (IGST vs CGST/SGST)</p>
        </div>
        <Button onClick={() => setEdit({ ...EMPTY })}><Plus className="h-4 w-4" /> New party</Button>
      </div>
      <FilterBar>
        <Field label="Search" className="min-w-[220px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input className="pl-8" placeholder="name, code, GSTIN, phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="customer">Customers</option>
            <option value="vendor">Vendors</option>
          </Select>
        </Field>
      </FilterBar>
      <DataTable columns={columns} rows={items} loading={loading} error={error} onRowClick={setEdit} pagination={data ? { page: data.page, pages: data.pages, total: data.total, pageSize: data.pageSize, onPage: setPage } : undefined} />
      <PartyModal party={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />
    </div>
  );
}

function PartyModal({ party, onClose, onSaved }: { party: Party | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Party>(EMPTY);
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const k = party ? String(party.id ?? "new") : null;
  if (k !== key) {
    setKey(k);
    if (party) setForm({ ...EMPTY, ...party, creditLimit: String(party.creditLimit ?? 0), gstin: party.gstin ?? "", customerType: party.customerType ?? "B2C" });
    setError(null);
  }
  const set = (patch: Party) => setForm((f) => ({ ...f, ...patch }));
  const isCustomer = form.partyType === "CUSTOMER" || form.partyType === "BOTH";

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body: Party = {
        ...form,
        code: form.code || undefined,
        gstin: form.gstin || null,
        customerType: isCustomer ? form.customerType : null,
        creditDays: Number(form.creditDays || 0),
        pan: form.pan || null, phone: form.phone || null, email: form.email || null, address: form.address || null,
        city: form.city || null, state: form.state || null, stateCode: form.stateCode || null, pincode: form.pincode || null,
      };
      delete body.id; delete body.ledgerId; delete body.ledger; delete body.createdAt; delete body.updatedAt;
      if (party?.id) await api(`/masters/parties/${party.id}`, { method: "PUT", body });
      else await api("/masters/parties", { method: "POST", body });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(party)} title={party?.id ? `Edit ${party.name}` : "New customer / vendor"} onClose={onClose} width="max-w-2xl">
      {error && <Alert kind="error" title={error.message} items={error.errors} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="Name" required className="col-span-2"><Input value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Code" hint="auto if blank"><Input value={form.code ?? ""} onChange={(e) => set({ code: e.target.value })} /></Field>
        <Field label="Party type" required>
          <Select value={form.partyType} onChange={(e) => set({ partyType: e.target.value })}>
            <option value="CUSTOMER">Customer</option>
            <option value="VENDOR">Vendor</option>
            <option value="BOTH">Both</option>
          </Select>
        </Field>
        {isCustomer && (
          <Field label="Customer type">
            <Select value={form.customerType ?? "B2C"} onChange={(e) => set({ customerType: e.target.value })}>
              <option value="B2B">B2B (registered)</option>
              <option value="B2C">B2C</option>
            </Select>
          </Field>
        )}
        <Field label="GSTIN" hint="15 chars; sets state code"><Input value={form.gstin ?? ""} onChange={(e) => { const g = e.target.value.toUpperCase(); set({ gstin: g, stateCode: g.length >= 2 ? g.slice(0, 2) : form.stateCode }); }} maxLength={15} /></Field>
        <Field label="PAN"><Input value={form.pan ?? ""} onChange={(e) => set({ pan: e.target.value.toUpperCase() })} maxLength={10} /></Field>
        <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Address" className="col-span-2 md:col-span-3"><Textarea rows={2} value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} /></Field>
        <Field label="City"><Input value={form.city ?? ""} onChange={(e) => set({ city: e.target.value })} /></Field>
        <Field label="State"><Input value={form.state ?? ""} onChange={(e) => set({ state: e.target.value })} /></Field>
        <Field label="State code" hint="e.g. 33 = TN"><Input value={form.stateCode ?? ""} onChange={(e) => set({ stateCode: e.target.value })} maxLength={2} /></Field>
        <Field label="Pincode"><Input value={form.pincode ?? ""} onChange={(e) => set({ pincode: e.target.value })} /></Field>
        <Field label="Credit limit" hint="0 = no limit"><Input type="number" step="0.01" min="0" value={form.creditLimit} onChange={(e) => set({ creditLimit: e.target.value })} /></Field>
        <Field label="Credit days"><Input type="number" min="0" value={form.creditDays} onChange={(e) => set({ creditDays: e.target.value })} /></Field>
        <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 md:col-span-3">
          <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => set({ isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Active
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} loading={busy} disabled={!form.name}>Save</Button>
      </div>
    </Modal>
  );
}

export default function PartiesPage() {
  return (
    <Suspense>
      <PartiesPageInner />
    </Suspense>
  );
}
