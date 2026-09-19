"use client";

import Link from "next/link";

import { DataTable } from "@/components/DataTable";
import { CANCEL_ACTION, Info, POST_ACTION, RecordList, type Rec } from "@/components/RecordList";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, money, qty } from "@/lib/format";

export default function MaterialIssueListPage() {
  return (
    <RecordList
      title="Material Issues"
      subtitle="Raw and packing material moved from stores into work-in-progress (or returned), batch by batch, at batch cost."
      endpoint="/manufacturing/issues"
      numberField="issueNo"
      docType="MI"
      newHref="/manufacturing/issues/new"
      newLabel="New Material Issue"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      columns={[
        { key: "issueNo", header: "Issue No.", render: (r) => <span className="font-medium text-brand-700 dark:text-brand-400">{r.issueNo}</span> },
        { key: "issueDate", header: "Date", render: (r) => fmtDate(r.issueDate) },
        { key: "order", header: "Work order", render: (r) => <span>{r.order?.orderNo}<span className="ml-1 text-xs text-slate-400">{r.order?.product?.name}</span></span> },
        { key: "type", header: "Type", render: (r) => <StatusBadge value={r.type} /> },
        { key: "warehouse", header: "Store", render: (r) => r.warehouse?.name },
        { key: "lines", header: "Lines", align: "right", render: (r) => r.items?.length ?? "—" },
        { key: "totalCost", header: "Cost", align: "right", render: (r) => money(r.totalCost) },
        { key: "approvalStatus", header: "Approval", render: (r) => <StatusBadge value={r.approvalStatus} /> },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
      ]}
      actions={[POST_ACTION, CANCEL_ACTION]}
      renderDetail={(d: Rec) => (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Info k="Work order" v={<Link className="text-brand-700 hover:underline dark:text-brand-400" href={`/manufacturing/orders?open=${d.order?.id}`}>{d.order?.orderNo}</Link>} />
            <Info k="Product" v={d.order?.product?.name ?? "—"} />
            <Info k="Type" v={<StatusBadge value={d.type} />} />
            <Info k="Status" v={<span className="inline-flex gap-1"><StatusBadge value={d.status} /><StatusBadge value={d.approvalStatus} /></span>} />
            <Info k="Date" v={fmtDate(d.issueDate)} />
            <Info k="Store" v={d.warehouse?.name ?? "—"} />
            <Info k="Total cost" v={money(d.totalCost)} />
            <Info k="Created" v={`${fmtDate(d.createdAt)}${d.createdBy ? ` · ${d.createdBy.fullName}` : ""}`} />
          </div>
          <DataTable<Rec>
            bare
            columns={[
              { key: "product", header: "Material", render: (i) => <span>{i.product?.name}<span className="ml-1 text-xs text-slate-400">{i.product?.sku}</span></span> },
              { key: "batch", header: "Batch", render: (i) => (i.batch ? <span className="font-mono text-xs">{i.batch.batchNo}{i.batch.expiryDate ? <span className="ml-1 text-slate-400">exp {fmtDate(i.batch.expiryDate)}</span> : null}</span> : i.product?.trackBatches ? <span className="text-xs text-slate-400">FEFO at post</span> : "—") },
              { key: "quantity", header: "Qty", align: "right", render: (i) => `${qty(i.quantity)} ${i.product?.unit ?? ""}` },
              { key: "unitCost", header: "Rate", align: "right", render: (i) => money(i.unitCost) },
              { key: "lineCost", header: "Cost", align: "right", render: (i) => money(i.lineCost) },
              { key: "note", header: "Note", render: (i) => i.note ?? "" },
            ]}
            rows={d.items ?? []}
          />
          {d.notes && <p className="text-slate-500">{d.notes}</p>}
        </div>
      )}
    />
  );
}
