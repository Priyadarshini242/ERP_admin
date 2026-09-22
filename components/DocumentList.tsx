"use client";

import { ChevronDown, FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { approvalLabel, type ApprovalDocType, type ApprovalState } from "@/lib/approvals";
import { fmtDate, money, n, qty, titleCase, today } from "@/lib/format";
import { useList } from "@/lib/hooks";

import { ApprovalPanel } from "./ApprovalPanel";
import { DataTable, FilterBar, type Column } from "./DataTable";
import { StatusBadge } from "./StatusBadge";
import { Alert, Button, Field, Input, Modal, Pill, Select } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;

export interface DocAction {
  label: string;
  /** appended to `${endpoint}/${id}/` */
  verb: string;
  /** Navigate to a document workflow instead of calling an API action. */
  href?: (doc: Doc) => string;
  variant?: "primary" | "secondary" | "danger";
  when: (doc: Doc) => boolean;
  confirm?: string;
}

export interface DocumentListProps {
  title: string;
  subtitle?: string;
  endpoint: string;
  newHref?: string;
  newLabel?: string;
  /** Optional split-button entries for document types such as B2B and B2C invoices. */
  newActions?: { label: string; href: string }[];
  numberField: string;
  dateField: string;
  partyField: "customer" | "vendor";
  statusOptions: string[];
  showCustomerType?: boolean;
  /** invoices: show payment status + "record payment" */
  showPayment?: boolean;
  actions?: DocAction[];
  extraColumns?: Column<Doc>[];
  /** query param name used by the backend for the customer/vendor type filter */
  typeParam?: string;
  /** enables the three-level approval column, filter and panel */
  docType?: ApprovalDocType;
  /** Use supplied demo data when this resource's API is unavailable or returning a 5xx. */
  fallbackOnServerError?: boolean;
}

const APPROVAL_OPTIONS = ["NONE", "PENDING_L1", "PENDING_L2", "PENDING_L3", "APPROVED", "REJECTED"];
const needsApproval = (d: Doc) => d.status === "DRAFT" && (d.approvalStatus ?? "NONE") !== "APPROVED";

const STD_ACTIONS: Record<string, DocAction> = {
  post: {
    label: "Post",
    verb: "post",
    variant: "primary",
    when: (d) => d.status === "DRAFT" && (d.approvalStatus ?? "APPROVED") === "APPROVED",
    confirm: "This document has completed three-level approval. Post it now? Stock and ledger entries will be written and this cannot be undone.",
  },
  confirm: { label: "Confirm", verb: "confirm", variant: "primary", when: (d) => d.status === "DRAFT" && (d.approvalStatus ?? "APPROVED") === "APPROVED" },
  cancel: { label: "Cancel", verb: "cancel", variant: "danger", when: (d) => d.status === "DRAFT", confirm: "Cancel this document?" },
};
export const ACTIONS = STD_ACTIONS;

function DocumentListInner(p: DocumentListProps) {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [approval, setApproval] = useState(params.get("approval") ?? "");
  const [type, setType] = useState(params.get("type") ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const { data, items, loading, error: loadError, reload, demo } = useList<Doc>(p.endpoint, {
    q,
    status,
    approvalStatus: p.docType ? approval : undefined,
    [p.typeParam ?? "customerType"]: p.showCustomerType ? type : undefined,
    from,
    to,
    page,
    pageSize: 20,
  }, [], p.fallbackOnServerError);

  // ?open=<id> deep link (from entry forms and the approvals queue)
  const openId = params.get("open");
  useEffect(() => {
    if (!openId) return;
    api<Doc>(`${p.endpoint}/${openId}`)
      .then((d) => setSelected(d))
      .catch(() => {
        const row = items.find((d) => String(d.id) === openId);
        if (row) setSelected(row);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, items.length]);

  async function openDoc(d: Doc) {
    setError(null);
    setSelected(d);
    try {
      setSelected(await api<Doc>(`${p.endpoint}/${d.id}`)); // full detail (allocations, payments)
    } catch {
      /* keep the row */
    }
  }

  async function runAction(doc: Doc, a: DocAction) {
    if (a.href) {
      setSelected(null);
      router.push(a.href(doc));
      return;
    }
    if (a.confirm && !window.confirm(a.confirm)) return;
    setBusy(a.verb);
    setError(null);
    try {
      const updated = await api<Doc>(`${p.endpoint}/${doc.id}/${a.verb}`, { method: "POST" });
      if (a.verb.startsWith("convert")) {
        setSelected(null);
        window.alert(`Created ${updated.invoiceNo ?? updated.billNo ?? "document"} as a draft.`);
      } else setSelected(updated);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setBusy(null);
    }
  }

  const party = (d: Doc) => d[p.partyField]?.name ?? "—";
  const summary = data?.summary as Record<string, string> | undefined;

  const columns: Column<Doc>[] = [
    { key: p.numberField, header: "No.", render: (d) => <span className="font-medium text-slate-900 dark:text-white">{d[p.numberField]}</span> },
    { key: p.dateField, header: "Date", render: (d) => fmtDate(d[p.dateField]) },
    { key: "party", header: p.partyField === "customer" ? "Customer" : "Vendor", render: (d) => party(d) },
    ...(p.showCustomerType ? [{ key: "customerType", header: "Type", render: (d: Doc) => <StatusBadge value={d.customerType} /> }] : []),
    ...(p.extraColumns ?? []),
    { key: "status", header: "Status", render: (d) => <StatusBadge value={d.status} /> },
    ...(p.docType ? [{ key: "approvalStatus", header: "Approval", render: (d: Doc) => (d.status === "DRAFT" ? <StatusBadge value={d.approvalStatus ?? "NONE"} /> : <span className="text-xs text-slate-400">—</span>) }] : []),
    ...(p.showPayment ? [{ key: "paymentStatus", header: "Payment", render: (d: Doc) => <StatusBadge value={d.paymentStatus} /> }] : []),
    { key: "taxableAmount", header: "Taxable", align: "right" as const, render: (d) => money(d.taxableAmount) },
    { key: "taxAmount", header: "Tax", align: "right" as const, render: (d) => money(d.taxAmount) },
    { key: "grandTotal", header: "Total", align: "right" as const, render: (d) => <span className="font-medium">{money(d.grandTotal)}</span> },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {p.title}
            {p.showCustomerType && type && <StatusBadge value={type} className="ml-2 align-middle text-xs" />}
          </h1>
          {p.subtitle && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {p.subtitle}
              {demo && <Pill tone="warning" className="ml-2 align-middle">offline · demo data</Pill>}
            </p>
          )}
        </div>
        {p.newActions?.length ? (
          <div className="relative">
            <Button onClick={() => setNewOpen((open) => !open)} aria-expanded={newOpen} aria-haspopup="menu">
              <Plus className="h-4 w-4" /> Add New <ChevronDown className={`h-4 w-4 transition-transform ${newOpen ? "rotate-180" : ""}`} />
            </Button>
            {newOpen && (
              <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-ink-700 dark:bg-ink-900">
                {p.newActions.map((action) => (
                  <Link key={action.href} href={action.href} role="menuitem" onClick={() => setNewOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 dark:text-slate-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-300">
                    <FileText className="h-5 w-5 text-brand-600 dark:text-brand-300" /> {action.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : p.newHref && (
          <Link href={p.newHref}>
            <Button>
              <Plus className="h-4 w-4" /> {p.newLabel ?? "New"}
            </Button>
          </Link>
        )}
      </div>

      {params.get("created") === "1" && (
        <Alert kind="success" title="Bill created successfully." />
      )}

      <FilterBar>
        <Field label="Search" className="min-w-[200px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-8" placeholder="number, party…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </Field>
        {p.showCustomerType && (
          <Field label="Type">
            <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </Select>
          </Field>
        )}
        <Field label="Status">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {p.statusOptions.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </Field>
        {p.docType && (
          <Field label="Approval">
            <Select value={approval} onChange={(e) => { setApproval(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {APPROVAL_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {approvalLabel(s)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </Field>
      </FilterBar>

      {summary && (
        <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>Posted taxable <b className="text-slate-800 dark:text-slate-100">{money(summary.taxableAmount)}</b></span>
          <span>Tax <b className="text-slate-800 dark:text-slate-100">{money(summary.taxAmount)}</b></span>
          <span>Total <b className="text-slate-800 dark:text-slate-100">{money(summary.grandTotal)}</b></span>
          {summary.outstanding !== undefined && (
            <span>Outstanding <b className="text-red-700 dark:text-red-400">{money(summary.outstanding)}</b></span>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        error={loadError}
        onRowClick={openDoc}
        pagination={data ? { page: data.page, pages: data.pages, total: data.total, pageSize: data.pageSize, onPage: setPage } : undefined}
      />

      <Modal open={Boolean(selected)} title={selected ? `${selected[p.numberField]} · ${party(selected)}` : ""} onClose={() => { setSelected(null); if (openId) router.replace(window.location.pathname); }} width="max-w-4xl">
        {selected && (
          <div>
            {error && <Alert kind="error" title={error.message} items={error.errors} onClose={() => setError(null)} />}
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Info k="Date" v={fmtDate(selected[p.dateField])} />
              <Info k="Status" v={<StatusBadge value={selected.status} />} />
              {p.docType && selected.status === "DRAFT" && <Info k="Approval" v={<StatusBadge value={selected.approvalStatus ?? "NONE"} />} />}
              {selected.submittedAt && <Info k="Submitted" v={fmtDate(selected.submittedAt)} />}
              {selected.customerType && <Info k="Type" v={<StatusBadge value={selected.customerType} />} />}
              {selected.paymentStatus && <Info k="Payment" v={<StatusBadge value={selected.paymentStatus} />} />}
              {selected.warehouse && <Info k="Warehouse" v={selected.warehouse.name} />}
              {selected.deliveryDate && <Info k="Delivery" v={fmtDate(selected.deliveryDate)} />}
              {selected.expectedDate && <Info k="Expected" v={fmtDate(selected.expectedDate)} />}
              {selected.dueDate && <Info k="Due" v={fmtDate(selected.dueDate)} />}
              {selected.vendorInvoiceNo && <Info k="Vendor inv." v={selected.vendorInvoiceNo} />}
              {selected.reference && <Info k="Reference" v={selected.reference} />}
              {selected.reason && <Info k="Reason" v={titleCase(selected.reason)} />}
              {selected.salesOrder && <Info k="From SO" v={selected.salesOrder.orderNo} />}
              {selected.purchaseOrder && <Info k="From PO" v={selected.purchaseOrder.poNo} />}
              {selected.invoice && <Info k="Against" v={selected.invoice.invoiceNo} />}
              {selected.purchaseInvoice && <Info k="Against" v={selected.purchaseInvoice.billNo} />}
              <Info k="GST" v={selected.isInterstate ? "IGST" : "CGST + SGST"} />
              {selected.createdBy && <Info k="Created by" v={selected.createdBy.fullName} />}
            </div>

            <table className="min-w-full text-sm">
              <thead className="thead text-xs uppercase">
                <tr>
                  <th className="th">Product</th>
                  <th className="th">Batch</th>
                  <th className="th text-right">Qty</th>
                  <th className="th text-right">Rate</th>
                  <th className="th text-right">Disc %</th>
                  <th className="th text-right">Tax %</th>
                  <th className="th text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y-ui">
                {(selected.items ?? []).map((it: Doc) => (
                  <tr key={it.id}>
                    <td className="td whitespace-normal">
                      {it.product?.name ?? it.description}
                      <span className="ml-1 text-xs text-slate-400">{it.product?.sku}</span>
                      {it.invoicedQty !== undefined && n(it.invoicedQty) > 0 && <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400">invoiced {qty(it.invoicedQty)}</span>}
                      {it.receivedQty !== undefined && n(it.receivedQty) > 0 && <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400">received {qty(it.receivedQty)}</span>}
                    </td>
                    <td className="td whitespace-normal text-xs">
                      <BatchCell item={it} />
                    </td>
                    <td className="td text-right">{qty(it.quantity)} {it.product?.unit}</td>
                    <td className="td text-right">{money(it.unitPrice)}</td>
                    <td className="td text-right">{n(it.discountPct).toFixed(2)}</td>
                    <td className="td text-right">{n(it.taxRate).toFixed(2)}</td>
                    <td className="td text-right font-medium">{money(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-sm text-slate-700 dark:text-slate-300">
                <tr><td colSpan={6} className="px-3 pt-3 text-right text-slate-500 dark:text-slate-400">Taxable</td><td className="px-3 pt-3 text-right">{money(selected.taxableAmount)}</td></tr>
                {selected.isInterstate ? (
                  <tr><td colSpan={6} className="px-3 text-right text-slate-500 dark:text-slate-400">IGST</td><td className="px-3 text-right">{money(selected.igstAmount)}</td></tr>
                ) : (
                  <>
                    <tr><td colSpan={6} className="px-3 text-right text-slate-500 dark:text-slate-400">CGST</td><td className="px-3 text-right">{money(selected.cgstAmount)}</td></tr>
                    <tr><td colSpan={6} className="px-3 text-right text-slate-500 dark:text-slate-400">SGST</td><td className="px-3 text-right">{money(selected.sgstAmount)}</td></tr>
                  </>
                )}
                <tr><td colSpan={6} className="px-3 text-right text-slate-500 dark:text-slate-400">Round off</td><td className="px-3 text-right">{money(selected.roundOff)}</td></tr>
                <tr className="font-semibold text-slate-900 dark:text-white"><td colSpan={6} className="px-3 py-1 text-right">Grand total</td><td className="px-3 py-1 text-right">{money(selected.grandTotal)}</td></tr>
                {p.showPayment && (
                  <tr><td colSpan={6} className="px-3 text-right text-slate-500 dark:text-slate-400">Paid / Due</td><td className="px-3 text-right">{money(selected.amountPaid)} / <b className="text-red-700 dark:text-red-400">{money(n(selected.grandTotal) - n(selected.amountPaid))}</b></td></tr>
                )}
              </tfoot>
            </table>

            {selected.notes && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Notes: {selected.notes}</p>}

            {p.showPayment && selected.payments?.length > 0 && (
              <div className="mt-3 rounded-lg border border-slate-200 p-3 text-xs dark:border-ink-700">
                <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Payments</p>
                {selected.payments.map((pm: Doc) => (
                  <div key={pm.id} className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{pm.paymentNo} · {fmtDate(pm.paymentDate)} · {titleCase(pm.mode)}{pm.reference ? ` · ${pm.reference}` : ""}</span>
                    <span className="tabular-nums">{money(pm.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {p.docType && (
              <div className="mt-4">
                <ApprovalPanel
                  docType={p.docType}
                  docId={selected.id}
                  docStatus={selected.status}
                  onChange={(s: ApprovalState) => {
                    setSelected({ ...selected, approvalStatus: s.approvalStatus, submittedAt: s.submittedAt });
                    reload();
                  }}
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {p.showPayment && selected.status === "POSTED" && selected.paymentStatus !== "PAID" && (
                <Button variant="secondary" onClick={() => setPayOpen(true)}>Record payment</Button>
              )}
              {(p.actions ?? []).filter((a) => a.when(selected)).map((a) => (
                <Button key={a.verb} variant={a.variant ?? "secondary"} loading={busy === a.verb} onClick={() => runAction(selected, a)}>
                  {a.label}
                </Button>
              ))}
              {p.docType && needsApproval(selected) && (p.actions ?? []).some((a) => a.verb === "post" || a.verb === "confirm") && (
                <span className="self-center text-xs text-slate-500 dark:text-slate-400">Post/Confirm unlocks after level 3 approval.</span>
              )}
            </div>
          </div>
        )}
      </Modal>

      {p.showPayment && selected && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          endpoint={`${p.endpoint}/${selected.id}/payments`}
          due={n(selected.grandTotal) - n(selected.amountPaid)}
          onSaved={(doc) => { setSelected(doc); setPayOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

export function DocumentList(p: DocumentListProps) {
  return (
    <Suspense>
      <DocumentListInner {...p} />
    </Suspense>
  );
}

/** Batch info for a line: picked batch, typed batch (receipts) or the batches actually moved (posted docs). */
function BatchCell({ item }: { item: Doc }) {
  const allocs: Doc[] = item.allocations ?? [];
  if (allocs.length) {
    return (
      <ul className="space-y-0.5">
        {allocs.map((a) => (
          <li key={a.batchId} className="whitespace-nowrap">
            <span className="font-mono">{a.batchNo}</span> <span className="text-slate-400">exp {a.expiryDate ? fmtDate(a.expiryDate) : "—"}</span> <span className="text-slate-500">× {qty(a.quantity)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (item.batch) return <span className="whitespace-nowrap"><span className="font-mono">{item.batch.batchNo}</span> <span className="text-slate-400">exp {item.batch.expiryDate ? fmtDate(item.batch.expiryDate) : "—"}</span></span>;
  if (item.batchNo) return <span className="whitespace-nowrap"><span className="font-mono">{item.batchNo}</span> <span className="text-slate-400">exp {item.expiryDate ? fmtDate(item.expiryDate) : "—"}</span></span>;
  if (item.product?.trackBatches) return <span className="text-slate-400">Auto (FEFO)</span>;
  return <span className="text-slate-300 dark:text-slate-600">—</span>;
}

function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{k}</p>
      <p className="text-slate-800 dark:text-slate-100">{v}</p>
    </div>
  );
}

function PaymentModal({ open, onClose, endpoint, due, onSaved }: { open: boolean; onClose: () => void; endpoint: string; due: number; onSaved: (doc: Doc) => void }) {
  const [amount, setAmount] = useState(String(due.toFixed(2)));
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState("BANK");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      onSaved(await api<Doc>(endpoint, { method: "POST", body: { amount, paymentDate: date, mode, reference: reference || null } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Record payment" onClose={onClose} width="max-w-md">
      {error && <Alert kind="error" title={error} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" required hint={`Due ${money(due)}`}>
          <Input type="number" step="0.01" min="0" max={due} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Mode">
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>
            {["BANK", "CASH", "UPI", "CHEQUE", "CARD"].map((m) => (
              <option key={m} value={m}>{titleCase(m)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Reference">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no." />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} loading={busy} disabled={!(n(amount) > 0) || n(amount) > due + 0.005}>Save payment</Button>
      </div>
    </Modal>
  );
}
