"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { api, ApiError } from "@/lib/api";
import { approvalLabel, type ApprovalDocType, type ApprovalState } from "@/lib/approvals";
import { titleCase } from "@/lib/format";
import { useList } from "@/lib/hooks";

import { ApprovalPanel } from "./ApprovalPanel";
import { DataTable, FilterBar, type Column } from "./DataTable";
import { Alert, Button, Field, Input, Modal, Pill, Select } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Rec = Record<string, any>;

export interface RecordAction {
  label: string;
  /** POST `${endpoint}/${id}/${verb}` — or a custom handler */
  verb?: string;
  onClick?: (doc: Rec, helpers: { reload: () => void; setSelected: (d: Rec | null) => void }) => void;
  variant?: "primary" | "secondary" | "danger";
  when: (doc: Rec) => boolean;
  confirm?: string;
}

export interface RecordListProps {
  title: string;
  subtitle?: string;
  endpoint: string;
  numberField: string;
  columns: Column<Rec>[];
  statusOptions?: string[];
  docType?: ApprovalDocType;
  newHref?: string;
  newLabel?: string;
  onNew?: () => void;
  extraFilters?: ReactNode;
  extraQuery?: Record<string, string | number | boolean | null | undefined>;
  renderDetail: (doc: Rec, helpers: { reload: () => void; setSelected: (d: Rec | null) => void }) => ReactNode;
  actions?: RecordAction[];
  modalWidth?: string;
  /** an external row to open (e.g. after creating something) */
  openDoc?: Rec | null;
}

const APPROVAL_OPTIONS = ["NONE", "PENDING_L1", "PENDING_L2", "PENDING_L3", "APPROVED", "REJECTED"];
export const POST_ACTION: RecordAction = {
  label: "Post",
  verb: "post",
  variant: "primary",
  when: (d) => d.status === "DRAFT" && (d.approvalStatus ?? "APPROVED") === "APPROVED",
  confirm: "This document has completed three-level approval. Post it now? This cannot be undone.",
};
export const CANCEL_ACTION: RecordAction = { label: "Cancel", verb: "cancel", variant: "danger", when: (d) => d.status === "DRAFT", confirm: "Cancel this document?" };

function RecordListInner(p: RecordListProps) {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [approval, setApproval] = useState(params.get("approval") ?? "");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Rec | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, items, loading, error: loadError, reload, demo } = useList<Rec>(p.endpoint, { q, status, approvalStatus: p.docType ? approval : undefined, page, pageSize: 20, ...(p.extraQuery ?? {}) });

  const openId = params.get("open");
  useEffect(() => {
    if (!openId) return;
    api<Rec>(`${p.endpoint}/${openId}`).then(setSelected).catch(() => {
      const row = items.find((d) => String(d.id) === openId);
      if (row) setSelected(row);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, items.length]);
  useEffect(() => {
    if (p.openDoc) setSelected(p.openDoc);
  }, [p.openDoc]);

  async function openDoc(d: Rec) {
    setError(null);
    setSelected(d);
    try {
      setSelected(await api<Rec>(`${p.endpoint}/${d.id}`));
    } catch {
      /* keep row */
    }
  }

  async function runAction(doc: Rec, a: RecordAction) {
    if (a.onClick) return a.onClick(doc, { reload, setSelected });
    if (a.confirm && !window.confirm(a.confirm)) return;
    setBusy(a.verb!);
    setError(null);
    try {
      setSelected(await api<Rec>(`${p.endpoint}/${doc.id}/${a.verb}`, { method: "POST" }));
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable"));
    } finally {
      setBusy(null);
    }
  }

  const helpers = { reload, setSelected };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{p.title}</h1>
          {p.subtitle && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {p.subtitle}
              {demo && <Pill tone="warning" className="ml-2 align-middle">offline · demo data</Pill>}
            </p>
          )}
        </div>
        {(p.newHref || p.onNew) &&
          (p.newHref ? (
            <Link href={p.newHref}>
              <Button><Plus className="h-4 w-4" /> {p.newLabel ?? "New"}</Button>
            </Link>
          ) : (
            <Button onClick={p.onNew}><Plus className="h-4 w-4" /> {p.newLabel ?? "New"}</Button>
          ))}
      </div>

      <FilterBar>
        <Field label="Search" className="min-w-[200px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-8" placeholder="number, product…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </Field>
        {p.statusOptions && (
          <Field label="Status">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {p.statusOptions.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </Select>
          </Field>
        )}
        {p.docType && (
          <Field label="Approval">
            <Select value={approval} onChange={(e) => { setApproval(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {APPROVAL_OPTIONS.map((s) => <option key={s} value={s}>{approvalLabel(s)}</option>)}
            </Select>
          </Field>
        )}
        {p.extraFilters}
      </FilterBar>

      <DataTable
        columns={p.columns}
        rows={items}
        loading={loading}
        error={loadError}
        onRowClick={openDoc}
        pagination={data ? { page: data.page, pages: data.pages, total: data.total, pageSize: data.pageSize, onPage: setPage } : undefined}
      />

      <Modal open={Boolean(selected)} title={selected ? String(selected[p.numberField] ?? "") : ""} onClose={() => { setSelected(null); if (openId) router.replace(window.location.pathname); }} width={p.modalWidth ?? "max-w-4xl"}>
        {selected && (
          <div>
            {error && <Alert kind="error" title={error.message} items={error.errors} onClose={() => setError(null)} />}
            {p.renderDetail(selected, helpers)}
            {p.docType && (
              <div className="mt-4">
                <ApprovalPanel docType={p.docType} docId={selected.id} docStatus={selected.status} onChange={(s: ApprovalState) => { setSelected({ ...selected, approvalStatus: s.approvalStatus, submittedAt: s.submittedAt }); reload(); }} />
              </div>
            )}
            {p.actions && (
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {p.actions.filter((a) => a.when(selected)).map((a) => (
                  <Button key={a.label} variant={a.variant ?? "secondary"} loading={busy === a.verb} onClick={() => runAction(selected, a)}>{a.label}</Button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function RecordList(p: RecordListProps) {
  return (
    <Suspense>
      <RecordListInner {...p} />
    </Suspense>
  );
}

export function Info({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{k}</p>
      <p className="text-slate-800 dark:text-slate-100">{v}</p>
    </div>
  );
}
