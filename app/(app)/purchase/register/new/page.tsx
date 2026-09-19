"use client";

import { DocumentForm, linesToApi } from "@/components/DocumentForm";
import { PageHeader } from "@/components/ui";

export default function NewPurchaseBillPage() {
  return (
    <div>
      <PageHeader backHref="/purchase/register" backLabel="Back to list" title="New Purchase Bill" subtitle="Enter batch no., expiry and MRP per line — batches are created when the approved bill is posted" />
      <DocumentForm
        title="Bill details"
        partyRole="vendor"
        endpoint="/purchase/invoices"
        docType="BILL"
        batchMode="receive"
        validateEndpoint="/purchase/invoices/validate"
        listHref="/purchase/register"
        dateLabel="Bill date"
        secondaryDate={{ label: "Due date", mustBeAfterPrimary: true }}
        showWarehouse
        referenceLabel="Vendor invoice no."
        toPayload={(s, flag) => ({
          vendorId: s.partyId,
          warehouseId: s.warehouseId,
          vendorInvoiceNo: s.reference || null,
          invoiceDate: s.date,
          dueDate: s.date2 || null,
          notes: s.notes || null,
          items: linesToApi(s.items),
          submit: flag,
        })}
      />
    </div>
  );
}
