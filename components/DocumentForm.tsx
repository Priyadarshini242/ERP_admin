"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { api, ApiError, type Issue } from "@/lib/api";
import { DOC_TYPES, type ApprovalDocType } from "@/lib/approvals";
import { demoFor } from "@/lib/demo";
import { money, n, qty, today } from "@/lib/format";
import { useMasters, type PartyLite, type ProductLite } from "@/lib/hooks";

import { Alert, Button, Card, Field, Input, Select, Spinner, Textarea } from "./ui";

// ───────────────────────── Types ─────────────────────────

export interface LineState {
  productId: number | null;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  taxRate: string;
  description: string;
  condition?: string;
  // batch tracking
  batchId: number | null;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  mrp: string;
}

export interface DocState {
  partyId: number | null;
  customerType: "B2B" | "B2C";
  warehouseId: number | null;
  date: string;
  date2: string;
  reference: string;
  reason: string;
  invoiceId: number | null;
  restock: boolean;
  notes: string;
  items: LineState[];
  /** values of the document-specific header fields declared in `extraFields` */
  extras: Record<string, string>;
}

/** A header field that only one document type needs (terms, subject, transport…). */
export interface ExtraField {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  /** tailwind col-span classes for the header grid */
  className?: string;
  initial?: string;
}

export interface Totals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
}

interface SourceInvoice {
  id: number;
  invoiceNo?: string;
  billNo?: string;
  grandTotal: string;
  invoiceDate: string;
  items: { id: number; productId: number; quantity: string; unitPrice: string; discountPct: string; taxRate: string; batchId?: number | null; batch?: { id: number; batchNo: string } | null; allocations?: { batchId: number; batchNo: string; quantity: string }[] }[];
}

export interface BatchOption {
  batchId: number;
  batchNo: string;
  expiryDate: string | null;
  mrp: string;
  quantity: string;
  status: string;
  expired: boolean;
  sellable: boolean;
  label: string;
}

type BatchMode = "none" | "receive" | "issue";

export interface DocumentFormProps {
  title: string;
  partyRole: "customer" | "vendor";
  /** POST target, e.g. "/sales/orders" */
  endpoint: string;
  /** optional dry-run endpoint, e.g. "/sales/orders/validate" */
  validateEndpoint?: string;
  /** where to go after a successful save */
  listHref: string;
  dateLabel: string;
  secondaryDate?: { label: string; mustBeAfterPrimary?: boolean };
  showCustomerType?: boolean;
  showWarehouse?: boolean;
  referenceLabel?: string;
  showReason?: boolean;
  /** load posted invoices of the party so lines can be prefilled / validated against them */
  sourceInvoice?: "sales" | "purchase";
  showRestock?: boolean;
  showCondition?: boolean;
  /** turn form state into the API payload; `flag` = submit for approval (or confirm/post when approvals are off) */
  toPayload: (s: DocState, flag: boolean) => Record<string, unknown>;
  draftLabel?: string;
  actionLabel?: string;
  /** extra client-side rules; return issues */
  validateExtra?: (s: DocState, ctx: { party: PartyLite | null; products: ProductLite[] }) => Issue[];
  /** preset header fields, e.g. { customerType: "B2B" } */
  initial?: Partial<DocState>;
  /** keeps Customer Type aligned with an invoice-level B2B/B2C selection */
  customerTypePreset?: "B2B" | "B2C";
  /** three-level approval document type: enables "Save & submit for approval" and the ?open= redirect */
  docType?: ApprovalDocType;
  /** batch handling on lines: receive (bills, sales returns) | issue (invoices, purchase returns) | none */
  batchMode?: BatchMode;
  /** document-specific header fields; values land in `state.extras` */
  extraFields?: ExtraField[];
  /** hide the party picker (documents that are not against a party) */
  hideParty?: boolean;
}

const COMPANY_STATE = process.env.NEXT_PUBLIC_COMPANY_STATE_CODE ?? "33";
const REASONS = ["DAMAGED", "DEFECTIVE", "WRONG_ITEM", "EXPIRED", "EXCESS", "OTHER"];

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export function emptyLine(): LineState {
  return { productId: null, quantity: "1", unitPrice: "", discountPct: "0", taxRate: "", description: "", batchId: null, batchNo: "", mfgDate: "", expiryDate: "", mrp: "" };
}

