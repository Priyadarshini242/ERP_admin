"use client";

import { ACTIONS, DocumentList } from "@/components/DocumentList";
import { titleCase } from "@/lib/format";

export default function SalesReturnsPage() {
  return (
    <DocumentList
      title="Sales Returns"
      subtitle="Goods coming back from customers — posting restocks the warehouse and credits the customer"
      docType="SR"
      endpoint="/returns/sales"
      newHref="/returns/sales/new"
      newLabel="New sales return"
      numberField="returnNo"
      dateField="returnDate"
      partyField="customer"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      extraColumns={[
        { key: "reason", header: "Reason", render: (d) => titleCase(d.reason as string) },
        { key: "restock", header: "Restock", render: (d) => (d.restock ? "Yes" : "No") },
      ]}
      actions={[ACTIONS.post, ACTIONS.cancel]}
    />
  );
}
