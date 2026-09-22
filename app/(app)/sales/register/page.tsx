"use client";

import { ACTIONS, DocumentList } from "@/components/DocumentList";

export default function SalesRegisterPage() {
  return (
    <DocumentList
      title="Sales Register"
      subtitle="Tax invoices — filter B2B / B2C, post to update stock and ledger, record receipts"
      docType="INV"
      endpoint="/sales/invoices"
      newActions={[
        { label: "B2B Invoice", href: "/sales/register/new?type=B2B" },
        { label: "B2C Invoice", href: "/sales/register/new?type=B2C" },
      ]}
      numberField="invoiceNo"
      dateField="invoiceDate"
      partyField="customer"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      showCustomerType
      showPayment
      actions={[
        ACTIONS.post,
        {
          label: "Create bill",
          verb: "create-bill",
          variant: "primary",
          href: (invoice) => `/sales/bills/new?invoiceId=${invoice.id}`,
          when: (invoice) => invoice.status === "POSTED",
        },
        ACTIONS.cancel,
      ]}
    />
  );
}
