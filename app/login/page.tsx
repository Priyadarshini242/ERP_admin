"use client";

/**
 * Local sign-in form — no API call. It stores a session in the browser and opens the dashboard.
 * The backend's POST /auth/login is used only when NEXT_PUBLIC_AUTH_ENABLED=true / AUTH_DISABLED=false.
 */
import { Layers3, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { useTheme } from "@/components/ThemeProvider";
import { Button, Checkbox, Field, Input } from "@/components/ui";
import { setSession } from "@/lib/auth";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "QuickERP";
const TAGLINE = process.env.NEXT_PUBLIC_APP_TAGLINE ?? "Retail & Wholesale";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@erp.local");
  const [password, setPassword] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "User";
    setSession("local-session", { id: 0, email, fullName: name, role: "ADMIN", isActive: true });
    router.replace(params.get("next") || "/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <Layers3 className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">{APP}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{TAGLINE}</p>
        </div>
      </div>
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Welcome back</h2>
      <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">Sign in to continue to your dashboard.</p>
      <div className="space-y-4">
        <Field label="Email" required>
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <div className="flex items-center justify-between">
          <Checkbox label="Remember me" defaultChecked />
          <span className="text-xs text-brand-600 dark:text-brand-300">Forgot password?</span>
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          or{" "}
          <Link href="/dashboard" className="text-brand-600 hover:underline dark:text-brand-300">
            continue without signing in
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const { theme, toggle } = useTheme();
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-ink-950">
      <button onClick={toggle} className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-white dark:text-slate-300 dark:hover:bg-ink-800" title="Toggle theme">
        {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="absolute bottom-4 text-[11px] text-slate-400 dark:text-slate-500">Modern ERP · Simple · Scalable · Efficient</p>
    </main>
  );
}
