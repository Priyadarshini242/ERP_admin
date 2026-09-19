"use client";

import Link from "next/link";

import { DataTable } from "@/components/DataTable";
import { Info, RecordList, type Rec } from "@/components/RecordList";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui";
import { fmtDate, money, qty } from "@/lib/format";

const OPEN = ["RELEASED", "IN_PROGRESS"];

export default function WorkOrderListPage() {
  return (
    <RecordList
      title="Work Orders"
      subtitle="Plan a production lot from a BOM, release it after three-level approval, then issue materials and receive output against it."
      endpoint="/manufacturing/orders"
      numberField="orderNo"
      docType="WO"
      newHref="/manufacturing/orders/new"
      newLabel="Create Work Order"
      statusOptions={["DRAFT", "RELEASED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]}
      columns={[
        { key: "orderNo", header: "WO No.", render: (r) => <span className="font-medium text-brand-700 dark:text-brand-400">{r.orderNo}</span> },
        { key: "orderDate", header: "Date", render: (r) => fmtDate(r.orderDate) },
        { key: "product", header: "Product", render: (r) => <span>{r.product?.name}<span className="ml-1 text-xs text-slate-400">{r.product?.sku}</span></span> },
        { key: "fgBatchNo", header: "FG batch", render: (r) => <span className="font-mono text-xs">{r.fgBatchNo}</span> },
        { key: "plannedQty", header: "Planned", align: "right", render: (r) => `${qty(r.plannedQty)} ${r.unit}` },
        { key: "producedQty", header: "Produced", align: "right", render: (r) => qty(r.producedQty) },
        { key: "yieldPct", header: "Yield", align: "right", render: (r) => (r.yieldPct != null ? `${Number(r.yieldPct).toFixed(1)}%` : "—") },
        { key: "wip", header: "Open WIP", align: "right", render: (r) => money(Number(r.issuedCost) - Number(r.absorbedCost)) },
        { key: "approvalStatus", header: "Approval", render: (r) => <StatusBadge value={r.approvalStatus} /> },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
      ]}
      actions={[
        { label: "Release", verb: "confirm", variant: "primary", when: (d) => d.status === "DRAFT" && d.approvalStatus === "APPROVED", confirm: "Release this work order to the shop floor? Materials can then be issued against it." },
        { label: "Cancel", verb: "cancel", variant: "danger", when: (d) => d.status === "DRAFT" || (OPEN.includes(d.status) && Number(d.issuedCost) === 0), confirm: "Cancel this work order?" },
      ]}
      modalWidth="max-w-5xl"
      renderDetail={(d: Rec) => <WoDetail d={d} />}
    />
  );
}

function WoDetail({ d }: { d: Rec }) {
  const open = OPEN.includes(d.status);
  const wip = Number(d.issuedCost) - Number(d.absorbedCost);
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Info k="Product" v={`${d.product?.name ?? ""} (${d.product?.sku ?? ""})`} />
        <Info k="BOM" v={d.bom ? `${d.bom.bomNo} v${d.bom.version} · ${d.bom.name}` : "—"} />
        <Info k="Planned qty" v={`${qty(d.plannedQty)} ${d.unit}`} />
        <Info k="Status" v={<span className="inline-flex gap-1"><StatusBadge value={d.status} /><StatusBadge value={d.approvalStatus} /></span>} />
        <Info k="Materials from" v={d.warehouse?.name ?? "—"} />
        <Info k="Finished goods into" v={d.fgWarehouse?.name ?? "—"} />
        <Info k="FG batch" v={<span className="font-mono">{d.fgBatchNo}</span>} />
        <Info k="Mfg / expiry" v={`${fmtDate(d.fgMfgDate)} → ${d.fgExpiryDate ? fmtDate(d.fgExpiryDate) : "—"}`} />
        <Info k="Planned window" v={`${d.plannedStartDate ? fmtDate(d.plannedStartDate) : "—"} → ${d.plannedEndDate ? fmtDate(d.plannedEndDate) : "—"}`} />
        <Info k="Sales order" v={d.salesOrder ? <Link className="text-brand-700 hover:underline dark:text-brand-400" href={`/sales/orders?open=${d.salesOrder.id}`}>{d.salesOrder.orderNo}</Link> : "—"} />
        <Info k="Reference" v={d.reference ?? "—"} />
        <Info k="Created" v={`${fmtDate(d.createdAt)}${d.createdBy ? ` · ${d.createdBy.fullName}` : ""}`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Planned cost", money(d.plannedCost)],
          ["Issued to WIP", money(d.issuedCost)],
          ["Absorbed to FG", money(d.absorbedCost)],
          ["Open WIP", money(wip)],
          ["Produced / scrap", `${qty(d.producedQty)} / ${qty(d.scrapQty)}`],
          ["Yield · variance", `${d.yieldPct != null ? `${Number(d.yieldPct).toFixed(1)}%` : "—"} · ${money(d.varianceAmount)}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-ink-700 dark:bg-ink-900/40">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{k}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{v}</p>
          </div>
        ))}
      </div>

      {open && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/manufacturing/issues/new?orderId=${d.id}`}><Button size="sm">Issue materials</Button></Link>
          <Link href={`/manufacturing/issues/new?orderId=${d.id}&type=RETURN`}><Button size="sm" variant="secondary">Return materials</Button></Link>
          <Link href={`/manufacturing/receipts/new?orderId=${d.id}`}><Button size="sm" variant="secondary">Receive output</Button></Link>
        </div>
      )}

      <DataTable<Rec>
        bare
        columns={[
          { key: "product", header: "Component", render: (i) => <span>{i.product?.name}<span className="ml-1 text-xs text-slate-400">{i.product?.sku}</span>{i.isUnplanned && <StatusBadge value="UNPLANNED" label="Unplanned" className="ml-2" />}</span> },
          { key: "role", header: "Role", render: (i) => <StatusBadge value={i.role} /> },
          { key: "plannedQty", header: "Planned", align: "right", render: (i) => `${qty(i.plannedQty)} ${i.unit}` },
          { key: "issuedQty", header: "Issued", align: "right", render: (i) => qty(i.issuedQty) },
          { key: "returnedQty", header: "Returned", align: "right", render: (i) => qty(i.returnedQty) },
          { key: "receivedQty", header: "Received", align: "right", render: (i) => (i.role === "BY_PRODUCT" ? qty(i.receivedQty) : "—") },
          { key: "estUnitCost", header: "Est. rate", align: "right", render: (i) => money(i.estUnitCost) },
          { key: "balance", header: "Balance", align: "right", render: (i) => (i.role === "COMPONENT" ? qty(Number(i.plannedQty) - Number(i.issuedQty) + Number(i.returnedQty)) : "—") },
        ]}
        rows={d.items ?? []}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Material issues</p>
          <DataTable<Rec>
            bare
            empty="No issues yet"
            columns={[
              { key: "issueNo", header: "No.", render: (i) => <Link className="text-brand-700 hover:underline dark:text-brand-400" href={`/manufacturing/issues?open=${i.id}`}>{i.issueNo}</Link> },
              { key: "issueDate", header: "Date", render: (i) => fmtDate(i.issueDate) },
              { key: "type", header: "Type", render: (i) => <StatusBadge value={i.type} /> },
              { key: "totalCost", header: "Cost", align: "right", render: (i) => money(i.totalCost) },
              { key: "status", header: "Status", render: (i) => <span className="inline-flex gap-1"><StatusBadge value={i.status} /><StatusBadge value={i.approvalStatus} /></span> },
            ]}
            rows={d.issues ?? []}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Production receipts</p>
          <DataTable<Rec>
            bare
            empty="No receipts yet"
            columns={[
              { key: "receiptNo", header: "No.", render: (i) => <Link className="text-brand-700 hover:underline dark:text-brand-400" href={`/manufacturing/receipts?open=${i.id}`}>{i.receiptNo}{i.isFinal && <span className="ml-1 text-xs text-slate-400">final</span>}</Link> },
              { key: "receiptDate", header: "Date", render: (i) => fmtDate(i.receiptDate) },
              { key: "scrapQty", header: "Scrap", align: "right", render: (i) => qty(i.scrapQty) },
              { key: "totalCost", header: "Cost", align: "right", render: (i) => money(i.totalCost) },
              { key: "status", header: "Status", render: (i) => <span className="inline-flex gap-1"><StatusBadge value={i.status} /><StatusBadge value={i.approvalStatus} /></span> },
            ]}
            rows={d.receipts ?? []}
          />
        </div>
      </div>

      {d.batches?.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Lots produced</p>
          <div className="flex flex-wrap gap-2">
            {d.batches.map((b: Rec) => (
              <Link key={b.id} href={`/manufacturing/genealogy?batchId=${b.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 dark:border-ink-700 dark:hover:bg-ink-800">
                <span className="font-mono font-medium">{b.batchNo}</span>
                <StatusBadge value={b.qcStatus} />
                {b.status !== "ACTIVE" && <StatusBadge value={b.status} />}
                {b.expiryDate && <span className="text-slate-400">exp {fmtDate(b.expiryDate)}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
      {d.deviationNote && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"><b>Deviation:</b> {d.deviationNote}</p>}
      {d.notes && <p className="text-slate-500">{d.notes}</p>}
    </div>
  );
}
