"use client";

import { CheckCircle2, CheckSquare, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { DataTable } from "@/components/DataTable";
import { Button, Card, Checkbox, PageHeader, Pill, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { ACCESS_CATEGORIES, getUser, getVisibleMenuKeys, setVisibleMenuKeys, updateUserAccessCategory, type AccessCategory } from "@/lib/auth";
import { defaultMenuKeysForCategory, menuAccessEntries } from "@/lib/nav";

type UserRow = Record<string, unknown>;

export default function UsersAndRolesPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const entries = menuAccessEntries();
  const [visibleKeys, setVisibleKeys] = useState<string[] | null>(null);
  const [accessCategory, setAccessCategory] = useState<AccessCategory>("ALL");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setVisibleKeys(getVisibleMenuKeys());
    setAccessCategory(getUser()?.accessCategory ?? "ALL");
    api<UserRow[]>("/auth/users").then(setUsers).catch(() => setUsers(null));
  }, []);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const selected = new Set(visibleKeys ?? entries.map((entry) => entry.key));
  const toggle = (key: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(key);
    else next.delete(key);
    const keys = [...next];
    setVisibleKeys(keys);
    setSaved(false);
  };
  const clearModule = (keys: string[]) => {
    const next = new Set(selected);
    keys.forEach((key) => next.delete(key));
    const updated = [...next];
    setVisibleKeys(updated);
    setSaved(false);
  };
  const saveMenuAccess = () => {
    updateUserAccessCategory(accessCategory);
    setVisibleMenuKeys([...selected]);
    setSaved(true);
  };

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Manage user accounts, roles and module access" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={<span className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" /> Users</span>} padded={false} className="lg:col-span-3">
          {users ? (
            <DataTable
              bare
              columns={[
                { key: "fullName", header: "Name", render: (u) => <span className="font-medium text-slate-800 dark:text-slate-100">{String(u.fullName ?? "")}</span> },
                { key: "email", header: "Email" },
                { key: "role", header: "Role", render: (u) => <Pill tone={u.role === "ADMIN" ? "violet" : u.role === "MANAGER" ? "info" : "neutral"}>{String(u.role ?? "USER")}</Pill> },
                { key: "accessCategory", header: "Access", render: (u) => <Pill tone="info">{u.accessCategory === "NON_FMCG" ? "NON FMCG" : String(u.accessCategory ?? "ALL")}</Pill> },
                { key: "isActive", header: "", render: (u) => (u.isActive ? <Pill tone="success">active</Pill> : <Pill>inactive</Pill>) },
              ]}
              rows={users}
              empty="No users"
            />
          ) : (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">User management is available once the API is running with an admin account.</p>
          )}
        </Card>

        <Card
          title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-500" /> Sidebar Menu Access</span>}
          actions={<Button size="sm" onClick={saveMenuAccess}>Save changes</Button>}
          className="lg:col-span-3"
        >
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Choose an access category, then check the menu items that should appear in the sidebar. Save to apply these settings as the default.</p>
          <div className="mb-5 max-w-sm">
            <label htmlFor="access-category" className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Access category</label>
            <Select
              id="access-category"
              value={accessCategory}
              onChange={(event) => {
                const category = event.target.value as AccessCategory;
                setAccessCategory(category);
                const defaults = defaultMenuKeysForCategory(category);
                setVisibleKeys(defaults);
                setSaved(false);
              }}
              className="mt-1"
            >
              {ACCESS_CATEGORIES.map((category) => <option key={category} value={category}>{category === "ALL" ? "All modules" : category.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from(new Set(entries.map((entry) => entry.moduleKey))).map((moduleKey) => {
              const moduleEntries = entries.filter((entry) => entry.moduleKey === moduleKey);
              return (
                <section key={moduleKey} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm dark:border-ink-700 dark:bg-ink-850">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-2.5 dark:border-ink-700">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><CheckSquare className="h-4 w-4 text-brand-500" /> {moduleEntries[0]?.moduleLabel}</h2>
                    <Button variant="ghost" size="sm" onClick={() => clearModule(moduleEntries.map((entry) => entry.key))}>Clear all</Button>
                  </div>
                  <div className="space-y-2.5">
                    {moduleEntries.map((entry) => (
                      <Checkbox key={entry.key} label={entry.path.length ? `${entry.path.join(" › ")} › ${entry.label}` : entry.label} checked={selected.has(entry.key)} onChange={(event) => toggle(entry.key, event.target.checked)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </Card>
      </div>
      {saved && (
        <div role="status" className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-700/25">
          <CheckCircle2 className="h-4 w-4" /> Changes saved successfully
        </div>
      )}
    </div>
  );
}
