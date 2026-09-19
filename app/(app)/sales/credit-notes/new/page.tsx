"use client";

import { DocumentForm, linesToApi } from "@/components/DocumentForm";
import { PageHeader } from "@/components/ui";

export default function NewCreditNotePage() {
  return (
    <div>
      <PageHeader backHref="/sales/credit-notes" backLabel="Back to list" title="New Credit Note" subtitle="Select the invoice to prefill lines; quantities cannot exceed what was invoiced" />
      <DocumentForm
        title="Credit note details"
        partyRole="customer"
        endpoint="/sales/credit-notes"
        docType="CN"
        listHref="/sales/credit-notes"
        dateLabel="Note date"
        sourceInvoice="sales"
        showReason
        toPayload={(s, flag) => ({
          partyId: s.partyId,
          invoiceId: s.invoiceId,
          date: s.date,
          reason: s.reason,
          notes: s.notes || null,
          items: linesToApi(s.items),
          submit: flag,
        })}
      />
    </div>
  );
}
