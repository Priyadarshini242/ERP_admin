"use client";

import { DocumentForm, linesToApi } from "@/components/DocumentForm";
import { PageHeader } from "@/components/ui";
import type { Issue } from "@/lib/api";
import { n } from "@/lib/format";

export default function NewPurchaseOrderPage() {
  return (
    <div>
      <PageHeader backHref="/purchase/orders" backLabel="Back to list" title="Create Purchase Order"
        subtitle="Validated live: vendor, dates, duplicate lines, price vs. last purchase price, reorder level, open POs for the same item"
      />
      <DocumentForm
        title="PO details"
        partyRole="vendor"
        endpoint="/purchase/orders"
        validateEndpoint="/purchase/orders/validate"
        docType="PO"
        listHref="/purchase/orders"
        dateLabel="PO date"
        secondaryDate={{ label: "Expected delivery", mustBeAfterPrimary: true }}
        showWarehouse
        referenceLabel="Quotation / reference"
        validateExtra={(s, { products }) => {
          const issues: Issue[] = [];
          for (const [i, l] of s.items.entries()) {
            const p = products.find((x) => x.id === l.productId);
            if (p && n(p.purchasePrice) > 0 && n(l.unitPrice) > n(p.purchasePrice) * 1.5) {
              issues.push({ field: `items[${i}].unitPrice`, message: `${p.name}: rate is more than 50% above the last purchase price ${n(p.purchasePrice).toFixed(2)}` });
            }
          }
          return issues;
        }}
        toPayload={(s, flag) => ({
          vendorId: s.partyId,
          warehouseId: s.warehouseId,
          poDate: s.date,
          expectedDate: s.date2 || null,
          reference: s.reference || null,
          notes: s.notes || null,
          items: linesToApi(s.items),
          submit: flag,
        })}
      />
    </div>
  );
}
