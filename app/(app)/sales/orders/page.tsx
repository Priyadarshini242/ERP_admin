"use client";

import { ACTIONS, DocumentList } from "@/components/DocumentList";
import { fmtDate } from "@/lib/format";

export default function SalesOrdersPage() {
  return (
    <DocumentList
      title="Sales Order List"
      subtitle="Confirm orders to reserve them against credit limits; convert to invoice when shipping"
      docType="SO"
      endpoint="/sales/orders"
      newHref="/sales/orders/new"
      newLabel="Create Sales Order"
      numberField="orderNo"
      dateField="orderDate"
      partyField="customer"
      statusOptions={["DRAFT", "CONFIRMED", "PARTIAL", "COMPLETED", "CANCELLED"]}
      showCustomerType
      extraColumns={[{ key: "deliveryDate", header: "Delivery", render: (d) => fmtDate(d.deliveryDate as string) }]}
      actions={[
        ACTIONS.confirm,
        { label: "Convert to invoice", verb: "convert-to-invoice", variant: "primary", when: (d) => d.status === "CONFIRMED" || d.status === "PARTIAL" },
        { ...ACTIONS.cancel, when: (d) => d.status === "DRAFT" || d.status === "CONFIRMED" },
      ]}
    />
  );
}
