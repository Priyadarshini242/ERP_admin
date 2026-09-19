"use client";

import { DocumentForm, linesToApi } from "@/components/DocumentForm";
import { PageHeader } from "@/components/ui";

export default function NewSalesReturnPage() {
  return (
    <div>
      <PageHeader backHref="/returns/sales" backLabel="Back to list" title="New Sales Return" subtitle="Pick the original invoice to prefill; choose whether goods go back into stock" />
      <DocumentForm
        title="Return details"
        partyRole="customer"
        endpoint="/returns/sales"
        docType="SR"
        batchMode="receive"
        validateEndpoint="/returns/sales/validate"
        listHref="/returns/sales"
        dateLabel="Return date"
        showWarehouse
        sourceInvoice="sales"
        showReason
        showRestock
        showCondition
        toPayload={(s, flag) => ({
          partyId: s.partyId,
          invoiceId: s.invoiceId,
          warehouseId: s.warehouseId,
          date: s.date,
          reason: s.reason,
          restock: s.restock,
          notes: s.notes || null,
          items: linesToApi(s.items, (l) => ({ condition: l.condition ?? "GOOD" })),
          submit: flag,
        })}
      />
    </div>
  );
}
