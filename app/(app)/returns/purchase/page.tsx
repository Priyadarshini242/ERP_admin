"use client";

import { ACTIONS, DocumentList } from "@/components/DocumentList";
import { titleCase } from "@/lib/format";

export default function PurchaseReturnsPage() {
  return (
    <DocumentList
      title="Purchase Returns"
      subtitle="Goods sent back to vendors — posting removes stock and debits the vendor"
      docType="PR"
      endpoint="/returns/purchase"
      newHref="/returns/purchase/new"
      newLabel="New purchase return"
      numberField="returnNo"
      dateField="returnDate"
      partyField="vendor"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      extraColumns={[{ key: "reason", header: "Reason", render: (d) => titleCase(d.reason as string) }]}
      actions={[ACTIONS.post, ACTIONS.cancel]}
    />
  );
}
