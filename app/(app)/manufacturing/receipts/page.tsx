"use client";

import Link from "next/link";

import { DataTable } from "@/components/DataTable";
import { CANCEL_ACTION, Info, POST_ACTION, RecordList, type Rec } from "@/components/RecordList";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, money, qty } from "@/lib/format";

export default function ProductionReceiptListPage() {
  return (
    <RecordList
      title="Production Receipts"
      subtitle="Finished goods and by-products received from a work order. Posting creates the FG lot, absorbs WIP into its cost and opens QC if the product requires it."
      endpoint="/manufacturing/receipts"
      numberField="receiptNo"
      docType="FGR"
      newHref="/manufacturing/receipts/new"
      newLabel="New Production Receipt"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      columns={[
        { key: "receiptNo", header: "Receipt No.", render: (r) => <span className="font-medium text-brand-700 dark:text-brand-400">{r.receiptNo}{r.isFinal && <span className="ml-1 text-xs font-normal text-slate-400">final</span>}</span> },
        { key: "receiptDate", header: "Date", render: (r) => fmtDate(r.receiptDate) },
        { key: "order", header: "Work order", render: (r) => <span>{r.order?.orderNo}<span className="ml-1 text-xs text-slate-400">{r.order?.product?.name}</span></span> },
        { key: "output", header: "Output", align: "right", render: (r) => qty((r.items ?? []).filter((i: Rec) => i.kind === "OUTPUT").reduce((s: number, i: Rec) => s + Number(i.quantity), 0)) },
        { key: "scrapQty", header: "Scrap", align: "right", render: (r) => qty(r.scrapQty) },
        { key: "unitCost", header: "Unit cost", align: "right", render: (r) => money(r.unitCost) },
        { key: "totalCost", header: "Total", align: "right", render: (r) => money(r.totalCost) },
        { key: "approvalStatus", header: "Approval", render: (r) => <StatusBadge value={r.approvalStatus} /> },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
      ]}
      actions={[POST_ACTION, CANCEL_ACTION]}
      renderDetail={(d: Rec) => (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Info k="Work order" v={<Link className="text-brand-700 hover:underline dark:text-brand-400" href={`/manufacturing/orders?open=${d.order?.id}`}>{d.order?.orderNo}</Link>} />
            <Info k="Product" v={d.order?.product?.name ?? "—"} />
            <Info k="Received into" v={d.warehouse?.name ?? "—"} />
            <Info k="Status" v={<span className="inline-flex gap-1"><StatusBadge value={d.status} /><StatusBadge value={d.approvalStatus} />{d.isFinal && <StatusBadge value="FINAL" label="Closes WO" />}</span>} />
            <Info k="Date" v={fmtDate(d.receiptDate)} />
            <Info k="Scrap" v={`${qty(d.scrapQty)}${d.scrapReason ? ` · ${d.scrapReason}` : ""}`} />
            <Info k="Overhead absorbed" v={money(d.overheadAmount)} />
            <Info k="Unit cost · total" v={`${money(d.unitCost)} · ${money(d.totalCost)}`} />
          </div>
          <DataTable<Rec>
            bare
            columns={[
              { key: "kind", header: "Kind", render: (i) => <StatusBadge value={i.kind} /> },
              { key: "product", header: "Product", render: (i) => <span>{i.product?.name}<span className="ml-1 text-xs text-slate-400">{i.product?.sku}</span></span> },
              { key: "batch", header: "Lot", render: (i) => <span className="font-mono text-xs">{i.batch?.batchNo ?? i.batchNo ?? "—"}{i.batch?.qcStatus && <StatusBadge value={i.batch.qcStatus} className="ml-2" />}</span> },
              { key: "dates", header: "Mfg → Exp", render: (i) => `${i.mfgDate ? fmtDate(i.mfgDate) : "—"} → ${i.expiryDate ? fmtDate(i.expiryDate) : "—"}` },
              { key: "quantity", header: "Qty", align: "right", render: (i) => `${qty(i.quantity)} ${i.unit ?? ""}` },
              { key: "mrp", header: "MRP", align: "right", render: (i) => (i.mrp != null ? money(i.mrp) : "—") },
              { key: "unitCost", header: "Unit cost", align: "right", render: (i) => money(i.unitCost) },
              { key: "lineCost", header: "Cost", align: "right", render: (i) => money(i.lineCost) },
            ]}
            rows={d.items ?? []}
          />
          {d.deviationNote && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"><b>Deviation:</b> {d.deviationNote}</p>}
          {d.notes && <p className="text-slate-500">{d.notes}</p>}
        </div>
      )}
    />
  );
}
