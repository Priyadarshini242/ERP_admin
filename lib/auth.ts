/**
 * Token storage. Kept in localStorage for the API client and mirrored to a cookie so
 * middleware.ts can redirect unauthenticated navigations before the page renders.
 */
/**
 * NEXT_PUBLIC_AUTH_ENABLED=true turns the login gate on (middleware redirect + 401 handling).
 * Default is off: the app opens straight on the dashboard and the backend runs with AUTH_DISABLED=true.
 */
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

export const TOKEN_KEY = "erp_token";
export const USER_KEY = "erp_user";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: "ADMIN" | "MANAGER" | "USER";
  isActive: boolean;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser, expiresAt?: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
  const expires = expiresAt ? `; expires=${new Date(expiresAt).toUTCString()}` : "";
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax${expires}`;
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
  document.cookie = `${TOKEN_KEY}=; path=/; Max-Age=0; SameSite=Lax`;
}
