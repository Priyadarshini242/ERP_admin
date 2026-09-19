"use client";

import { DocumentForm, linesToApi } from "@/components/DocumentForm";
import { PageHeader } from "@/components/ui";
import type { Issue } from "@/lib/api";
import { n } from "@/lib/format";

export default function NewSalesOrderPage() {
  return (
    <div>
      <PageHeader backHref="/sales/orders" backLabel="Back to list" title="Create Sales Order"
        subtitle="Validated live: customer & GSTIN, dates, stock availability in the warehouse, credit limit, duplicate lines"
      />
      <DocumentForm
        title="Order details"
        partyRole="customer"
        endpoint="/sales/orders"
        validateEndpoint="/sales/orders/validate"
        docType="SO"
        listHref="/sales/orders"
        dateLabel="Order date"
        secondaryDate={{ label: "Delivery date", mustBeAfterPrimary: true }}
        showCustomerType
        showWarehouse
        referenceLabel="Customer PO / reference"
        validateExtra={(s, { party, products }) => {
          const issues: Issue[] = [];
          // Client-side credit-limit hint; the server re-checks with real outstanding + open orders.
          if (party && n(party.creditLimit) > 0) {
            const total = s.items.reduce((sum, l) => {
              const p = products.find((x) => x.id === l.productId);
              if (!p) return sum;
              const taxable = n(l.quantity) * n(l.unitPrice) * (1 - n(l.discountPct) / 100);
              return sum + taxable * (1 + n(l.taxRate) / 100);
            }, 0);
            if (total > n(party.creditLimit)) {
              issues.push({ field: "customerId", message: `Order value exceeds the credit limit of ${n(party.creditLimit).toFixed(2)}` });
            }
          }
          // Stock hint from the product master (server checks the exact warehouse balance).
          for (const [i, l] of s.items.entries()) {
            const p = products.find((x) => x.id === l.productId);
            if (p && p.stockQty !== undefined && n(l.quantity) > n(p.stockQty)) {
              issues.push({ field: `items[${i}].quantity`, message: `${p.name}: ordering ${n(l.quantity)} but only ${n(p.stockQty)} in stock overall` });
            }
          }
          return issues;
        }}
        toPayload={(s, flag) => ({
          customerId: s.partyId,
          customerType: s.customerType,
          warehouseId: s.warehouseId,
          orderDate: s.date,
          deliveryDate: s.date2 || null,
          reference: s.reference || null,
          notes: s.notes || null,
          items: linesToApi(s.items),
          submit: flag,
        })}
      />
    </div>
  );
}
