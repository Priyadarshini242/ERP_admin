"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { DocumentForm, linesToApi } from "@/components/DocumentForm";
import { PageHeader } from "@/components/ui";

function NewSalesInvoice() {
  const params = useSearchParams();
  const fromUrl = params.get("type") === "B2B" ? "B2B" : params.get("type") === "B2C" ? "B2C" : "B2C";
  return (
    <div>
      <PageHeader backHref="/sales/register" backLabel="Back to list" title="New Sales Invoice" subtitle="Batch-tracked lines pick a batch or auto-allocate FEFO. After three-level approval, posting reduces stock and books Dr Customer / Cr Sales + GST Output" />
      <DocumentForm
        title="Invoice details"
        partyRole="customer"
        endpoint="/sales/invoices"
        docType="INV"
        batchMode="issue"
        validateEndpoint="/sales/invoices/validate"
        listHref="/sales/register"
        dateLabel="Invoice date"
        secondaryDate={{ label: "Due date", mustBeAfterPrimary: true }}
        showCustomerType
        showWarehouse
        customerTypePreset={fromUrl}
        toPayload={(s, flag) => ({
          customerId: s.partyId,
          customerType: s.customerType,
          warehouseId: s.warehouseId,
          invoiceDate: s.date,
          dueDate: s.date2 || null,
          notes: s.notes || null,
          items: linesToApi(s.items),
          submit: flag,
        })}
      />
    </div>
  );
}

export default function NewSalesInvoicePage() {
  return (
    <Suspense>
      <NewSalesInvoice />
    </Suspense>
  );
}
