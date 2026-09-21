"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, ApiError, type Page } from "./api";
import { demoFor } from "./demo";

/** True when the error is a network failure (API not running), not an application error. */
const isOffline = (e: unknown) => !(e instanceof ApiError);

type Query = Record<string, string | number | boolean | null | undefined>;

/** Generic paginated list fetcher. Re-fetches whenever `query` changes (shallow compare via JSON). */
export function useList<T>(path: string | null, query: Query = {}, deps: unknown[] = []) {
  const [data, setData] = useState<(Page<T> & Record<string, unknown>) | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const key = JSON.stringify(query);
  const version = useRef(0);

  const reload = useCallback(async () => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    const v = ++version.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api<Page<T> & Record<string, unknown>>(path, { query });
      if (v === version.current) {
        setData(res);
        setDemo(false);
      }
    } catch (e) {
      if (v !== version.current) return;
      const fallback = isOffline(e) ? (demoFor(path) as (Page<T> & Record<string, unknown>) | null) : null;
      if (fallback) {
        setData(fallback);
        setDemo(true);
      } else setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      if (v === version.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, ...deps]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, items: data?.items ?? [], loading, error, reload, demo };
}

/** One-shot fetch of any endpoint. */
export function useFetch<T>(path: string | null, query: Query = {}, deps: unknown[] = [], fallback?: T) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const key = JSON.stringify(query);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(path, { query }));
      setDemo(false);
    } catch (e) {
      if (isOffline(e)) {
        const demoFallback = fallback !== undefined ? fallback : (demoFor(path) as T | null);
        if (demoFallback !== null && demoFallback !== undefined) {
          setData(demoFallback);
          setDemo(true);
          return;
        }
      }
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, ...deps]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, setData, demo };
}

export interface PartyLite {
  id: number;
  code: string;
  name: string;
  partyType: "CUSTOMER" | "VENDOR" | "BOTH";
  customerType: "B2B" | "B2C" | null;
  gstin: string | null;
  stateCode: string | null;
  state: string | null;
  creditLimit: string;
  creditDays: number;
  isActive: boolean;
}

export interface ProductLite {
  id: number;
  sku: string;
  name: string;
  unit: string;
  hsnCode: string | null;
  sellingPrice: string;
  purchasePrice: string;
  taxRate: string;
  reorderLevel: string;
  mrp?: string;
  trackBatches?: boolean;
  hasExpiry?: boolean;
  shelfLifeDays?: number | null;
  isActive: boolean;
  stockQty?: string;
}

export interface WarehouseLite {
  id: number;
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

/** Loads the master data every document form needs. */
export function useMasters(role: "customer" | "vendor") {
  const [parties, setParties] = useState<PartyLite[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, pr, w] = await Promise.all([
          api<Page<PartyLite>>("/masters/parties", { query: { role, active: true, pageSize: 200 } }),
          api<Page<ProductLite>>("/masters/products", { query: { active: true, pageSize: 200 } }),
          api<WarehouseLite[]>("/masters/warehouses"),
        ]);
        if (!alive) return;
        setParties(p.items);
        setProducts(pr.items);
        setWarehouses(w.filter((x) => x.isActive));
      } catch (e) {
        if (!alive || !isOffline(e)) return;
        const dp = demoFor("/masters/parties") as { items: PartyLite[] } | null;
        const dpr = demoFor("/masters/products") as { items: ProductLite[] } | null;
        const dw = demoFor("/masters/warehouses") as { items: WarehouseLite[] } | null;
        setParties((dp?.items ?? []).filter((x) => x.partyType === "BOTH" || x.partyType === (role === "customer" ? "CUSTOMER" : "VENDOR")));
        setProducts(dpr?.items ?? []);
        setWarehouses(dw?.items ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [role]);

  return { parties, products, warehouses, loading };
}

/** Wraps an async action with loading + error state and ApiError unpacking. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, run, clear: () => setError(null) };
}
