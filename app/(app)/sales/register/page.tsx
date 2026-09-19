"use client";

import { ACTIONS, DocumentList } from "@/components/DocumentList";

export default function SalesRegisterPage() {
  return (
    <DocumentList
      title="Sales Register"
      subtitle="Tax invoices — filter B2B / B2C, post to update stock and ledger, record receipts"
      docType="INV"
      endpoint="/sales/invoices"
      newHref="/sales/register/new"
      newLabel="New invoice"
      numberField="invoiceNo"
      dateField="invoiceDate"
      partyField="customer"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      showCustomerType
      showPayment
      actions={[ACTIONS.post, ACTIONS.cancel]}
    />
  );
}
