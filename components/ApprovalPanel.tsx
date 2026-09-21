"use client";

import clsx from "clsx";
import { Check, ChevronDown, CircleDashed, Send, ShieldCheck, Undo2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { approvalLabel, DOC_TYPES, LEVELS, notifyApprovalsChanged, type ApprovalDocType, type ApprovalState } from "@/lib/approvals";
import { demoFor } from "@/lib/demo";
import { fmtDateTime } from "@/lib/format";

import { Alert, Button, Field, Modal, Textarea } from "./ui";

interface Props {
  docType: ApprovalDocType;
  docId: number;
  /** the document's own status (DRAFT / POSTED / ...) */
  docStatus: string;
  onChange?: (s: ApprovalState) => void;
  compact?: boolean;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");

/** Three-level approval stepper + actions + history for one document. Buttons come purely from server `can`. */
export function ApprovalPanel({ docType, docId, docStatus, onChange, compact }: Props) {
  const [state, setState] = useState<ApprovalState | null>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [prompt, setPrompt] = useState<{ verb: "reject" | "withdraw"; required: boolean } | null>(null);
  const [comment, setComment] = useState("");

  const path = `/approvals/${docType}/${docId}`;

  useEffect(() => {
    let alive = true;
    api<ApprovalState>(path)
      .then((s) => {
        if (!alive) return;
        setState(s);
        setDemo(false);
      })
      .catch((e) => {
        if (!alive) return;
        if (!(e instanceof ApiError)) {
          const fb = demoFor(path) as ApprovalState | null;
          if (fb) {
            setState(fb);
            setDemo(true);
            return;
          }
        }
        setError(e instanceof ApiError ? e : new ApiError(500, "Approval status unavailable"));
      });
    return () => {
      alive = false;
    };
  }, [path]);

  async function act(verb: "submit" | "approve" | "reject" | "withdraw", body: Record<string, unknown> = {}) {
    setBusy(verb + (body.chain ? ":chain" : ""));
    setError(null);
    try {
      const s = await api<ApprovalState>(`${path}/${verb}`, { method: "POST", body });
      setState(s);
      onChange?.(s);
      notifyApprovalsChanged();
    } catch (e) {
      if (demo && !(e instanceof ApiError)) {
        // offline demo: simulate the transition locally so the design can be exercised
        setState((prev) => prev && simulate(prev, verb, body));
      } else setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setBusy(null);
      setPrompt(null);
      setComment("");
    }
  }

  if (error && !state) return <Alert kind="error" title={error.message} />;
  if (!state) return <p className="text-xs text-slate-400">Loading approval status…</p>;

  const finalLabel = (DOC_TYPES[docType]?.finalVerb ?? state.finalVerb) === "confirm" ? "Confirmed" : "Posted";
  const current = state.level; // 1..3 while pending
  const posted = docStatus !== "DRAFT";
  const cancelled = docStatus === "CANCELLED";
  const rejected = state.approvalStatus === "REJECTED";
  const approved = state.approvalStatus === "APPROVED" || posted;
  const lastReject = [...state.history].reverse().find((h) => h.action === "REJECT");
  const rounds = state.history.length ? Math.max(...state.history.map((h) => h.round)) : 0;
  const approverOf = (level: number) => [...state.history].reverse().find((h) => h.action === "APPROVE" && h.level === level && h.round === rounds);

  const steps = [
    { key: "draft", label: "Draft", done: true, who: state.history.find((h) => h.action === "SUBMIT" && h.round === rounds) },
    ...LEVELS.map((l) => ({ key: `L${l.level}`, label: `L${l.level} ${l.label}`, done: approved || current > l.level, who: approverOf(l.level), active: !approved && current === l.level, failed: rejected && lastReject?.level === l.level })),
    { key: "final", label: finalLabel, done: posted && !cancelled, who: state.history.find((h) => h.action === "POST") },
  ] as { key: string; label: string; done: boolean; who?: ApprovalState["history"][number]; active?: boolean; failed?: boolean }[];

  return (
    <div className={clsx("rounded-xl border border-slate-200 dark:border-ink-700", compact ? "p-3" : "p-4")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-300" /> Three-level approval
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">· {cancelled ? "cancelled" : posted ? finalLabel.toLowerCase() : approvalLabel(state.approvalStatus).toLowerCase()}{rounds > 1 ? ` · round ${rounds}` : ""}</span>
        </p>
        {state.sodRelaxed && !posted && <span className="text-[11px] text-amber-700 dark:text-amber-300">Single-user mode: you can act at every level</span>}
      </div>

      {/* stepper */}
      <ol className={clsx("grid gap-2", "grid-cols-5")}>
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            {i > 0 && <span aria-hidden className={clsx("absolute right-1/2 top-3.5 h-0.5 w-full", steps[i - 1].done && (s.done || s.active) ? "bg-emerald-400 dark:bg-emerald-500" : "bg-slate-200 dark:bg-ink-700")} style={{ transform: "translateX(-50%)" }} />}
            <span
              className={clsx(
                "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold",
                s.failed
                  ? "border-red-500 bg-red-500 text-white"
                  : s.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : s.active
                      ? "border-brand-600 bg-white text-brand-700 dark:bg-ink-850 dark:text-brand-300"
                      : "border-slate-300 bg-white text-slate-400 dark:border-ink-700 dark:bg-ink-850",
                cancelled && "opacity-40",
              )}
              title={s.who ? `${s.who.actedBy.fullName} · ${fmtDateTime(s.who.createdAt)}` : undefined}
            >
              {s.failed ? <X className="h-3.5 w-3.5" /> : s.done ? (s.who && s.key !== "draft" && s.key !== "final" ? initials(s.who.actedBy.fullName) : <Check className="h-3.5 w-3.5" />) : s.active ? <CircleDashed className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={clsx("mt-1.5 text-[11px] leading-tight", s.active ? "font-semibold text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400")}>{s.label}</span>
            {s.who && s.key !== "draft" && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{s.who.actedBy.fullName.split(" ")[0]}</span>
            )}
          </li>
        ))}
      </ol>

      {rejected && lastReject && (
        <div className="mt-3">
          <Alert kind="error" title={`Rejected at L${lastReject.level} by ${lastReject.actedBy.fullName}`}>
            {lastReject.comment}
          </Alert>
        </div>
      )}
      {error && <div className="mt-3"><Alert kind="error" title={error.message} items={error.errors} onClose={() => setError(null)} /></div>}

      {/* actions */}
      {!cancelled && !posted && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {state.can.submit && (
            <Button size="sm" onClick={() => act("submit")} loading={busy === "submit"}>
              <Send className="h-3.5 w-3.5" /> Submit for approval
            </Button>
          )}
          {state.can.approve && (
            <Button size="sm" onClick={() => act("approve")} loading={busy === "approve"}>
              <Check className="h-3.5 w-3.5" /> Approve · L{current} {LEVELS[current - 1]?.label}
            </Button>
          )}
          {state.can.chain && (
            <Button size="sm" variant="secondary" onClick={() => act("approve", { chain: true })} loading={busy === "approve:chain"}>
              Approve all remaining
            </Button>
          )}
          {state.can.reject && (
            <Button size="sm" variant="danger" onClick={() => setPrompt({ verb: "reject", required: true })}>
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          )}
          {state.can.withdraw && (
            <Button size="sm" variant="ghost" onClick={() => (state.approvalStatus === "APPROVED" ? setPrompt({ verb: "withdraw", required: true }) : act("withdraw"))} loading={busy === "withdraw"}>
              <Undo2 className="h-3.5 w-3.5" /> Withdraw
            </Button>
          )}
          {!state.can.submit && !state.can.approve && !state.can.reject && !state.can.withdraw && state.can.reason && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{state.can.reason}</span>
          )}
          {state.approvalStatus === "APPROVED" && <span className="text-xs text-emerald-700 dark:text-emerald-400">Approved — ready to {state.finalVerb}.</span>}
        </div>
      )}

      {/* history */}
      {state.history.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowHistory((h) => !h)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <ChevronDown className={clsx("h-3.5 w-3.5 transition", showHistory && "rotate-180")} /> History ({state.history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1 border-l border-slate-200 pl-3 text-xs dark:border-ink-700">
              {state.history.map((h) => (
                <li key={h.id} className="text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{h.action === "APPROVE" ? `Approved L${h.level}` : h.action === "REJECT" ? `Rejected at L${h.level}` : h.action.charAt(0) + h.action.slice(1).toLowerCase()}</span>
                  {" · "}{h.actedBy.fullName} <span className="text-slate-400">({h.actedBy.role.toLowerCase()})</span> · {fmtDateTime(h.createdAt)}
                  {h.round > 1 && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] dark:bg-ink-700">round {h.round}</span>}
                  {h.comment && <span className="block text-slate-500 dark:text-slate-400">“{h.comment}”</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal open={Boolean(prompt)} title={prompt?.verb === "reject" ? "Reject document" : "Withdraw approval"} onClose={() => setPrompt(null)} width="max-w-md">
        <Field label={prompt?.verb === "reject" ? "Reason for rejection" : "Reason"} required={prompt?.required} hint="Shown to the submitter and kept in the audit trail">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} autoFocus />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPrompt(null)}>Cancel</Button>
          <Button variant={prompt?.verb === "reject" ? "danger" : "primary"} disabled={Boolean(prompt?.required) && comment.trim().length < 3} onClick={() => prompt && act(prompt.verb, { comment })} loading={busy === prompt?.verb}>
            {prompt?.verb === "reject" ? "Reject" : "Withdraw"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** Offline demo only: apply a transition locally. */
function simulate(s: ApprovalState, verb: string, body: Record<string, unknown>): ApprovalState {
  const me = { id: 0, fullName: "Nivetha", role: "ADMIN" };
  const now = new Date().toISOString();
  const rounds = s.history.length ? Math.max(...s.history.map((h) => h.round)) : 0;
  const push = (rows: ApprovalState["history"], row: Partial<ApprovalState["history"][number]>) => [...rows, { id: rows.length + 1, round: rounds || 1, level: 0, action: "SUBMIT", fromStatus: s.approvalStatus, toStatus: s.approvalStatus, comment: null, createdAt: now, actedBy: me, ...row } as ApprovalState["history"][number]];
  const canAll = { submit: false, approve: true, reject: true, withdraw: true, finalize: false, chain: true };
  if (verb === "submit") return { ...s, approvalStatus: "PENDING_L1", level: 1, submittedAt: now, can: canAll, history: push(s.history, { round: rounds + 1, action: "SUBMIT", toStatus: "PENDING_L1" }) };
  if (verb === "approve") {
    let level = s.level;
    let history = s.history;
    let status = s.approvalStatus;
    const end = body.chain ? 3 : level;
    for (let l = level; l <= end; l++) {
      const next = l === 3 ? "APPROVED" : (`PENDING_L${l + 1}` as ApprovalState["approvalStatus"]);
      history = push(history, { level: l, action: "APPROVE", fromStatus: status, toStatus: next });
      status = next;
    }
    level = status === "APPROVED" ? 0 : ((Number(status.slice(-1)) as 1 | 2 | 3));
    return { ...s, approvalStatus: status, level, history, can: status === "APPROVED" ? { ...canAll, approve: false, reject: false, chain: false, finalize: true } : canAll };
  }
  if (verb === "reject") return { ...s, approvalStatus: "REJECTED", level: 0, can: { submit: true, approve: false, reject: false, withdraw: false, finalize: false, chain: false }, history: push(s.history, { level: s.level, action: "REJECT", toStatus: "REJECTED", comment: String(body.comment ?? "") }) };
  return { ...s, approvalStatus: "NONE", level: 0, submittedAt: null, can: { submit: true, approve: false, reject: false, withdraw: false, finalize: false, chain: false }, history: push(s.history, { action: "WITHDRAW", toStatus: "NONE", comment: (body.comment as string) ?? null }) };
}
