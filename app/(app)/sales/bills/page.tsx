"use client";

import { DocumentList } from "@/components/DocumentList";

export default function BillRegisterPage() {
  return (
    <DocumentList
      title="Bill Register"
      subtitle="Bills created from sales invoices, with the source invoice retained for audit and traceability"
      endpoint="/sales/bills"
      fallbackOnServerError
      newHref="/sales/register"
      newLabel="Create from invoice"
      numberField="billNo"
      dateField="billDate"
      partyField="customer"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      showPayment
      extraColumns={[
        { key: "sourceInvoice", header: "Source invoice", render: (bill) => (bill.sourceInvoice as { invoiceNo?: string } | undefined)?.invoiceNo ?? "—" },
      ]}
    />
  );
}
