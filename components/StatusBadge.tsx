import { titleCase } from "@/lib/format";

import { Pill } from "./ui";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "violet";

const TONES: Record<string, Tone> = {
  DRAFT: "neutral",
  CONFIRMED: "info",
  PARTIAL: "warning",
  COMPLETED: "success",
  POSTED: "success",
  CANCELLED: "danger",
  UNPAID: "danger",
  PAID: "success",
  PENDING: "warning",
  B2B: "violet",
  B2C: "info",
  IN: "success",
  OUT: "danger",
  DR: "info",
  CR: "danger",
  LOW: "warning",
  // approvals
  NONE: "neutral",
  PENDING_L1: "warning",
  PENDING_L2: "warning",
  PENDING_L3: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  // batches
  ACTIVE: "success",
  BLOCKED: "danger",
  EXPIRED: "danger",
  NEAR_EXPIRY: "warning",
  OK: "success",
  // QC / manufacturing
  QUARANTINE: "warning",
  RELEASED: "success",
  RETEST: "info",
  SUPERSEDED: "neutral",
  IN_PROGRESS: "info",
  ISSUE: "danger",
  RETURN: "success",
  COMPONENT: "neutral",
  BY_PRODUCT: "violet",
  OUTPUT: "success",
  PASS: "success",
  FAIL: "danger",
  CONDITIONAL: "warning",
  RELEASE: "success",
  REJECT: "danger",
  HOLD: "warning",
  TRADED: "neutral",
  RAW_MATERIAL: "info",
  PACKING_MATERIAL: "info",
  SEMI_FINISHED: "violet",
  FINISHED_GOODS: "success",
};

const LABELS: Record<string, string> = {
  POSTED: "Completed",
  DRAFT: "Draft",
  LOW: "Low Stock",
  OUT: "Out of Stock",
  NONE: "Not submitted",
  PENDING_L1: "Awaiting L1",
  PENDING_L2: "Awaiting L2",
  PENDING_L3: "Awaiting L3",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  NEAR_EXPIRY: "Near expiry",
  OK: "In stock",
  QUARANTINE: "Quarantine",
  RELEASED: "QC released",
  IN_PROGRESS: "In progress",
  BY_PRODUCT: "By-product",
};

export function StatusBadge({ value, className, label }: { value: string | null | undefined; className?: string; label?: string }) {
  if (!value) return null;
  const text = label ?? (value.length <= 3 && !LABELS[value] ? value : (LABELS[value] ?? titleCase(value)));
  return (
    <Pill tone={TONES[value] ?? "neutral"} className={className}>
      {text}
    </Pill>
  );
}
