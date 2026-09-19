"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CANCEL_ACTION, Info, POST_ACTION, RecordList, type Rec } from "@/components/RecordList";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { fmtDate, qty } from "@/lib/format";
import { QC_DECISIONS, QC_RESULTS } from "@/lib/manufacturing";

interface Test {
  parameter: string;
  specification: string;
  observed: string;
  pass: boolean | null;
}

export default function QcListPage() {
  return (
    <RecordList
      title="QC Inspections"
      subtitle="Every quarantined lot waits here. Record the result and decision, send it through approval, then post to release, reject, retest or hold the batch."
      endpoint="/manufacturing/qc"
      numberField="inspectionNo"
      docType="QCI"
      newHref="/manufacturing/qc/new"
      newLabel="New Inspection"
      statusOptions={["DRAFT", "POSTED", "CANCELLED"]}
      columns={[
        { key: "inspectionNo", header: "Inspection", render: (r) => <span className="font-medium text-brand-700 dark:text-brand-400">{r.inspectionNo}</span> },
        { key: "inspectionDate", header: "Date", render: (r) => fmtDate(r.inspectionDate) },
        { key: "type", header: "Type", render: (r) => <StatusBadge value={r.type} /> },
        { key: "product", header: "Product", render: (r) => <span>{r.product?.name}<span className="ml-1 text-xs text-slate-400">{r.product?.sku}</span></span> },
        { key: "batch", header: "Lot", render: (r) => <span className="font-mono text-xs">{r.batch?.batchNo}</span> },
        { key: "qcStatus", header: "Lot QC", render: (r) => <StatusBadge value={r.batch?.qcStatus} /> },
        { key: "result", header: "Result", render: (r) => <StatusBadge value={r.result} /> },
        { key: "decision", header: "Decision", render: (r) => <StatusBadge value={r.decision} /> },
        { key: "approvalStatus", header: "Approval", render: (r) => <StatusBadge value={r.approvalStatus} /> },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
      ]}
      actions={[{ ...POST_ACTION, label: "Post decision", confirm: "Apply this QC decision to the batch? Release makes it sellable; reject blocks it permanently." }, CANCEL_ACTION]}
      renderDetail={(d: Rec, h) => <QcDetail d={d} onSaved={(nd) => { h.setSelected(nd); h.reload(); }} />}
    />
  );
}

