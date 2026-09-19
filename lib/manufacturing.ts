"use client";

import { useEffect, useState } from "react";

import { api, ApiError, type Page } from "./api";
import { demoFor } from "./demo";
import type { ProductLite, WarehouseLite } from "./hooks";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Rec = Record<string, any>;

export interface BatchOption {
  batchId: number;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string | null;
  quantity: string;
  unitCost: string;
  mrp: string;
  status: string;
  qcStatus: string;
  expired?: boolean;
  daysToExpiry?: number | null;
  sellable?: boolean;
  label?: string;
}

export const PRODUCT_TYPES = ["RAW_MATERIAL", "PACKING_MATERIAL", "SEMI_FINISHED", "FINISHED_GOODS", "TRADED"] as const;
export const QC_TYPES = ["INCOMING", "FINISHED", "RETEST", "MANUAL"] as const;
export const QC_RESULTS = ["PASS", "FAIL", "CONDITIONAL"] as const;
export const QC_DECISIONS = ["RELEASE", "REJECT", "RETEST", "HOLD"] as const;

export const productLabel = (p: { sku?: string; name?: string } | null | undefined) => (p ? `${p.sku ? `${p.sku} · ` : ""}${p.name ?? ""}` : "—");

/** Products + warehouses for manufacturing forms (no party needed). */
export function useMfgMasters() {
  const [products, setProducts] = useState<(ProductLite & { productType?: string; qcRequired?: boolean; stdBatchSize?: string | null })[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLite[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pr, w] = await Promise.all([api<Page<ProductLite>>("/masters/products", { query: { active: true, pageSize: 500 } }), api<WarehouseLite[]>("/masters/warehouses")]);
        if (!alive) return;
        setProducts(pr.items);
        setWarehouses(w.filter((x) => x.isActive));
      } catch (e) {
        if (!alive || e instanceof ApiError) return;
        const dpr = demoFor("/masters/products") as { items: ProductLite[] } | null;
        const dw = demoFor("/masters/warehouses") as { items: WarehouseLite[] } | null;
        setProducts(dpr?.items ?? []);
        setWarehouses(dw?.items ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return { products, warehouses, loading };
}

/** Batch lookup for one product/warehouse (empty list when offline). */
export async function lookupBatches(productId: number, warehouseId: number | null | undefined, date?: string, includeEmpty = false): Promise<BatchOption[]> {
  try {
    return await api<BatchOption[]>("/inventory/batches/lookup", { query: { productId, warehouseId: warehouseId ?? undefined, date, includeEmpty } });
  } catch {
    return [];
  }
}

export const batchLabel = (b: BatchOption | Rec) => b.label ?? `${b.batchNo}${b.expiryDate ? ` · exp ${String(b.expiryDate).slice(0, 10)}` : ""}${b.quantity != null ? ` · ${Number(b.quantity).toFixed(3)}` : ""}${b.qcStatus && b.qcStatus !== "RELEASED" ? ` · ${b.qcStatus}` : ""}`;
