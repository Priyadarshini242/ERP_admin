"use client";

import { DataTable } from "@/components/DataTable";
import { Info, RecordList, type Rec } from "@/components/RecordList";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate, money, qty } from "@/lib/format";

export default function BomListPage() {
  return (
    <RecordList
      title="Bill of Materials"
      subtitle="Recipes for manufactured products: components, by-products, expected yield and overhead absorption."
      endpoint="/manufacturing/boms"
      numberField="bomNo"
      newHref="/manufacturing/boms/new"
      newLabel="New BOM"
      statusOptions={["DRAFT", "ACTIVE", "SUPERSEDED"]}
      columns={[
        { key: "bomNo", header: "BOM No.", render: (r) => <span className="font-medium text-brand-700 dark:text-brand-400">{r.bomNo} <span className="text-slate-400">v{r.version}</span></span> },
        { key: "product", header: "Product", render: (r) => <span>{r.product?.name}<span className="ml-1 text-xs text-slate-400">{r.product?.sku}</span></span> },
        { key: "name", header: "Name" },
        { key: "batchSize", header: "Batch size", align: "right", render: (r) => `${qty(r.batchSize)} ${r.unit}` },
        { key: "yield", header: "Yield %", align: "right", render: (r) => `${Number(r.expectedYieldPct).toFixed(1)} / ${Number(r.yieldLowerLimitPct).toFixed(1)}` },
        { key: "overheadPct", header: "Overhead %", align: "right", render: (r) => Number(r.overheadPct).toFixed(2) },
        { key: "lines", header: "Lines", align: "right", render: (r) => r.items?.length ?? r._count?.items ?? "—" },
        { key: "status", header: "Status", render: (r) => <span className="inline-flex gap-1"><StatusBadge value={r.status} />{r.isDefault && <StatusBadge value="DEFAULT" label="Default" />}</span> },
      ]}
      actions={[
        { label: "Activate", verb: "activate", variant: "primary", when: (d) => d.status === "DRAFT", confirm: "Activate this BOM? It becomes the default recipe for the product and any previous active version is superseded." },
        { label: "Supersede", verb: "supersede", variant: "danger", when: (d) => d.status === "ACTIVE", confirm: "Supersede this BOM? New work orders will no longer be able to use it." },
      ]}
      renderDetail={(d: Rec) => <BomDetail d={d} />}
    />
  );
}

function BomDetail({ d }: { d: Rec }) {
  const items: Rec[] = d.items ?? [];
  const cost = items.filter((i) => i.role === "COMPONENT").reduce((s, i) => s + Number(i.quantity) * Number(i.product?.purchasePrice ?? 0), 0);
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Info k="Product" v={`${d.product?.name ?? ""} (${d.product?.sku ?? ""})`} />
        <Info k="Version" v={`v${d.version} · ${d.name}`} />
        <Info k="Batch size" v={`${qty(d.batchSize)} ${d.unit}`} />
        <Info k="Status" v={<StatusBadge value={d.status} />} />
        <Info k="Expected yield" v={`${Number(d.expectedYieldPct).toFixed(1)}% (floor ${Number(d.yieldLowerLimitPct).toFixed(1)}%)`} />
        <Info k="Overhead absorbed" v={`${Number(d.overheadPct).toFixed(2)}% of material cost`} />
        <Info k="Shelf life" v={d.shelfLifeDays != null ? `${d.shelfLifeDays} days` : "product default"} />
        <Info k="Created" v={`${fmtDate(d.createdAt)}${d.createdBy ? ` · ${d.createdBy.fullName}` : ""}`} />
      </div>
      <DataTable<Rec>
        bare
        columns={[
          { key: "seq", header: "#", render: (i) => i.sequence },
          { key: "product", header: "Material", render: (i) => <span>{i.product?.name}<span className="ml-1 text-xs text-slate-400">{i.product?.sku}</span></span> },
          { key: "role", header: "Role", render: (i) => <StatusBadge value={i.role} /> },
          { key: "quantity", header: "Qty / batch", align: "right", render: (i) => `${qty(i.quantity)} ${i.unit}` },
          { key: "scrapPct", header: "Scrap %", align: "right", render: (i) => Number(i.scrapPct ?? 0).toFixed(2) },
          { key: "cost", header: "Est. cost", align: "right", render: (i) => (i.role === "COMPONENT" ? money(Number(i.quantity) * Number(i.product?.purchasePrice ?? 0)) : i.byProductValue != null ? `(${money(i.byProductValue)})` : "—") },
          { key: "note", header: "Note", render: (i) => i.note ?? "" },
        ]}
        rows={items}
        footer={<tr><td colSpan={7} className="td text-right text-xs text-slate-500">Estimated material cost per batch: <span className="ml-1 font-semibold text-slate-800 dark:text-slate-100">{money(cost)}</span></td></tr>}
      />
      {d.notes && <p className="text-slate-500">{d.notes}</p>}
    </div>
  );
}