function QcDetail({ d, onSaved }: { d: Rec; onSaved: (d: Rec) => void }) {
  const editable = d.status === "DRAFT" && (d.approvalStatus === "NONE" || d.approvalStatus === "REJECTED");
  const [f, setF] = useState({ sampleQty: "", arNo: "", result: "", decision: "", newRetestDate: "", newExpiryDate: "", rejectionReason: "", remarks: "" });
  const [tests, setTests] = useState<Test[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    setF({ sampleQty: d.sampleQty ?? "", arNo: d.arNo ?? "", result: d.result ?? "", decision: d.decision ?? "", newRetestDate: d.newRetestDate ? String(d.newRetestDate).slice(0, 10) : "", newExpiryDate: d.newExpiryDate ? String(d.newExpiryDate).slice(0, 10) : "", rejectionReason: d.rejectionReason ?? "", remarks: d.remarks ?? "" });
    try {
      const t = typeof d.tests === "string" ? JSON.parse(d.tests) : d.tests;
      setTests(Array.isArray(t) ? t.map((x: Test) => ({ parameter: x.parameter ?? "", specification: x.specification ?? "", observed: x.observed ?? "", pass: x.pass ?? null })) : []);
    } catch {
      setTests([]);
    }
  }, [d.id, d.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const fieldError = (name: string) => error?.errors.find((e) => e.field === name)?.message;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = {
        sampleQty: f.sampleQty === "" ? null : f.sampleQty,
        arNo: f.arNo || null,
        tests: tests.filter((t) => t.parameter.trim()).map((t) => ({ parameter: t.parameter, specification: t.specification || null, observed: t.observed || null, pass: t.pass })),
        result: f.result || null,
        decision: f.decision || null,
        newRetestDate: f.newRetestDate || null,
        newExpiryDate: f.newExpiryDate || null,
        rejectionReason: f.rejectionReason || null,
        remarks: f.remarks || null,
      };
      onSaved(await api<Rec>(`/manufacturing/qc/${d.id}`, { method: "PUT", body }));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, "API not reachable"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Info k="Product" v={`${d.product?.name ?? ""} (${d.product?.sku ?? ""})`} />
        <Info k="Lot" v={<span className="font-mono">{d.batch?.batchNo}</span>} />
        <Info k="Lot status" v={<span className="inline-flex gap-1"><StatusBadge value={d.batch?.qcStatus} />{d.batch?.status !== "ACTIVE" && <StatusBadge value={d.batch?.status} />}</span>} />
        <Info k="Inspection" v={<span className="inline-flex gap-1"><StatusBadge value={d.type} /><StatusBadge value={d.status} /><StatusBadge value={d.approvalStatus} /></span>} />
        <Info k="Mfg → expiry" v={`${d.batch?.mfgDate ? fmtDate(d.batch.mfgDate) : "—"} → ${d.batch?.expiryDate ? fmtDate(d.batch.expiryDate) : "—"}`} />
        <Info k="Retest due" v={d.batch?.retestDate ? fmtDate(d.batch.retestDate) : "—"} />
        <Info k="Source" v={d.sourceRefNo ?? d.batch?.sourceRefNo ?? "—"} />
        <Info k="Trace" v={<Link className="text-brand-700 hover:underline dark:text-brand-400" href={`/manufacturing/genealogy?batchId=${d.batchId}`}>Genealogy</Link>} />
      </div>

      {error && <Alert kind="error" title={error.message} items={error.errors} onClose={() => setError(null)} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Sample qty" error={fieldError("sampleQty")}><Input type="number" step="0.001" min="0" disabled={!editable} value={f.sampleQty} onChange={(e) => set("sampleQty", e.target.value)} /></Field>
        <Field label="A.R. No." hint="Analytical report reference"><Input disabled={!editable} value={f.arNo} onChange={(e) => set("arNo", e.target.value)} /></Field>
        <Field label="Result" error={fieldError("result")}>
          <Select disabled={!editable} value={f.result} onChange={(e) => set("result", e.target.value)}>
            <option value="">—</option>
            {QC_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Decision" required error={fieldError("decision")}>
          <Select disabled={!editable} value={f.decision} onChange={(e) => set("decision", e.target.value)}>
            <option value="">— required to submit —</option>
            {QC_DECISIONS.map((r) => <option key={r} value={r}>{r === "RELEASE" ? "Release (sellable)" : r === "REJECT" ? "Reject (block)" : r === "RETEST" ? "Retest (stay in quarantine)" : "Hold"}</option>)}
          </Select>
        </Field>
        {f.decision === "RETEST" && <Field label="New retest date"><Input type="date" disabled={!editable} value={f.newRetestDate} onChange={(e) => set("newRetestDate", e.target.value)} /></Field>}
        {(f.decision === "RELEASE" || f.decision === "RETEST") && <Field label="New expiry (optional)" hint="Shorten shelf life on conditional release"><Input type="date" disabled={!editable} value={f.newExpiryDate} onChange={(e) => set("newExpiryDate", e.target.value)} /></Field>}
        {f.decision === "REJECT" && <Field label="Rejection reason" required error={fieldError("rejectionReason")} className="sm:col-span-2"><Input disabled={!editable} value={f.rejectionReason} onChange={(e) => set("rejectionReason", e.target.value)} /></Field>}
        <Field label="Remarks" className="sm:col-span-2 lg:col-span-4"><Textarea rows={2} disabled={!editable} value={f.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Test parameters</p>
          {editable && <Button size="sm" variant="secondary" onClick={() => setTests((t) => [...t, { parameter: "", specification: "", observed: "", pass: null }])}>Add test</Button>}
        </div>
        <table className="min-w-full text-sm">
          <thead className="thead"><tr><th className="th">Parameter</th><th className="th">Specification</th><th className="th">Observed</th><th className="th w-28">Pass</th></tr></thead>
          <tbody className="divide-y-ui">
            {tests.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-slate-400">No test parameters recorded</td></tr>}
            {tests.map((t, i) => (
              <tr key={i}>
                <td className="td"><Input disabled={!editable} value={t.parameter} onChange={(e) => setTests((ts) => ts.map((x, j) => (j === i ? { ...x, parameter: e.target.value } : x)))} /></td>
                <td className="td"><Input disabled={!editable} value={t.specification} onChange={(e) => setTests((ts) => ts.map((x, j) => (j === i ? { ...x, specification: e.target.value } : x)))} /></td>
                <td className="td"><Input disabled={!editable} value={t.observed} onChange={(e) => setTests((ts) => ts.map((x, j) => (j === i ? { ...x, observed: e.target.value } : x)))} /></td>
                <td className="td">
                  <Select disabled={!editable} value={t.pass === null ? "" : t.pass ? "1" : "0"} onChange={(e) => setTests((ts) => ts.map((x, j) => (j === i ? { ...x, pass: e.target.value === "" ? null : e.target.value === "1" } : x)))}>
                    <option value="">—</option>
                    <option value="1">Pass</option>
                    <option value="0">Fail</option>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="flex justify-end">
          <Button loading={busy} onClick={save}>Save findings</Button>
        </div>
      )}
      {d.sampleQty != null && !editable && <p className="text-xs text-slate-400">Sample {qty(d.sampleQty)} · recorded {fmtDate(d.updatedAt)}</p>}
    </div>
  );
}
