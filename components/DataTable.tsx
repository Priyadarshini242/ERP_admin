"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Spinner } from "./ui";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  empty?: ReactNode;
  rowKey?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
  pagination?: { page: number; pages: number; total: number; pageSize: number; onPage: (p: number) => void };
  /** render without the outer card (when already inside one) */
  bare?: boolean;
}

export function DataTable<T extends object>({ columns, rows, loading, error, empty, rowKey, onRowClick, footer, pagination, bare }: Props<T>) {
  const alignCls = (a?: string) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");
  return (
    <div className={clsx(!bare && "card overflow-hidden")}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="thead">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={clsx("th", alignCls(c.align), c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-ui">
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <Spinner />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-red-600 dark:text-red-400">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-slate-400 dark:text-slate-500">
                  {empty ?? "No records"}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey ? rowKey(row) : ((row as { id?: string | number }).id ?? i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx(onRowClick && "row-hover cursor-pointer")}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={clsx("td", alignCls(c.align), c.className)}>
                      {c.render ? c.render(row) : (((row as Record<string, unknown>)[c.key] as ReactNode) ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {footer && <tfoot className="thead text-sm font-medium text-slate-800 dark:text-slate-100">{footer}</tfoot>}
        </table>
      </div>
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-ink-700 dark:text-slate-400">
          <span>
            {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={pagination.page <= 1} onClick={() => pagination.onPage(pagination.page - 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-ink-700">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {pagination.page} / {pagination.pages}
            </span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => pagination.onPage(pagination.page + 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-ink-700">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Common filter bar used above list tables. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">{children}</div>;
}
