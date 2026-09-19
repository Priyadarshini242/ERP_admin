"use client";

import { ACTIONS, DocumentList } from "@/components/DocumentList";
import { titleCase } from "@/lib/format";

export default function CreditNotesPage() {
  return (
    <DocumentList
      title="Credit Note Register"
      subtitle="Credits issued to customers against posted invoices (ledger only — use Sales Returns to restock)"
      docType="CN"
      endpoint="/sales/credit-notes"
      newHref="/sales/credit-notes/new"
      newLabel="New credit note"
      numberField="noteNo"
      dateField="noteDate"
      partyField="customer"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      extraColumns={[{ key: "reason", header: "Reason", render: (d) => titleCase(d.reason as string) }]}
      actions={[ACTIONS.post, ACTIONS.cancel]}
    />
  );
}
