"use client";

import clsx from "clsx";
import { Building2, Moon, Plus, Sun, Users, Warehouse } from "lucide-react";
import { useEffect, useState } from "react";

import { DataTable } from "@/components/DataTable";
import { useTheme } from "@/components/ThemeProvider";
import { Alert, Button, Card, Checkbox, Field, Input, Modal, PageHeader, Pill } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { AUTH_ENABLED, getUser, type AuthUser } from "@/lib/auth";
import { demoFor } from "@/lib/demo";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "QuickERP";
const TAGLINE = process.env.NEXT_PUBLIC_APP_TAGLINE ?? "Retail & Wholesale";
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "My Company";
const STATE_CODE = process.env.NEXT_PUBLIC_COMPANY_STATE_CODE ?? "33";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [warehouses, setWarehouses] = useState<Row[]>([]);
  const [users, setUsers] = useState<Row[] | null>(null);
  const [demo, setDemo] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);

  async function loadWarehouses() {
    try {
      setWarehouses(await api<Row[]>("/masters/warehouses"));
      setDemo(false);
    } catch (e) {
      if (!(e instanceof ApiError)) {
        setWarehouses(((demoFor("/masters/warehouses") as { items: Row[] } | null)?.items ?? []) as Row[]);
        setDemo(true);
      }
    }
  }

  useEffect(() => {
    setUser(getUser());
    void loadWarehouses();
    api<Row[]>("/auth/users")
      .then(setUsers)
      .catch(() => setUsers(null));
  }, []);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Appearance, company profile, warehouses and users" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Appearance">
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Choose how {APP} looks on this device.</p>
          <div className="grid grid-cols-2 gap-3">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={clsx(
                  "flex items-center gap-3 rounded-xl border p-4 text-left transition",
                  theme === t ? "border-brand-500 ring-2 ring-brand-500/30" : "border-slate-200 hover:border-slate-300 dark:border-ink-700 dark:hover:border-ink-700",
                )}
              >
                <span className={clsx("flex h-10 w-10 items-center justify-center rounded-lg", t === "light" ? "bg-amber-100 text-amber-600" : "bg-ink-800 text-sky-300")}>
                  {t === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{t === "light" ? "Light Theme" : "Dark Theme"}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{t === "light" ? "Default" : "Easier on the eyes at night"}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Company">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Kv k="Application" v={`${APP} · ${TAGLINE}`} />
            <Kv k="Company" v={COMPANY} />
            <Kv k="GST state code" v={STATE_CODE} />
            <Kv k="Signed in as" v={user ? `${user.fullName} (${user.role})` : "Administrator (open access)"} />
            <Kv k="Authentication" v={AUTH_ENABLED ? "Enabled (JWT)" : "Disabled — open access"} />
            <Kv k="API" v={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"} />
          </dl>
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Building2 className="h-3.5 w-3.5" /> Company details come from the environment files (frontend/.env.local, backend/.env).
          </p>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-slate-400" /> Warehouses {demo && <Pill tone="warning">offline · demo</Pill>}
            </span>
          }
          actions={
            <Button size="sm" onClick={() => setEdit({ code: "", name: "", address: "", isDefault: false, isActive: true })}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          }
          padded={false}
        >
          <DataTable
            bare
            columns={[
              { key: "code", header: "Code", render: (w) => <span className="font-mono text-xs">{w.code}</span> },
              { key: "name", header: "Name", render: (w) => <span className="font-medium text-slate-800 dark:text-slate-100">{w.name}</span> },
              { key: "address", header: "Address", render: (w) => w.address ?? "—" },
              { key: "flags", header: "", render: (w) => <span className="flex gap-1">{w.isDefault && <Pill tone="info">default</Pill>}{!w.isActive && <Pill>inactive</Pill>}</span> },
            ]}
            rows={warehouses}
            onRowClick={setEdit}
            empty="No warehouses"
          />
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" /> Users
            </span>
          }
          padded={false}
        >
          {users ? (
            <DataTable
              bare
              columns={[
                { key: "fullName", header: "Name", render: (u) => <span className="font-medium text-slate-800 dark:text-slate-100">{u.fullName}</span> },
                { key: "email", header: "Email" },
                { key: "role", header: "Role", render: (u) => <Pill tone={u.role === "ADMIN" ? "violet" : u.role === "MANAGER" ? "info" : "neutral"}>{u.role}</Pill> },
                { key: "isActive", header: "", render: (u) => (u.isActive ? <Pill tone="success">active</Pill> : <Pill>inactive</Pill>) },
              ]}
              rows={users}
              empty="No users"
            />
          ) : (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">User management is available once the API is running with an admin account.</p>
          )}
        </Card>
      </div>

      <WarehouseModal row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void loadWarehouses(); }} />
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{k}</dt>
      <dd className="truncate text-slate-800 dark:text-slate-100" title={v}>{v}</dd>
    </div>
  );
}

function WarehouseModal({ row, onClose, onSaved }: { row: Row | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Row>({});
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const k = row ? String(row.id ?? "new") : null;
  if (k !== key) {
    setKey(k);
    setForm(row ? { code: row.code, name: row.name, address: row.address ?? "", isDefault: Boolean(row.isDefault), isActive: row.isActive ?? true } : {});
    setError(null);
  }
  const set = (patch: Row) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, address: form.address || null };
      if (row?.id) await api(`/masters/warehouses/${row.id}`, { method: "PUT", body });
      else await api("/masters/warehouses", { method: "POST", body });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(row)} title={row?.id ? `Edit ${row.name}` : "New warehouse"} onClose={onClose} width="max-w-md">
      {error && <Alert kind="error" title={error.message} items={error.errors} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code" required><Input value={form.code ?? ""} onChange={(e) => set({ code: e.target.value.toUpperCase() })} maxLength={20} /></Field>
        <Field label="Name" required><Input value={form.name ?? ""} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Address" className="col-span-2"><Input value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} /></Field>
        <Checkbox label="Default warehouse" checked={Boolean(form.isDefault)} onChange={(e) => set({ isDefault: e.target.checked })} />
        <Checkbox label="Active" checked={form.isActive ?? true} onChange={(e) => set({ isActive: e.target.checked })} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} loading={busy} disabled={!form.code || !form.name}>Save</Button>
      </div>
    </Modal>
  );
}
