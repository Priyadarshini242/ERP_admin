"use client";

import { AlertTriangle, ClipboardList, Factory, FlaskConical, Layers, PackagePlus, Plus, Timer } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Card, PageHeader, Pill } from "@/components/ui";
import { fmtDate, money, qty } from "@/lib/format";
import { useFetch, useList } from "@/lib/hooks";
import type { Rec } from "@/lib/manufacturing";

interface Summary {
  openOrders: number;
  inProgress: number;
  completedThisMonth: number;
  qcPending: number;
  quarantinedBatches: number;
  wipValue: string;
}

export default function ManufacturingDashboard() {
  const { data: summary, demo } = useFetch<Summary>("/manufacturing/summary");
  const { items: orders } = useList<Rec>("/manufacturing/orders", { pageSize: 8 });
  const { items: qc } = useList<Rec>("/manufacturing/qc", { status: "DRAFT", pageSize: 6 });

  const open = orders.filter((o) => ["DRAFT", "RELEASED", "IN_PROGRESS"].includes(o.status));

  return (
    <div>
      <PageHeader
        title="Production Dashboard"
        subtitle="Work orders, WIP value and quality holds across the plant"
        actions={
          <>
            <Link href="/manufacturing/boms/new"><Button variant="secondary"><Layers className="h-4 w-4" /> New BOM</Button></Link>
            <Link href="/manufacturing/orders/new"><Button><Plus className="h-4 w-4" /> Create Work Order</Button></Link>
          </>
        }
      />
      {demo && <Pill tone="warning" className="mb-3">offline · demo data</Pill>}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Tile label="Open work orders" value={summary?.openOrders ?? 0} icon={<ClipboardList className="h-4 w-4" />} href="/manufacturing/orders?status=RELEASED" />
        <Tile label="In progress" value={summary?.inProgress ?? 0} icon={<Factory className="h-4 w-4" />} href="/manufacturing/orders?status=IN_PROGRESS" />
        <Tile label="Completed this month" value={summary?.completedThisMonth ?? 0} icon={<PackagePlus className="h-4 w-4" />} href="/manufacturing/orders?status=COMPLETED" />
        <Tile label="WIP value" value={money(summary?.wipValue ?? 0)} icon={<Timer className="h-4 w-4" />} />
        <Tile label="QC pending" value={summary?.qcPending ?? 0} tone={summary?.qcPending ? "warning" : undefined} icon={<FlaskConical className="h-4 w-4" />} href="/manufacturing/qc?status=DRAFT" />
        <Tile label="Quarantined lots" value={summary?.quarantinedBatches ?? 0} tone={summary?.quarantinedBatches ? "warning" : undefined} icon={<AlertTriangle className="h-4 w-4" />} href="/inventory/stock/management?view=batch&filter=quarantine" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Open work orders" className="lg:col-span-2" padded={false} actions={<Link href="/manufacturing/orders" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">View all</Link>}>
          <DataTable<Rec>
            bare
            empty="No open work orders"
            columns={[
              { key: "orderNo", header: "WO No.", render: (r) => <Link className="font-medium text-brand-700 hover:underline dark:text-brand-400" href={`/manufacturing/orders?open=${r.id}`}>{r.orderNo}</Link> },
              { key: "product", header: "Product", render: (r) => r.product?.name },
              { key: "fgBatchNo", header: "FG lot", render: (r) => <span className="font-mono text-xs">{r.fgBatchNo}</span> },
              { key: "plannedQty", header: "Planned", align: "right", render: (r) => `${qty(r.plannedQty)} ${r.unit}` },
              { key: "producedQty", header: "Produced", align: "right", render: (r) => qty(r.producedQty) },
              { key: "wip", header: "Open WIP", align: "right", render: (r) => money(Number(r.issuedCost) - Number(r.absorbedCost)) },
              { key: "status", header: "Status", render: (r) => <span className="inline-flex gap-1"><StatusBadge value={r.status} /><StatusBadge value={r.approvalStatus} /></span> },
            ]}
            rows={open}
          />
        </Card>

        <Card title="Quality queue" padded={false} actions={<Link href="/manufacturing/qc" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">View all</Link>}>
          <DataTable<Rec>
            bare
            empty="Nothing awaiting inspection"
            columns={[
              { key: "inspectionNo", header: "Inspection", render: (r) => <Link className="font-medium text-brand-700 hover:underline dark:text-brand-400" href={`/manufacturing/qc?open=${r.id}`}>{r.inspectionNo}</Link> },
              { key: "batch", header: "Lot", render: (r) => <span className="font-mono text-xs">{r.batch?.batchNo}</span> },
              { key: "type", header: "Type", render: (r) => <StatusBadge value={r.type} /> },
              { key: "inspectionDate", header: "Date", render: (r) => fmtDate(r.inspectionDate) },
            ]}
            rows={qc}
          />
        </Card>
      </div>
    </div>
  );
}

function Tile({ label, value, icon, href, tone }: { label: string; value: ReactNode; icon: ReactNode; href?: string; tone?: "warning" }) {
  const body = (
    <div className={`card h-full p-3 transition ${href ? "hover:border-brand-300 hover:shadow-sm" : ""}`}>
      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
        <span className={tone === "warning" ? "text-amber-500" : "text-brand-500"}>{icon}</span>
        <span className="truncate text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-1 text-xl font-bold ${tone === "warning" ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
