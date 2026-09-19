"use client";

import { DocumentForm, linesToApi } from "@/components/DocumentForm";
import { PageHeader } from "@/components/ui";

export default function NewDebitNotePage() {
  return (
    <div>
      <PageHeader backHref="/purchase/debit-notes" backLabel="Back to list" title="New Debit Note" subtitle="Select the bill to prefill lines; quantities cannot exceed what was billed" />
      <DocumentForm
        title="Debit note details"
        partyRole="vendor"
        endpoint="/purchase/debit-notes"
        docType="DN"
        listHref="/purchase/debit-notes"
        dateLabel="Note date"
        sourceInvoice="purchase"
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