/** Maps editor lines to the API line shape (incl. batch fields). Use in toPayload. */
export function linesToApi(items: LineState[], extra?: (l: LineState) => Record<string, unknown>) {
  return items
    .filter((l) => l.productId)
    .map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct || 0,
      taxRate: l.taxRate,
      description: l.description || null,
      batchId: l.batchId ?? null,
      batchNo: l.batchNo || null,
      mfgDate: l.mfgDate || null,
      expiryDate: l.expiryDate || null,
      mrp: l.mrp || null,
      ...(extra ? extra(l) : {}),
    }));
}

/** Client-side mirror of the server's calcLine/calcTotals (server is authoritative). */
export function computeTotals(items: LineState[], interstate: boolean): Totals {
  let subtotal = 0;
  let taxable = 0;
  let tax = 0;
  for (const l of items) {
    if (!l.productId) continue;
    const gross = r2(n(l.quantity) * n(l.unitPrice));
    const t = r2(gross * (1 - n(l.discountPct) / 100));
    const tx = r2((t * n(l.taxRate)) / 100);
    subtotal += gross;
    taxable += t;
    tax += tx;
  }
  subtotal = r2(subtotal);
  taxable = r2(taxable);
  tax = r2(tax);
  const cgst = interstate ? 0 : r2(tax / 2);
  const sgst = interstate ? 0 : r2(tax - cgst);
  const igst = interstate ? tax : 0;
  const raw = r2(taxable + tax);
  const grand = Math.round(raw);
  return { subtotal, discountAmount: r2(subtotal - taxable), taxableAmount: taxable, cgstAmount: cgst, sgstAmount: sgst, igstAmount: igst, taxAmount: tax, roundOff: r2(grand - raw), grandTotal: grand };
}

// ───────────────────────── Component ─────────────────────────

