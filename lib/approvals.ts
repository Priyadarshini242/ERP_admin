/** Shared types/consts for the 3-level approval chain (mirrors backend/src/services/approvals.ts). */
export type ApprovalDocType = "SO" | "INV" | "CN" | "PO" | "BILL" | "DN" | "SR" | "PR" | "ADJ" | "RPT" | "WO" | "MI" | "FGR" | "QCI";
export type ApprovalStatus = "NONE" | "PENDING_L1" | "PENDING_L2" | "PENDING_L3" | "APPROVED" | "REJECTED";

export const LEVELS = [
  { level: 1, label: "Checked" },
  { level: 2, label: "Reviewed" },
  { level: 3, label: "Authorised" },
] as const;

export const DOC_TYPES: Record<ApprovalDocType, { label: string; endpoint: string; listHref: string; finalVerb: "post" | "confirm" }> = {
  SO: { label: "Sales order", endpoint: "/sales/orders", listHref: "/sales/orders", finalVerb: "confirm" },
  INV: { label: "Sales invoice", endpoint: "/sales/invoices", listHref: "/sales/register", finalVerb: "post" },
  CN: { label: "Credit note", endpoint: "/sales/credit-notes", listHref: "/sales/credit-notes", finalVerb: "post" },
  PO: { label: "Purchase order", endpoint: "/purchase/orders", listHref: "/purchase/orders", finalVerb: "confirm" },
  BILL: { label: "Purchase bill", endpoint: "/purchase/invoices", listHref: "/purchase/register", finalVerb: "post" },
  DN: { label: "Debit note", endpoint: "/purchase/debit-notes", listHref: "/purchase/debit-notes", finalVerb: "post" },
  SR: { label: "Sales return", endpoint: "/returns/sales", listHref: "/returns/sales", finalVerb: "post" },
  PR: { label: "Purchase return", endpoint: "/returns/purchase", listHref: "/returns/purchase", finalVerb: "post" },
  ADJ: { label: "Stock adjustment", endpoint: "/inventory/adjustments", listHref: "/inventory/stock/adjustment", finalVerb: "post" },
  RPT: { label: "Report", endpoint: "/register/report-runs", listHref: "/register/reports?tab=runs", finalVerb: "post" },
  WO: { label: "Work order", endpoint: "/manufacturing/orders", listHref: "/manufacturing/orders", finalVerb: "confirm" },
  MI: { label: "Material issue", endpoint: "/manufacturing/issues", listHref: "/manufacturing/issues", finalVerb: "post" },
  FGR: { label: "Production receipt", endpoint: "/manufacturing/receipts", listHref: "/manufacturing/receipts", finalVerb: "post" },
  QCI: { label: "QC inspection", endpoint: "/manufacturing/qc", listHref: "/manufacturing/qc", finalVerb: "post" },
};

export interface Can {
  submit: boolean;
  approve: boolean;
  reject: boolean;
  withdraw: boolean;
  finalize: boolean;
  chain: boolean;
  reason?: string;
}

export interface ApprovalHistoryRow {
  id: number;
  round: number;
  level: number;
  action: "SUBMIT" | "APPROVE" | "REJECT" | "WITHDRAW" | "CANCEL" | "POST";
  fromStatus: string;
  toStatus: string;
  comment: string | null;
  createdAt: string;
  actedBy: { id: number; fullName: string; role: string };
}

export interface ApprovalState {
  docType: ApprovalDocType;
  docId: number;
  docNo: string;
  docLabel: string;
  status: string;
  approvalStatus: ApprovalStatus;
  level: 0 | 1 | 2 | 3;
  round: number;
  submittedAt: string | null;
  listHref: string;
  endpoint: string;
  finalVerb: "post" | "confirm";
  sodRelaxed: boolean;
  levels: { level: number; label: string }[];
  can: Can;
  history: ApprovalHistoryRow[];
}

export interface QueueRow {
  docType: ApprovalDocType;
  docId: number;
  docNo: string;
  docLabel: string;
  date: string;
  party: string | null;
  grandTotal: string | null;
  approvalStatus: ApprovalStatus;
  level: number;
  submittedAt: string | null;
  createdBy: { id: number; fullName: string } | null;
  listHref: string;
  endpoint: string;
  can: { approve: boolean; reject: boolean; withdraw: boolean };
}

export const levelOf = (s: string | null | undefined): 0 | 1 | 2 | 3 => (s === "PENDING_L1" ? 1 : s === "PENDING_L2" ? 2 : s === "PENDING_L3" ? 3 : 0);
export const isPending = (s: string | null | undefined) => Boolean(s && s.startsWith("PENDING_"));

export function approvalLabel(s: string | null | undefined): string {
  switch (s) {
    case "NONE":
    case null:
    case undefined:
      return "Not submitted";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return `Awaiting L${levelOf(s)}`;
  }
}

/** Broadcast so badges (sidebar / topbar) refresh after any approval action. */
export function notifyApprovalsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("approvals:changed"));
}
