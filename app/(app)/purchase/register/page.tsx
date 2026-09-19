"use client";

import { ACTIONS, DocumentList } from "@/components/DocumentList";

export default function PurchaseRegisterPage() {
  return (
    <DocumentList
      title="Purchase Register"
      subtitle="Vendor bills — posting adds stock, books Dr Purchases + GST Input / Cr Vendor, and updates last purchase price"
      docType="BILL"
      endpoint="/purchase/invoices"
      newHref="/purchase/register/new"
      newLabel="New bill"
      numberField="billNo"
      dateField="invoiceDate"
      partyField="vendor"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      showPayment
      extraColumns={[{ key: "vendorInvoiceNo", header: "Vendor inv.", render: (d) => (d.vendorInvoiceNo as string) || "—" }]}
      actions={[ACTIONS.post, ACTIONS.cancel]}
    />
  );
}
