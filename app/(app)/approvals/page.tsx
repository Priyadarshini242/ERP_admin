"use client";

import clsx from "clsx";
import { Check, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { DataTable, FilterBar, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Checkbox, Field, Input, Modal, PageHeader, Pill, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { DOC_TYPES, isPending, LEVELS, notifyApprovalsChanged, type ApprovalDocType, type QueueRow } from "@/lib/approvals";
import { demoFor } from "@/lib/demo";
import { fmtDate, money } from "@/lib/format";
import { useList } from "@/lib/hooks";

interface Summary {
  pending: number;
  actionable: number;
  rejected: number;
  approvedAwaitingPost: number;
  byLevel: Record<string, number>;
}

function relative(iso: string | null) {
  if (!iso) return "—";
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day" : `${d} days`;
}

function ApprovalsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initialStatus = params.get("status");
  const [tab, setTab] = useState<"PENDING" | "REJECTED" | "APPROVED">(initialStatus === "REJECTED" || initialStatus === "APPROVED" ? initialStatus : "PENDING");
  const [docType, setDocType] = useState(params.get("docType") ?? "");
  const [level, setLevel] = useState(params.get("level") ?? "");
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reject, setReject] = useState<QueueRow | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const { data, items, loading, error: loadError, reload, demo } = useList<QueueRow>("/approvals/queue", {
    status: tab,
    docType: docType || undefined,
    level: level || undefined,
    mine: mine || undefined,
    q,
    page,
    pageSize: 25,
  });

  useEffect(() => {
    const status = params.get("status");
    setTab(status === "REJECTED" || status === "APPROVED" ? status : "PENDING");
    setPage(1);
  }, [params]);

  const loadSummary = () =>
    api<Summary>("/approvals/summary")
      .then(setSummary)
      .catch(() => setSummary(demoFor("/approvals/summary") as Summary | null));
  useEffect(() => {
    void loadSummary();
    const h = () => void loadSummary();
    window.addEventListener("approvals:changed", h);
    return () => window.removeEventListener("approvals:changed", h);
  }, []);

  async function act(row: QueueRow, verb: "approve" | "reject", body: Record<string, unknown> = {}) {
    setBusy(`${row.docType}:${row.docId}:${verb}`);
    setError(null);
    try {
      await api(`/approvals/${row.docType}/${row.docId}/${verb}`, { method: "POST", body });
      notifyApprovalsChanged();
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable"));
    } finally {
      setBusy(null);
      setReject(null);
      setComment("");
    }
  }

  const rows = items.filter((r) => tab === "PENDING" ? (r.approvalStatus as string) === "PENDING" || isPending(r.approvalStatus) : r.approvalStatus === tab);

  const columns: Column<QueueRow>[] = [
    { key: "docLabel", header: "Type", render: (r) => <Pill tone="info">{r.docLabel}</Pill> },
    { key: "docNo", header: "No.", render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.docNo}</span> },
    { key: "date", header: "Date", render: (r) => fmtDate(r.date) },
    { key: "party", header: "Party", render: (r) => r.party ?? <span className="text-slate-400">—</span> },
    { key: "grandTotal", header: "Amount", align: "right", render: (r) => (r.grandTotal ? money(r.grandTotal) : <span className="text-slate-400">—</span>) },
    { key: "approvalStatus", header: "Stage", render: (r) => <StatusBadge value={r.approvalStatus} /> },
    { key: "createdBy", header: "Submitted by", render: (r) => r.createdBy?.fullName ?? "—" },
    { key: "submittedAt", header: "Waiting", render: (r) => <span className="text-slate-500">{relative(r.submittedAt)}</span> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {r.can.approve && (
            <Button size="sm" onClick={() => act(r, "approve")} loading={busy === `${r.docType}:${r.docId}:approve`}>
              <Check className="h-3.5 w-3.5" /> Approve L{r.level}
            </Button>
          )}
          {r.can.reject && (
            <Button size="sm" variant="danger" onClick={() => setReject(r)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Approvals" subtitle="Documents waiting for Level 1 / 2 / 3 sign-off across sales, purchase, returns, inventory and reports" />

      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
          <Tile label="Pending" value={summary.pending} onClick={() => setTab("PENDING")} active={tab === "PENDING"} />
          {LEVELS.map((l) => (
            <Tile key={l.level} label={`L${l.level} · ${l.label}`} value={summary.byLevel[String(l.level)] ?? 0} onClick={() => { setTab("PENDING"); setLevel(String(l.level)); }} active={level === String(l.level)} />
          ))}
          <Tile label="Yours to action" value={summary.actionable} tone="brand" onClick={() => { setTab("PENDING"); setMine(true); }} active={mine} />
          <Tile label="Rejected" value={summary.rejected} tone={summary.rejected ? "danger" : undefined} onClick={() => setTab("REJECTED")} active={tab === "REJECTED"} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-ink-700 dark:bg-ink-850">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }} className={clsx("rounded-md px-3 py-1.5 text-sm transition", tab === t ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-800")}>
            {t === "PENDING" ? "Pending" : t === "APPROVED" ? "Approved" : "Rejected"}
          </button>
        ))}
      </div>

      <FilterBar>
        <Field label="Search" className="min-w-[200px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-8" placeholder="document no. or party" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </Field>
        <Field label="Document type">
          <Select value={docType} onChange={(e) => { setDocType(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {(Object.keys(DOC_TYPES) as ApprovalDocType[]).map((k) => (
              <option key={k} value={k}>{DOC_TYPES[k].label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Level">
          <Select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {LEVELS.map((l) => <option key={l.level} value={l.level}>L{l.level} {l.label}</option>)}
          </Select>
        </Field>
        <Checkbox label="Only items I can act on" checked={mine} onChange={(e) => { setMine(e.target.checked); setPage(1); }} className="h-9" />
        {demo && <Pill tone="warning">offline · demo data</Pill>}
      </FilterBar>

      {error && <Alert kind="error" title={error.message} items={error.errors} onClose={() => setError(null)} />}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={loadError}
        rowKey={(r) => `${r.docType}-${r.docId}`}
        onRowClick={(r) => router.push(`${r.listHref}${r.listHref.includes("?") ? "&" : "?"}open=${r.docId}`)}
        empty={tab === "REJECTED" ? "No rejected documents" : tab === "APPROVED" ? "No approved documents" : "Nothing waiting at this level"}
        pagination={data ? { page: data.page, pages: data.pages, total: data.total, pageSize: data.pageSize, onPage: setPage } : undefined}
      />

      <Modal open={Boolean(reject)} title={reject ? `Reject ${reject.docNo}` : ""} onClose={() => setReject(null)} width="max-w-md">
        <Field label="Reason for rejection" required hint="Shown to the submitter and kept in the audit trail">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} autoFocus />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setReject(null)}>Cancel</Button>
          <Button variant="danger" disabled={comment.trim().length < 3} onClick={() => reject && act(reject, "reject", { comment })} loading={Boolean(busy?.endsWith(":reject"))}>Reject</Button>
        </div>
      </Modal>
    </div>
  );
}

function Tile({ label, value, tone, onClick, active }: { label: string; value: number; tone?: "brand" | "danger"; onClick?: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={clsx("card p-3 text-left transition hover:-translate-y-px hover:shadow-md", active && "ring-2 ring-brand-500/40")}>
      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={clsx("mt-1 text-2xl font-bold", tone === "brand" ? "text-brand-600 dark:text-brand-300" : tone === "danger" ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white")}>{value}</p>
    </button>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense>
      <ApprovalsInner />
    </Suspense>
  );
}
