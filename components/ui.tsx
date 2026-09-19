"use client";

import clsx from "clsx";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import type { Issue } from "@/lib/api";

// ───────────────────────── Buttons ─────────────────────────

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-9 px-4 text-sm" };
  const variants: Record<Variant, string> = {
    primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
    secondary:
      "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-ink-700 dark:bg-ink-800 dark:text-slate-200 dark:hover:bg-ink-700",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-800",
  };
  return (
    <button className={clsx(base, sizes[size], variants[variant], className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// ───────────────────────── Form fields ─────────────────────────

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      {label && (
        <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx("field", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx("field pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx("field min-h-[72px]", className)} {...props} />;
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={clsx("flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300", className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-ink-700 dark:bg-ink-800" {...props} />
      {label}
    </label>
  );
}

// ───────────────────────── Layout ─────────────────────────

export function Card({
  title,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={clsx("card", className)}>
      {(title || actions) && (
        <header className="card-header">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(padded && "p-4")}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, backHref, backLabel = "Back" }: { title: string; subtitle?: string; actions?: ReactNode; backHref?: string; backLabel?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-ink-700 dark:bg-ink-800 dark:text-slate-200 dark:hover:bg-ink-700"
          >
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-center justify-center py-10 text-slate-400", className)}>
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

/** Coloured pill used for statuses in tables (Completed / Pending / Low Stock …). */
export function Pill({ tone = "neutral", children, className }: { tone?: "neutral" | "success" | "warning" | "danger" | "info" | "violet"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 dark:bg-ink-700 dark:text-slate-300",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    info: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    violet: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  };
  return <span className={clsx("inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

// ───────────────────────── Alerts ─────────────────────────

export function Alert({
  kind = "error",
  title,
  items,
  children,
  onClose,
}: {
  kind?: "error" | "warning" | "success" | "info";
  title?: string;
  items?: Issue[];
  children?: ReactNode;
  onClose?: () => void;
}) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
    warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  };
  const Icon = kind === "error" ? XCircle : kind === "warning" ? AlertTriangle : kind === "info" ? Info : CheckCircle2;
  if (!title && !items?.length && !children) return null;
  return (
    <div className={clsx("mb-4 rounded-lg border px-4 py-3 text-sm", styles[kind])}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          {title && <p className="font-medium">{title}</p>}
          {items && items.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {items.map((i, idx) => (
                <li key={idx}>
                  {i.field && <span className="font-mono text-xs opacity-70">{i.field}: </span>}
                  {i.message}
                </li>
              ))}
            </ul>
          )}
          {children}
        </div>
        {onClose && (
          <button onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Modal ─────────────────────────

export function Modal({
  open,
  title,
  onClose,
  children,
  width = "max-w-2xl",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px] sm:p-8" onClick={onClose}>
      <div className={clsx("card w-full shadow-xl", width)} onClick={(e) => e.stopPropagation()}>
        <header className="card-header px-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-ink-700 dark:hover:text-slate-200" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
