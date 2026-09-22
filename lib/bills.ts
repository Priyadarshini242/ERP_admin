"use client";

/** Bills saved while reviewing the UI without the API. */
export type DemoBill = Record<string, unknown>;

const KEY = "quickerp_sales_bills";

export function demoBills(): DemoBill[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function saveDemoBill(bill: DemoBill) {
  const bills = demoBills();
  localStorage.setItem(KEY, JSON.stringify([bill, ...bills]));
}

export function nextDemoBillNo() {
  const highest = demoBills().reduce((max, bill) => {
    const match = String(bill.billNo ?? "").match(/(\d+)$/);
    return Math.max(max, Number(match?.[1] ?? 0));
  }, 0);
  return `BILL-${String(Math.max(125, highest + 1)).padStart(5, "0")}`;
}