export function DocumentForm(p: DocumentFormProps) {
  const router = useRouter();
  const { parties, products, warehouses, loading } = useMasters(p.partyRole);
  const priceField = p.partyRole === "customer" ? "sellingPrice" : "purchasePrice";
  const batchMode: BatchMode = p.batchMode ?? "none";

  const [s, setS] = useState<DocState>({
    partyId: null,
    customerType: "B2C",
    warehouseId: null,
    date: today(),
    date2: "",
    reference: "",
    reason: "OTHER",
    invoiceId: null,
    restock: true,
    notes: "",
    items: [emptyLine()],
    extras: Object.fromEntries((p.extraFields ?? []).map((f) => [f.key, f.initial ?? ""])),
    ...p.initial,
  });
  const [invoices, setInvoices] = useState<SourceInvoice[]>([]);
  const [serverCheck, setServerCheck] = useState<{ errors: Issue[]; warnings: Issue[]; totals?: Totals; lines?: { index: number; allocations: { batchNo: string; quantity: string; expiryDate: string | null }[]; shortage: string | null }[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<"draft" | "action" | null>(null);
  const [batchOptions, setBatchOptions] = useState<Record<string, BatchOption[]>>({});

  // Dashboard recommendations can open a document with product IDs already
  // selected. Complete those preset rows when master data becomes available.
  useEffect(() => {
    if (!products.length) return;
    setS((current) => {
      let changed = false;
      const items = current.items.map((line) => {
        const product = products.find((item) => item.id === line.productId);
        if (!product) return line;
        const patch: Partial<LineState> = {};
        if (!line.unitPrice) patch.unitPrice = String(n(product[priceField]));
        if (!line.taxRate) patch.taxRate = String(n(product.taxRate));
        if (!line.description) patch.description = product.name;
        if (!line.mrp && n(product.mrp) > 0) patch.mrp = String(n(product.mrp));
        if (Object.keys(patch).length) {
          changed = true;
          return { ...line, ...patch };
        }
        return line;
      });
      return changed ? { ...current, items } : current;
    });
  }, [products, priceField]);

  useEffect(() => {
    const preset = p.customerTypePreset;
    if (!preset) return;
    setS((current) => current.customerType === preset ? current : { ...current, customerType: preset });
  }, [p.customerTypePreset]);

  const party = useMemo(() => parties.find((x) => x.id === s.partyId) ?? null, [parties, s.partyId]);
  const interstate = Boolean(party?.stateCode && party.stateCode !== COMPANY_STATE);
  const clientTotals = useMemo(() => computeTotals(s.items, interstate), [s.items, interstate]);
  const totals = serverCheck?.totals ?? clientTotals;

  // default warehouse
  useEffect(() => {
    if (p.showWarehouse && !s.warehouseId && warehouses.length) {
      setS((x) => ({ ...x, warehouseId: (warehouses.find((w) => w.isDefault) ?? warehouses[0]).id }));
    }
  }, [warehouses, p.showWarehouse, s.warehouseId]);

  // when the party changes: customer type from master + load their posted invoices
  useEffect(() => {
    if (!party) return;
    if (p.showCustomerType && party.customerType && !p.customerTypePreset) setS((x) => ({ ...x, customerType: party.customerType! }));
    if (p.sourceInvoice) {
      const path = p.sourceInvoice === "sales" ? "/sales/invoices" : "/purchase/invoices";
      const key = p.sourceInvoice === "sales" ? "customerId" : "vendorId";
      api<{ items: SourceInvoice[] }>(path, { query: { [key]: party.id, status: "POSTED", pageSize: 100 } })
        .then((r) => setInvoices(r.items))
        .catch(() => setInvoices(((demoFor(path) as { items: SourceInvoice[] } | null)?.items ?? []) as SourceInvoice[]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party?.id]);

  // batch options for tracked products on issue/receive lines (per product + warehouse + date)
  useEffect(() => {
    if (batchMode === "none" || !s.warehouseId) return;
    const need = [...new Set(s.items.map((l) => l.productId).filter((id): id is number => !!id))].filter((id) => products.find((x) => x.id === id)?.trackBatches !== false);
    for (const productId of need) {
      const key = `${productId}:${s.warehouseId}:${s.date}`;
      if (batchOptions[key]) continue;
      api<BatchOption[]>("/inventory/batches/lookup", { query: { productId, warehouseId: s.warehouseId, date: s.date, includeEmpty: batchMode === "receive" } })
        .then((rows) => setBatchOptions((m) => ({ ...m, [key]: rows })))
        .catch(() => setBatchOptions((m) => ({ ...m, [key]: ((demoFor("/inventory/batches/lookup") as BatchOption[] | null) ?? []) })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.items.map((l) => l.productId).join(","), s.warehouseId, s.date, batchMode, products.length]);

  const optionsFor = (productId: number | null) => (productId && s.warehouseId ? (batchOptions[`${productId}:${s.warehouseId}:${s.date}`] ?? []) : []);

  // server dry-run validation, debounced
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!p.validateEndpoint) return;
    if (!s.partyId || !s.items.some((l) => l.productId)) {
      setServerCheck(null);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setChecking(true);
      try {
        const r = await api<{ errors: Issue[]; warnings: Issue[]; totals?: Record<string, string>; lines?: { index: number; allocations: { batchNo: string; quantity: string; expiryDate: string | null }[]; shortage: string | null }[] }>(p.validateEndpoint!, {
          method: "POST",
          body: p.toPayload(s, false),
        });
        setServerCheck({
          errors: r.errors,
          warnings: r.warnings,
          totals: r.totals ? (Object.fromEntries(Object.entries(r.totals).map(([k, v]) => [k, n(v)])) as unknown as Totals) : undefined,
          lines: r.lines,
        });
      } catch (e) {
        if (e instanceof ApiError) setServerCheck({ errors: e.errors.length ? e.errors : [{ message: e.message }], warnings: e.warnings });
        else setServerCheck(null); // offline: client-side rules only
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(s)]);

  // ───── client-side validation ─────
  const clientIssues = useMemo<Issue[]>(() => {
    const out: Issue[] = [];
    if (!s.partyId) out.push({ field: p.partyRole === "customer" ? "customerId" : "vendorId", message: `Select a ${p.partyRole}` });
    if (p.showWarehouse && !s.warehouseId) out.push({ field: "warehouseId", message: "Select a warehouse" });
    if (!s.date) out.push({ field: "date", message: `${p.dateLabel} is required` });
    if (p.secondaryDate?.mustBeAfterPrimary && s.date2 && s.date && s.date2 < s.date) {
      out.push({ field: "date2", message: `${p.secondaryDate.label} cannot be before ${p.dateLabel.toLowerCase()}` });
    }
    if (p.showCustomerType && s.customerType === "B2B" && party && !party.gstin) {
      out.push({ field: "customerType", message: "B2B requires a customer with a GSTIN" });
    }
    const real = s.items.filter((l) => l.productId);
    if (!real.length) out.push({ field: "items", message: "Add at least one line item" });
    const seen = new Set<string>();
    s.items.forEach((l, i) => {
      if (!l.productId) return;
      const f = `items[${i}]`;
      const prod = products.find((x) => x.id === l.productId);
      const name = prod?.name ?? `Line ${i + 1}`;
      const key = `${l.productId}|${l.batchId ?? l.batchNo.trim().toUpperCase() ?? "AUTO"}`;
      if (seen.has(key)) out.push({ field: `${f}.productId`, message: `${name} appears more than once${l.batchId || l.batchNo ? " for the same batch" : ""}` });
      seen.add(key);
      if (!(n(l.quantity) > 0)) out.push({ field: `${f}.quantity`, message: `${name}: quantity must be > 0` });
      if (n(l.unitPrice) < 0) out.push({ field: `${f}.unitPrice`, message: `${name}: price cannot be negative` });
      if (n(l.discountPct) < 0 || n(l.discountPct) > 100) out.push({ field: `${f}.discountPct`, message: `${name}: discount must be 0–100 %` });
      if (n(l.taxRate) < 0 || n(l.taxRate) > 100) out.push({ field: `${f}.taxRate`, message: `${name}: tax rate must be 0–100 %` });
      const tracked = prod?.trackBatches !== false;
      if (tracked && batchMode === "receive" && !l.batchId) {
        if (!l.batchNo.trim()) out.push({ field: `${f}.batchNo`, message: `${name}: batch number is required` });
        if (prod?.hasExpiry && !l.expiryDate) out.push({ field: `${f}.expiryDate`, message: `${name}: expiry date is required` });
        if (l.expiryDate && s.date && l.expiryDate <= s.date) out.push({ field: `${f}.expiryDate`, message: `${name}: expiry must be after the document date` });
        if (l.mfgDate && l.expiryDate && l.mfgDate >= l.expiryDate) out.push({ field: `${f}.mfgDate`, message: `${name}: manufacturing date must be before expiry` });
      }
      if (tracked && batchMode === "issue" && l.batchId) {
        const opt = optionsFor(l.productId).find((o) => o.batchId === l.batchId);
        if (opt && n(l.quantity) > n(opt.quantity)) out.push({ field: `${f}.batchId`, message: `${name}: batch ${opt.batchNo} has only ${qty(opt.quantity)} available` });
        if (opt && n(opt.mrp) > 0 && n(l.unitPrice) > n(opt.mrp)) out.push({ field: `${f}.unitPrice`, message: `${name}: rate is above MRP ${money(opt.mrp)} of batch ${opt.batchNo}` });
      }
      if (s.invoiceId) {
        const inv = invoices.find((x) => x.id === s.invoiceId);
        const it = inv?.items.find((x) => x.productId === l.productId);
        if (inv && !it) out.push({ field: `${f}.productId`, message: `${name} is not on the selected invoice` });
        else if (it && n(l.quantity) > n(it.quantity)) out.push({ field: `${f}.quantity`, message: `${name}: exceeds invoiced quantity ${qty(it.quantity)}` });
      }
    });
    if (p.validateExtra) out.push(...p.validateExtra(s, { party, products }));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, party, products, invoices, p, batchOptions]);

  const allErrors = [...clientIssues, ...(serverCheck?.errors ?? [])];
  const canSubmit = clientIssues.length === 0 && !busy;

  // ───── helpers ─────
  const upd = (patch: Partial<DocState>) => setS((x) => ({ ...x, ...patch }));
  const updLine = (i: number, patch: Partial<LineState>) => setS((x) => ({ ...x, items: x.items.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const addLine = () => setS((x) => ({ ...x, items: [...x.items, emptyLine()] }));
  const removeLine = (i: number) => setS((x) => ({ ...x, items: x.items.length === 1 ? [emptyLine()] : x.items.filter((_, j) => j !== i) }));

  function pickProduct(i: number, id: number | null) {
    const prod = products.find((x) => x.id === id);
    updLine(i, {
      productId: id,
      unitPrice: prod ? String(n(prod[priceField])) : "",
      taxRate: prod ? String(n(prod.taxRate)) : "",
      description: prod?.name ?? "",
      batchId: null,
      batchNo: "",
      mfgDate: "",
      expiryDate: "",
      mrp: prod && n(prod.mrp) > 0 ? String(n(prod.mrp)) : "",
    });
  }

  function pickInvoice(id: number | null) {
    const inv = invoices.find((x) => x.id === id);
    if (!inv) return upd({ invoiceId: null });
    // prefill one line per (product, batch) that actually moved on the source document
    const lines: LineState[] = [];
    for (const it of inv.items) {
      const prod = products.find((x) => x.id === it.productId);
      const base = { productId: it.productId, unitPrice: String(n(it.unitPrice)), discountPct: String(n(it.discountPct)), taxRate: String(n(it.taxRate)), description: prod?.name ?? "", mfgDate: "", expiryDate: "", mrp: "" };
      if (it.allocations?.length) for (const a of it.allocations) lines.push({ ...base, quantity: String(n(a.quantity)), batchId: a.batchId, batchNo: a.batchNo });
      else lines.push({ ...base, quantity: String(n(it.quantity)), batchId: it.batchId ?? it.batch?.id ?? null, batchNo: it.batch?.batchNo ?? "" });
    }
    upd({ invoiceId: id, items: lines.length ? lines : [emptyLine()] });
  }

  async function submit(flag: boolean) {
    setSubmitError(null);
    setBusy(flag ? "action" : "draft");
    try {
      const created = await api<{ id: number }>(p.endpoint, { method: "POST", body: p.toPayload({ ...s, items: s.items.filter((l) => l.productId) }, flag) });
      router.push(flag && p.docType ? `${p.listHref}${p.listHref.includes("?") ? "&" : "?"}open=${created.id}` : p.listHref);
      router.refresh();
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e : new ApiError(500, "API not reachable — the document was not saved"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Spinner />;

  const partyLabel = p.partyRole === "customer" ? "Customer" : "Vendor";
  const fieldErr = (f: string) => allErrors.find((e) => e.field === f)?.message;
  const finalVerb = p.docType ? DOC_TYPES[p.docType].finalVerb : "post";
  const actionLabel = p.actionLabel ?? (p.docType ? "Save & submit for approval" : "Save & post");

  return (
    <div className="space-y-4">
      {submitError && <Alert kind="error" title={submitError.message} items={submitError.errors} onClose={() => setSubmitError(null)} />}
      {submitError?.warnings?.length ? <Alert kind="warning" title="Warnings" items={submitError.warnings} /> : null}

      {/* Header fields */}
      <Card title={p.title}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <Field label={partyLabel} required error={fieldErr(p.partyRole === "customer" ? "customerId" : "vendorId") ?? fieldErr("partyId")} className="md:col-span-2">
            <Select value={s.partyId ?? ""} onChange={(e) => upd({ partyId: e.target.value ? Number(e.target.value) : null, invoiceId: null })}>
              <option value="">— select {p.partyRole} —</option>
              {parties.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.code}){x.gstin ? ` · ${x.gstin}` : ""}
                </option>
              ))}
            </Select>
          </Field>

          {p.showCustomerType && (
            <Field label="Customer type" error={fieldErr("customerType")}>
              <Select value={s.customerType} onChange={(e) => upd({ customerType: e.target.value as "B2B" | "B2C" })} disabled={Boolean(p.customerTypePreset)}>
                <option value="B2B">B2B (GST registered)</option>
                <option value="B2C">B2C</option>
              </Select>
            </Field>
          )}

          {p.showWarehouse && (
            <Field label="Warehouse" required error={fieldErr("warehouseId")}>
              <Select value={s.warehouseId ?? ""} onChange={(e) => upd({ warehouseId: e.target.value ? Number(e.target.value) : null })}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label={p.dateLabel} required error={fieldErr("date") ?? fieldErr("orderDate") ?? fieldErr("invoiceDate") ?? fieldErr("poDate")}>
            <Input type="date" value={s.date} onChange={(e) => upd({ date: e.target.value })} />
          </Field>

          {p.secondaryDate && (
            <Field label={p.secondaryDate.label} error={fieldErr("date2") ?? fieldErr("deliveryDate") ?? fieldErr("expectedDate") ?? fieldErr("dueDate")}>
              <Input type="date" value={s.date2} min={s.date || undefined} onChange={(e) => upd({ date2: e.target.value })} />
            </Field>
          )}

          {p.referenceLabel && (
            <Field label={p.referenceLabel} error={fieldErr("vendorInvoiceNo") ?? fieldErr("reference")}>
              <Input value={s.reference} onChange={(e) => upd({ reference: e.target.value })} placeholder="optional" />
            </Field>
          )}

          {p.sourceInvoice && (
            <Field label="Against invoice" hint={party ? `${invoices.length} posted invoice(s) — lines prefill with the batches that shipped` : "select a party first"} error={fieldErr("invoiceId")} className="md:col-span-2">
              <Select value={s.invoiceId ?? ""} onChange={(e) => pickInvoice(e.target.value ? Number(e.target.value) : null)} disabled={!party}>
                <option value="">— none (standalone) —</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNo ?? inv.billNo} · {inv.invoiceDate.slice(0, 10)} · {money(inv.grandTotal)}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {p.showReason && (
            <Field label="Reason">
              <Select value={s.reason} onChange={(e) => upd({ reason: e.target.value })}>
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {p.showRestock && (
            <Field label="Restock returned goods">
              <Select value={s.restock ? "1" : "0"} onChange={(e) => upd({ restock: e.target.value === "1" })}>
                <option value="1">Yes – add back to stock</option>
                <option value="0">No – damaged / written off</option>
              </Select>
            </Field>
          )}

          {(p.extraFields ?? []).map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint} required={f.required} className={f.className}>
              {f.type === "textarea" ? (
                <Textarea rows={2} value={s.extras[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => upd({ extras: { ...s.extras, [f.key]: e.target.value } })} />
              ) : f.type === "select" ? (
                <Select value={s.extras[f.key] ?? ""} onChange={(e) => upd({ extras: { ...s.extras, [f.key]: e.target.value } })}>
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input type={f.type ?? "text"} value={s.extras[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => upd({ extras: { ...s.extras, [f.key]: e.target.value } })} />
              )}
            </Field>
          ))}

          <Field label="Notes" className="md:col-span-3 lg:col-span-4">
            <Textarea value={s.notes} onChange={(e) => upd({ notes: e.target.value })} rows={2} />
          </Field>
        </div>

        {party && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {party.gstin ? `GSTIN ${party.gstin} · ` : "Unregistered · "}
            {party.state ? `${party.state} · ` : ""}
            {interstate ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}
            {n(party.creditLimit) > 0 ? ` · Credit limit ${money(party.creditLimit)}` : ""}
            {party.creditDays ? ` · ${party.creditDays} days` : ""}
          </p>
        )}
      </Card>

      {/* Lines */}
      <Card
        title="Line items"
        padded={false}
        actions={
          <Button size="sm" variant="secondary" onClick={addLine}>
            <Plus className="h-4 w-4" /> Add line
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="thead text-xs uppercase tracking-wide">
              <tr>
                <th className="th">#</th>
                <th className="th" style={{ minWidth: 240 }}>Product</th>
                {batchMode !== "none" && <th className="th" style={{ minWidth: batchMode === "receive" ? 300 : 220 }}>Batch{batchMode === "receive" ? " · expiry · MRP" : ""}</th>}
                <th className="th text-right">Qty</th>
                <th className="th text-right">Rate</th>
                <th className="th text-right">Disc %</th>
                <th className="th text-right">Tax %</th>
                {p.showCondition && <th className="th">Condition</th>}
                <th className="th text-right">Amount</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y-ui">
              {s.items.map((l, i) => {
                const prod = products.find((x) => x.id === l.productId);
                const gross = r2(n(l.quantity) * n(l.unitPrice));
                const taxable = r2(gross * (1 - n(l.discountPct) / 100));
                const lineTotal = r2(taxable + r2((taxable * n(l.taxRate)) / 100));
                const err = (f: string) => allErrors.some((e) => e.field === `items[${i}].${f}`);
                const tracked = prod ? prod.trackBatches !== false : false;
                const preview = serverCheck?.lines?.find((x) => x.index === i);
                return (
                  <tr key={i} className="align-top">
                    <td className="td text-slate-400">{i + 1}</td>
                    <td className="td">
                      <Select value={l.productId ?? ""} onChange={(e) => pickProduct(i, e.target.value ? Number(e.target.value) : null)} className={err("productId") ? "border-red-400" : ""}>
                        <option value="">— select product —</option>
                        {products.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} · {x.sku}
                            {x.stockQty !== undefined ? ` · stock ${qty(x.stockQty)}` : ""}
                          </option>
                        ))}
                      </Select>
                      {prod?.hsnCode && <span className="mt-1 block text-[11px] text-slate-400">HSN {prod.hsnCode}{tracked ? " · batch-tracked" : ""}</span>}
                    </td>
                    {batchMode !== "none" && (
                      <td className="td">
                        {!prod ? (
                          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                        ) : !tracked ? (
                          <span className="text-xs text-slate-400">not batch-tracked</span>
                        ) : batchMode === "issue" ? (
                          <div>
                            <Select value={l.batchId ?? ""} onChange={(e) => { const id = e.target.value ? Number(e.target.value) : null; const opt = optionsFor(l.productId).find((o) => o.batchId === id); updLine(i, { batchId: id, batchNo: opt?.batchNo ?? "", mrp: opt ? String(n(opt.mrp)) : l.mrp }); }} className={err("batchId") ? "border-red-400" : ""}>
                              <option value="">Auto (FEFO — earliest expiry first)</option>
                              {optionsFor(l.productId).map((o) => (
                                <option key={o.batchId} value={o.batchId} disabled={!o.sellable}>
                                  {o.label}{!o.sellable ? (o.expired ? " (expired)" : o.status === "BLOCKED" ? " (blocked)" : " (empty)") : ""}
                                </option>
                              ))}
                            </Select>
                            {!l.batchId && preview && (
                              <span className={`mt-1 block text-[11px] ${preview.shortage && n(preview.shortage) > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"}`}>
                                {preview.allocations.length ? `will pick ${preview.allocations.map((a) => `${a.batchNo} ×${qty(a.quantity)}`).join(", ")}` : "no sellable batch"}
                                {preview.shortage && n(preview.shortage) > 0 ? ` · short by ${qty(preview.shortage)}` : ""}
                              </span>
                            )}
                            {l.batchId && n(l.mrp) > 0 && <span className="mt-1 block text-[11px] text-slate-400">MRP {money(l.mrp)}</span>}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="col-span-2">
                              <Input list={`batches-${i}`} value={l.batchNo} placeholder="Batch no." onChange={(e) => { const v = e.target.value.toUpperCase(); const opt = optionsFor(l.productId).find((o) => o.batchNo === v); updLine(i, { batchNo: v, batchId: opt?.batchId ?? null, expiryDate: opt?.expiryDate ? opt.expiryDate.slice(0, 10) : l.expiryDate, mrp: opt && n(opt.mrp) > 0 ? String(n(opt.mrp)) : l.mrp }); }} className={`font-mono ${err("batchNo") || err("batchId") ? "border-red-400" : ""}`} />
                              <datalist id={`batches-${i}`}>
                                {optionsFor(l.productId).map((o) => (
                                  <option key={o.batchId} value={o.batchNo}>{o.label}</option>
                                ))}
                              </datalist>
                            </div>
                            <Input type="date" value={l.mfgDate} title="Mfg date" onChange={(e) => { const mfg = e.target.value; const exp = !l.expiryDate && mfg && prod.shelfLifeDays ? new Date(new Date(mfg).getTime() + prod.shelfLifeDays * 86400000).toISOString().slice(0, 10) : l.expiryDate; updLine(i, { mfgDate: mfg, expiryDate: exp }); }} disabled={Boolean(l.batchId)} className={err("mfgDate") ? "border-red-400" : ""} />
                            <Input type="date" value={l.expiryDate} title="Expiry date" onChange={(e) => updLine(i, { expiryDate: e.target.value })} disabled={Boolean(l.batchId)} className={err("expiryDate") ? "border-red-400" : ""} />
                            <Input type="number" step="0.01" min="0" value={l.mrp} placeholder="MRP" onChange={(e) => updLine(i, { mrp: e.target.value })} className="col-span-2 text-right" />
                            <span className="col-span-2 text-[10px] text-slate-400">{l.batchId ? "existing batch — dates from master" : "mfg · expiry · MRP"}</span>
                          </div>
                        )}
                      </td>
                    )}
                    <td className="td">
                      <Input type="number" min="0" step="any" value={l.quantity} onChange={(e) => updLine(i, { quantity: e.target.value })} className={`w-24 text-right ${err("quantity") ? "border-red-400" : ""}`} />
                      {prod && <span className="mt-1 block text-right text-[11px] text-slate-400">{prod.unit}</span>}
                    </td>
                    <td className="td">
                      <Input type="number" min="0" step="0.01" value={l.unitPrice} onChange={(e) => updLine(i, { unitPrice: e.target.value })} className={`w-28 text-right ${err("unitPrice") ? "border-red-400" : ""}`} />
                    </td>
                    <td className="td">
                      <Input type="number" min="0" max="100" step="0.01" value={l.discountPct} onChange={(e) => updLine(i, { discountPct: e.target.value })} className={`w-20 text-right ${err("discountPct") ? "border-red-400" : ""}`} />
                    </td>
                    <td className="td">
                      <Input type="number" min="0" max="100" step="0.01" value={l.taxRate} onChange={(e) => updLine(i, { taxRate: e.target.value })} className={`w-20 text-right ${err("taxRate") ? "border-red-400" : ""}`} />
                    </td>
                    {p.showCondition && (
                      <td className="td">
                        <Select value={l.condition ?? "GOOD"} onChange={(e) => updLine(i, { condition: e.target.value })} className="w-28">
                          <option value="GOOD">Good</option>
                          <option value="DAMAGED">Damaged</option>
                        </Select>
                      </td>
                    )}
                    <td className="td text-right font-medium text-slate-800 dark:text-slate-100">{money(lineTotal)}</td>
                    <td className="px-2 py-2">
                      <button onClick={() => removeLine(i)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title="Remove line">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Validation + totals */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {allErrors.length > 0 && <Alert kind="error" title={`${allErrors.length} issue${allErrors.length > 1 ? "s" : ""} to fix`} items={allErrors} />}
          {serverCheck?.warnings?.length ? <Alert kind="warning" title="Warnings (you can still save)" items={serverCheck.warnings} /> : null}
          {allErrors.length === 0 && !serverCheck?.warnings?.length && s.partyId && s.items.some((l) => l.productId) && (
            <Alert kind="success" title={checking ? "Checking with server…" : "Looks good"} />
          )}
        </div>
        <Card title="Totals">
          <dl className="space-y-1.5 text-sm">
            <Row k="Subtotal" v={totals.subtotal} />
            <Row k="Discount" v={-totals.discountAmount} />
            <Row k="Taxable" v={totals.taxableAmount} />
            {interstate ? <Row k="IGST" v={totals.igstAmount} /> : (
              <>
                <Row k="CGST" v={totals.cgstAmount} />
                <Row k="SGST" v={totals.sgstAmount} />
              </>
            )}
            <Row k="Round off" v={totals.roundOff} />
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900 dark:border-ink-700 dark:text-white">
              <dt>Grand total</dt>
              <dd>{money(totals.grandTotal)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={() => submit(true)} disabled={!canSubmit} loading={busy === "action"}>
              {actionLabel}
            </Button>
            <Button variant="secondary" onClick={() => submit(false)} disabled={!canSubmit} loading={busy === "draft"}>
              {p.draftLabel ?? "Save as draft"}
            </Button>
            <Button variant="ghost" onClick={() => router.push(p.listHref)}>
              Cancel
            </Button>
            {p.docType && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Needs three approvals (L1 Checked → L2 Reviewed → L3 Authorised) before it can be {finalVerb === "confirm" ? "confirmed" : "posted"}.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between text-slate-600 dark:text-slate-300">
      <dt>{k}</dt>
      <dd className="tabular-nums">{money(v)}</dd>
    </div>
  );
}

