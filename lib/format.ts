const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const int = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

/** Prisma Decimals arrive as strings; accept anything numeric-ish. */
export const n = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export const money = (v: unknown) => inr.format(n(v));
/** Whole-rupee display for KPIs: ₹12,45,230 */
export const money0 = (v: unknown) => inr0.format(n(v));
export const count = (v: unknown) => int.format(n(v));
export const moneyCompact = (v: unknown) => `₹${compact.format(n(v))}`;
export const qty = (v: unknown) => num.format(n(v));
export const pct = (v: unknown) => `${n(v).toFixed(2)}%`;

export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function fmtDateTime(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** YYYY-MM-DD for <input type="date"> */
export function isoDate(v: string | Date | null | undefined = new Date()): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toISOString().slice(0, 10);
}

export const today = () => isoDate(new Date());

/** "Tue, 23 Sep 2025" */
export const fmtLongDate = (d: Date = new Date()) => d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

export function titleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
