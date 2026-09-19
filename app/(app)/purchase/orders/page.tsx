"use client";

import { ACTIONS, DocumentList } from "@/components/DocumentList";
import { fmtDate } from "@/lib/format";

export default function PurchaseOrdersPage() {
  return (
    <DocumentList
      title="PO List"
      subtitle="Confirm to send to the vendor; convert to bill when goods arrive"
      docType="PO"
      endpoint="/purchase/orders"
      newHref="/purchase/orders/new"
      newLabel="Create PO"
      numberField="poNo"
      dateField="poDate"
      partyField="vendor"
      statusOptions={["DRAFT", "CONFIRMED", "PARTIAL", "COMPLETED", "CANCELLED"]}
      extraColumns={[{ key: "expectedDate", header: "Expected", render: (d) => fmtDate(d.expectedDate as string) }]}
      actions={[
        ACTIONS.confirm,
        { label: "Convert to bill", verb: "convert-to-bill", variant: "primary", when: (d) => d.status === "CONFIRMED" || d.status === "PARTIAL" },
        { ...ACTIONS.cancel, when: (d) => d.status === "DRAFT" || d.status === "CONFIRMED" },
      ]}
    />
  );
}
