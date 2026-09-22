/**
 * Typed fetch wrapper for the ERP API. Attaches the bearer token, unwraps JSON,
 * and turns non-2xx responses into ApiError with the backend's {message, errors, warnings}.
 */
import { AUTH_ENABLED, clearToken, getToken } from "./auth";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// Keep the UI responsive when running the frontend without the optional API.
// Deployments with a remote API can override this in .env.local.
const configuredTimeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? "1500");
const API_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 1500;

export interface Issue {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  errors: Issue[];
  warnings: Issue[];

  constructor(status: number, message: string, errors: Issue[] = [], warnings: Issue[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.warnings = warnings;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface Options {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  /** don't redirect to /login on 401 (used by the login page itself) */
  noAuthRedirect?: boolean;
}

export function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${buildQuery(opts.query)}`, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    if (AUTH_ENABLED && res.status === 401 && !opts.noAuthRedirect && typeof window !== "undefined") {
      clearToken();
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    const d = (data ?? {}) as { message?: string; errors?: Issue[]; warnings?: Issue[] };
    throw new ApiError(res.status, d.message ?? res.statusText ?? "Request failed", d.errors ?? [], d.warnings ?? []);
  }
  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}
