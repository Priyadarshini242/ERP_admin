"use client";

import { ACTIONS, DocumentList } from "@/components/DocumentList";
import { titleCase } from "@/lib/format";

export default function DebitNotesPage() {
  return (
    <DocumentList
      title="Debit Note Register"
      subtitle="Debits raised on vendors against posted bills (ledger only — use Purchase Returns to move stock)"
      docType="DN"
      endpoint="/purchase/debit-notes"
      newHref="/purchase/debit-notes/new"
      newLabel="New debit note"
      numberField="noteNo"
      dateField="noteDate"
      partyField="vendor"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      extraColumns={[{ key: "reason", header: "Reason", render: (d) => titleCase(d.reason as string) }]}
      actions={[ACTIONS.post, ACTIONS.cancel]}
    />
  );
}
