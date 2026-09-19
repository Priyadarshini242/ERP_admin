"use client";

import { DocumentForm, linesToApi } from "@/components/DocumentForm";
import { PageHeader } from "@/components/ui";

export default function NewPurchaseReturnPage() {
  return (
    <div>
      <PageHeader backHref="/returns/purchase" backLabel="Back to list" title="New Purchase Return" subtitle="Pick the original bill to prefill; stock leaves the selected warehouse on posting" />
      <DocumentForm
        title="Return details"
        partyRole="vendor"
        endpoint="/returns/purchase"
        docType="PR"
        batchMode="issue"
        validateEndpoint="/returns/purchase/validate"
        listHref="/returns/purchase"
        dateLabel="Return date"
        showWarehouse
        sourceInvoice="purchase"
        showReason
        showCondition
        toPayload={(s, flag) => ({
          partyId: s.partyId,
          invoiceId: s.invoiceId,
          warehouseId: s.warehouseId,
          date: s.date,
          reason: s.reason,
          notes: s.notes || null,
          items: linesToApi(s.items, (l) => ({ condition: l.condition ?? "GOOD" })),
          submit: flag,
        })}
      />
    </div>
  );
}
