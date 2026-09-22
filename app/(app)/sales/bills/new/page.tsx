"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Alert, Button, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { nextDemoBillNo, saveDemoBill } from "@/lib/bills";
import { demoFor } from "@/lib/demo";
import { fmtDate, money, today } from "@/lib/format";

type Invoice = Record<string, any>;

function CreateBillPage() {
  const router = useRouter();
  const params = useSearchParams();
  const invoiceId = params.get("invoiceId");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [billDate, setBillDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) { setLoading(false); return; }
    api<Invoice>(`/sales/invoices/${invoiceId}`)
      .then(setInvoice)
      .catch((e) => {
        // A missing/not-yet-deployed billing API should not make this workflow unusable.
        // Fall back to the invoice-register data for network and server errors, but keep
        // genuine client errors (such as permission errors) visible to the user.
        if (!(e instanceof ApiError) || e.status >= 500) {
          const fallback = demoFor("/sales/invoices") as { items?: Invoice[] } | null;
          setInvoice(fallback?.items?.find((item) => String(item.id) === invoiceId) ?? null);
        } else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [invoiceId]);

  async function save() {
    if (!invoice) return;
    setSaving(true);
    setError(null);
    const payload = {
      sourceInvoiceId: invoice.id,
      billDate,
      customerId: invoice.customer?.id,
      items: (invoice.items ?? []).map((item: Invoice) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, discountPct: item.discountPct, taxRate: item.taxRate })),
    };
    try {
      const created = await api<Invoice>("/sales/bills", { method: "POST", body: payload });
      router.push(`/sales/bills?open=${created.id}&created=1`);
    } catch (e) {
      if (e instanceof ApiError && e.status < 500) {
        setError(e.message);
        return;
      }
      const billNo = nextDemoBillNo();
      const id = `demo-${Date.now()}`;
      saveDemoBill({
        ...invoice,
        id,
        billNo,
        billDate,
        sourceInvoice: { id: invoice.id, invoiceNo: invoice.invoiceNo },
        status: "DRAFT",
        paymentStatus: "UNPAID",
      });
      router.push(`/sales/bills?open=${id}&created=1`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (!invoice) return <Alert kind="error" title={error ?? "Choose a sales invoice before creating a bill."} />;

  return (
    <div>
      <PageHeader backHref="/sales/register" backLabel="Back to invoices" title="Create Bill from Invoice" subtitle="Customer and line items have been copied from the selected sales invoice." />
      <div className="card max-w-5xl">
        <div className="border-b border-slate-200 p-5 dark:border-ink-700">
          <Alert kind="info" title={`Invoice ${invoice.invoiceNo} details have been loaded. You can review the bill before saving.`} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Bill no."><Input value="Generated when saved" disabled /></Field>
            <Field label="Bill date" required><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></Field>
            <Field label="Reference invoice"><Input value={invoice.invoiceNo ?? ""} disabled /></Field>
            <Field label="Customer" className="sm:col-span-3"><Input value={invoice.customer?.name ?? ""} disabled /></Field>
          </div>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="min-w-full text-sm">
            <thead className="thead text-xs uppercase"><tr><th className="th">Item</th><th className="th text-right">Qty</th><th className="th text-right">Rate</th><th className="th text-right">Discount</th><th className="th text-right">Tax</th><th className="th text-right">Amount</th></tr></thead>
            <tbody className="divide-y-ui">
              {(invoice.items ?? []).map((item: Invoice) => <tr key={item.id ?? item.productId}><td className="td">{item.product?.name ?? item.description}</td><td className="td text-right">{item.quantity}</td><td className="td text-right">{money(item.unitPrice)}</td><td className="td text-right">{item.discountPct ?? 0}%</td><td className="td text-right">{item.taxRate ?? 0}%</td><td className="td text-right font-medium">{money(item.lineTotal)}</td></tr>)}
            </tbody>
          </table>
          <div className="ml-auto mt-4 w-full max-w-xs space-y-1 rounded-lg bg-slate-50 p-3 text-sm dark:bg-ink-800">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(invoice.taxableAmount)}</span></div>
            <div className="flex justify-between"><span>GST</span><span>{money(invoice.taxAmount)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold dark:border-ink-700"><span>Grand total</span><span>{money(invoice.grandTotal)}</span></div>
          </div>
        </div>
        {error && <div className="px-5"><Alert kind="error" title={error} /></div>}
        <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-ink-700"><Button variant="secondary" onClick={() => router.back()}>Cancel</Button><Button loading={saving} onClick={save}><CheckCircle2 className="h-4 w-4" /> Save bill</Button></div>
      </div>
    </div>
  );
}

export default function NewSalesBillPage() {
  return <Suspense fallback={<Spinner />}><CreateBillPage /></Suspense>;
}
