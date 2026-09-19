"use client";

import { BookOpen, Plus, Search } from "lucide-react";
import { useState } from "react";

import { DataTable, FilterBar, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Field, Input, Modal, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { fmtDate, isoDate, money, titleCase } from "@/lib/format";
import { useFetch, useList } from "@/lib/hooks";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ledger = Record<string, any>;

const GROUPS = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

export default function AcLedgerPage() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const [statement, setStatement] = useState<Ledger | null>(null);
  const [edit, setEdit] = useState<Ledger | null | "new">(null);
  const { data, items, loading, error, reload } = useList<Ledger>("/register/ledgers", { q, group, page, pageSize: 50 });

  const columns: Column<Ledger>[] = [
    { key: "code", header: "Code", render: (l) => <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{l.code}</span> },
    { key: "name", header: "Ledger", render: (l) => <span className="font-medium text-slate-900 dark:text-white">{l.name}{l.isSystem && <span className="ml-2 rounded bg-slate-100 dark:bg-ink-700 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:text-slate-400">system</span>}</span> },
    { key: "group", header: "Group", render: (l) => titleCase(l.group) },
    { key: "parent", header: "Under", render: (l) => l.parent?.name ?? "—" },
    { key: "opening", header: "Opening", align: "right", render: (l) => <span>{money(l.openingBalance)} <StatusBadge value={l.openingType} /></span> },
    { key: "balance", header: "Balance", align: "right", render: (l) => <span className="font-medium tabular-nums">{money(l.balance)} <StatusBadge value={l.balanceType} /></span> },
    { key: "act", header: "", render: (l) => (
      <div className="flex gap-1">
        <button title="Statement" onClick={(e) => { e.stopPropagation(); setStatement(l); }} className="rounded p-1.5 text-slate-500 dark:text-slate-400 hover:bg-brand-50 hover:text-brand-700"><BookOpen className="h-4 w-4" /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">AC Ledger</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Chart of accounts with live balances. Customer and vendor sub-ledgers are created automatically under Receivables / Payables.</p>
        </div>
        <Button onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> New ledger</Button>
      </div>

      <FilterBar>
        <Field label="Search" className="min-w-[220px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input className="pl-8" placeholder="code or name" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </Field>
        <Field label="Group">
          <Select value={group} onChange={(e) => { setGroup(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {GROUPS.map((g) => <option key={g} value={g}>{titleCase(g)}</option>)}
          </Select>
        </Field>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        error={error}
        onRowClick={(l) => setEdit(l)}
        pagination={data ? { page: data.page, pages: data.pages, total: data.total, pageSize: data.pageSize, onPage: setPage } : undefined}
      />

      <StatementModal ledger={statement} onClose={() => setStatement(null)} />
      <LedgerModal ledger={edit} parents={items} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />
    </div>
  );
}

function StatementModal({ ledger, onClose }: { ledger: Ledger | null; onClose: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(isoDate());
  const { data, loading, error } = useFetch<any>(ledger ? `/register/ledgers/${ledger.id}/statement` : null, { from, to, pageSize: 500 });
  return (
    <Modal open={Boolean(ledger)} title={ledger ? `${ledger.code} · ${ledger.name}` : ""} onClose={onClose} width="max-w-4xl">
      <div className="mb-3 flex flex-wrap gap-3">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {error && <Alert kind="error" title={error} />}
      {data && (
        <div>
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Kv k="Opening" v={<>{money(data.opening.amount)} <StatusBadge value={data.opening.type} /></>} />
            <Kv k="Total debit" v={money(data.totals.debit)} />
            <Kv k="Total credit" v={money(data.totals.credit)} />
            <Kv k="Closing" v={<>{money(data.closing.amount)} <StatusBadge value={data.closing.type} /></>} />
          </div>
          <DataTable
            columns={[
              { key: "entryDate", header: "Date", render: (e: any) => fmtDate(e.entryDate) },
              { key: "voucher", header: "Voucher", render: (e: any) => <span>{titleCase(e.voucherType)} <span className="font-medium">{e.voucherNo}</span></span> },
              { key: "narration", header: "Narration", render: (e: any) => <span className="text-slate-500 dark:text-slate-400">{e.narration ?? ""}</span> },
              { key: "debit", header: "Debit", align: "right", render: (e: any) => (Number(e.debit) ? money(e.debit) : "") },
              { key: "credit", header: "Credit", align: "right", render: (e: any) => (Number(e.credit) ? money(e.credit) : "") },
              { key: "balance", header: "Balance", align: "right", render: (e: any) => <span className="tabular-nums">{money(e.balance)} {e.balanceType}</span> },
            ]}
            rows={data.items}
            loading={loading}
            empty="No entries in this period"
          />
        </div>
      )}
    </Modal>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-200 dark:border-ink-700 p-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{k}</p>
      <p className="font-medium text-slate-800 dark:text-slate-100">{v}</p>
    </div>
  );
}

function LedgerModal({ ledger, parents, onClose, onSaved }: { ledger: Ledger | null | "new"; parents: Ledger[]; onClose: () => void; onSaved: () => void }) {
  const isNew = ledger === "new";
  const l = isNew ? null : ledger;
  const [form, setForm] = useState<Record<string, any>>({});
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const k = ledger ? (isNew ? "new" : String(l!.id)) : null;
  if (k !== key) {
    setKey(k);
    setForm(l ? { code: l.code, name: l.name, group: l.group, parentId: l.parentId ?? "", openingBalance: String(l.openingBalance), openingType: l.openingType, isActive: l.isActive } : { code: "", name: "", group: "EXPENSE", parentId: "", openingBalance: "0", openingType: "DR", isActive: true });
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, parentId: form.parentId ? Number(form.parentId) : null };
      if (isNew) await api("/register/ledgers", { method: "POST", body });
      else await api(`/register/ledgers/${l!.id}`, { method: "PUT", body });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setBusy(false);
    }
  }

  const set = (patch: Record<string, any>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Modal open={Boolean(ledger)} title={isNew ? "New ledger" : `Edit ${l?.name}`} onClose={onClose} width="max-w-lg">
      {error && <Alert kind="error" title={error.message} items={error.errors} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code" required><Input value={form.code ?? ""} onChange={(e) => set({ code: e.target.value })} disabled={Boolean(l?.isSystem)} /></Field>
        <Field label="Group" required>
          <Select value={form.group ?? ""} onChange={(e) => set({ group: e.target.value })} disabled={Boolean(l?.isSystem)}>
            {GROUPS.map((g) => <option key={g} value={g}>{titleCase(g)}</option>)}
          </Select>
        </Field>
        <Field label="Name" required className="col-span-2"><Input value={form.name ?? ""} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Under (parent)" className="col-span-2">
          <Select value={form.parentId ?? ""} onChange={(e) => set({ parentId: e.target.value })}>
            <option value="">— none —</option>
            {parents.filter((p) => p.id !== l?.id).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </Select>
        </Field>
        <Field label="Opening balance"><Input type="number" step="0.01" value={form.openingBalance ?? "0"} onChange={(e) => set({ openingBalance: e.target.value })} /></Field>
        <Field label="Opening type">
          <Select value={form.openingType ?? "DR"} onChange={(e) => set({ openingType: e.target.value })}>
            <option value="DR">Debit</option>
            <option value="CR">Credit</option>
          </Select>
        </Field>
        <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => set({ isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Active
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} loading={busy} disabled={!form.code || !form.name}>Save</Button>
      </div>
    </Modal>
  );
}
