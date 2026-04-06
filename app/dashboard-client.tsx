"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole = "viewer" | "analyst" | "admin";

type SummaryResponse = {
  totals: {
    income: number;
    expenses: number;
    netBalance: number;
  };
  categoryTotals: Array<{
    categoryId: string;
    category: string;
    kind: "income" | "expense";
    total: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  recentActivity: Array<{
    id: string;
    amount: string;
    type: "income" | "expense";
    description: string | null;
    notes: string | null;
    transactionDate: string;
    category: string;
  }>;
};

type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string | null;
  description: string | null;
};

type RecordItem = {
  id: string;
  amount: string;
  type: "income" | "expense";
  description: string | null;
  notes: string | null;
  transactionDate: string;
  categoryId: string;
  category: string;
  createdByUserId: string;
  updatedAt: string;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  createdAt: string;
};

type AdminSessionResponse = {
  authenticated: boolean;
};

const roleProfiles: Record<
  UserRole,
  {
    id: string;
    label: string;
    subtitle: string;
    capabilities: string[];
  }
> = {
  viewer: {
    id: "33333333-3333-3333-3333-333333333333",
    label: "Viewer",
    subtitle: "Read-only visibility into your own finance data only.",
    capabilities: [
      "Summary cards and trends for your own records",
      "No record, category, or user management actions",
    ],
  },
  analyst: {
    id: "22222222-2222-2222-2222-222222222222",
    label: "Analyst",
    subtitle: "Insight-focused access for reviewing the full shared finance workspace.",
    capabilities: [
      "Can inspect all records and category totals",
      "Cannot create or update data",
    ],
  },
  admin: {
    id: "11111111-1111-1111-1111-111111111111",
    label: "Admin",
    subtitle: "Full operational access across records, categories, and users.",
    capabilities: [
      "Requires password login to unlock admin controls",
      "Can create categories and records and review users",
    ],
  },
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function roleHeaders(role: UserRole) {
  const profile = roleProfiles[role];

  return {
    "Content-Type": "application/json",
    "x-user-id": profile.id,
    "x-user-role": role,
    "x-user-status": "active",
  };
}

async function readError(response: Response) {
  const body = (await response.json()) as { error?: string };
  return body.error ?? "Request failed.";
}

export function DashboardClient() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("viewer");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminSessionChecked, setAdminSessionChecked] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    kind: "expense" as "income" | "expense",
    color: "",
  });
  const [recordForm, setRecordForm] = useState({
    amount: "",
    type: "expense" as "income" | "expense",
    categoryId: "",
    transactionDate: new Date().toISOString().slice(0, 10),
    description: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState<null | "category" | "record">(null);

  const profile = roleProfiles[selectedRole];
  const isAdmin = selectedRole === "admin";
  const adminLocked = isAdmin && !adminAuthenticated;
  const canReviewRecords = selectedRole === "analyst" || isAdmin;
  const canManage = isAdmin && adminAuthenticated;

  const trendHeadline = useMemo(() => {
    if (!summary?.monthlyTrend.length) {
      return "No monthly trend yet";
    }

    const latest = summary.monthlyTrend[0];
    return `${latest.month} net ${formatCurrency(latest.net)}`;
  }, [summary]);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminSession() {
      try {
        const response = await fetch("/api/auth/admin-session", {
          credentials: "same-origin",
        });

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        const body = (await response.json()) as { data: AdminSessionResponse };

        if (!cancelled) {
          setAdminAuthenticated(Boolean(body.data?.authenticated));
        }
      } catch {
        if (!cancelled) {
          setAdminAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setAdminSessionChecked(true);
        }
      }
    }

    checkAdminSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!adminSessionChecked) {
      return;
    }

    if (adminLocked) {
      setLoading(false);
      setError(null);
      setSummary(null);
      setRecords([]);
      setUsers([]);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const headers = roleHeaders(selectedRole);
        const requests: Promise<Response>[] = [
          fetch("/api/dashboard/summary", {
            headers,
            credentials: "same-origin",
          }),
          fetch("/api/financial-records", {
            headers,
            credentials: "same-origin",
          }),
          fetch("/api/categories", {
            headers,
            credentials: "same-origin",
          }),
        ];

        if (canManage) {
          requests.push(
            fetch("/api/users", {
              headers,
              credentials: "same-origin",
            }),
          );
        }

        const responses = await Promise.all(requests);
        const failed = responses.find((response) => !response.ok);

        if (failed) {
          throw new Error(await readError(failed));
        }

        const [summaryRes, recordsRes, categoriesRes, usersRes] = responses;
        const summaryJson = (await summaryRes.json()) as { data: SummaryResponse };
        const recordsJson = (await recordsRes.json()) as { data: RecordItem[] };
        const categoriesJson = (await categoriesRes.json()) as { data: Category[] };

        if (!cancelled) {
          setSummary(summaryJson.data);
          setRecords(recordsJson.data);
          setCategories(categoriesJson.data);
          setUsers(
            usersRes
              ? (((await usersRes.json()) as { data: UserItem[] }).data ?? [])
              : [],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedRole, adminLocked, canManage, adminSessionChecked]);

  useEffect(() => {
    if (!recordForm.categoryId && categories.length > 0) {
      setRecordForm((current) => ({
        ...current,
        categoryId: categories[0]?.id ?? "",
      }));
    }
  }, [categories, recordForm.categoryId]);

  async function reloadData() {
    const headers = roleHeaders(selectedRole);
    const requests: Promise<Response>[] = [
      fetch("/api/dashboard/summary", {
        headers,
        credentials: "same-origin",
      }),
      fetch("/api/financial-records", {
        headers,
        credentials: "same-origin",
      }),
      fetch("/api/categories", {
        headers,
        credentials: "same-origin",
      }),
    ];

    if (canManage) {
      requests.push(
        fetch("/api/users", {
          headers,
          credentials: "same-origin",
        }),
      );
    }

    const responses = await Promise.all(requests);

    const failed = responses.find((response) => !response.ok);
    if (failed) {
      throw new Error(await readError(failed));
    }

    const [summaryRes, recordsRes, categoriesRes, usersRes] = responses;
    const summaryJson = (await summaryRes.json()) as { data: SummaryResponse };
    const recordsJson = (await recordsRes.json()) as { data: RecordItem[] };
    const categoriesJson = (await categoriesRes.json()) as { data: Category[] };

    setSummary(summaryJson.data);
    setRecords(recordsJson.data);
    setCategories(categoriesJson.data);
    setUsers(
      usersRes ? (((await usersRes.json()) as { data: UserItem[] }).data ?? []) : [],
    );
  }

  async function handleAdminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setAuthSubmitting(true);
      setError(null);

      const response = await fetch("/api/auth/admin-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setAdminAuthenticated(true);
      setAdminPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin login failed.");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleAdminLogout() {
    try {
      setError(null);

      const response = await fetch("/api/auth/admin-session", {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setAdminAuthenticated(false);
      setSelectedRole("viewer");
      setUsers([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin logout failed.");
    }
  }

  async function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSubmitting("category");
      setError(null);

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: roleHeaders(selectedRole),
        credentials: "same-origin",
        body: JSON.stringify(categoryForm),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setCategoryForm({
        name: "",
        kind: "expense",
        color: "",
      });

      await reloadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleCreateRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSubmitting("record");
      setError(null);

      const response = await fetch("/api/financial-records", {
        method: "POST",
        headers: roleHeaders(selectedRole),
        credentials: "same-origin",
        body: JSON.stringify({
          ...recordForm,
          transactionDate: new Date(recordForm.transactionDate).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setRecordForm((current) => ({
        ...current,
        amount: "",
        description: "",
        notes: "",
      }));

      await reloadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create record.");
    } finally {
      setSubmitting(null);
    }
  }

  if (!adminSessionChecked || loading) {
    return (
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
          Live backend preview
        </p>
        <p className="mt-4 text-base text-[var(--muted)]">
          Loading the role-aware finance view from your APIs...
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
              Role-aware frontend preview
            </p>
            <h2 className="mt-2 text-3xl font-semibold">{profile.label} dashboard</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)] md:text-base">
              {profile.subtitle}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {profile.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="rounded-full border border-[var(--border)] bg-white/75 px-4 py-2 text-sm text-[var(--muted)]"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/75 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Switch role
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["viewer", "analyst", "admin"] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedRole === role
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--accent-soft)] text-[var(--accent)]"
                  }`}
                >
                  {roleProfiles[role].label}
                </button>
              ))}
            </div>
            {canManage ? (
              <button
                type="button"
                onClick={handleAdminLogout}
                className="mt-4 rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)]"
              >
                Sign out admin
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <section className="rounded-[2rem] border border-red-200 bg-red-50 p-6 md:p-8">
          <p className="text-sm text-red-700">{error}</p>
          <p className="mt-2 text-sm text-red-600">
            Restart `npx zero-cache-dev` and `npm run dev` after auth changes if the
            browser still shows stale behavior.
          </p>
        </section>
      ) : null}

      {adminLocked ? (
        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
                Admin authentication
              </p>
              <h3 className="mt-2 text-2xl font-semibold">Enter the admin password</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)] md:text-base">
                Admin data and management controls stay locked until you sign in with
                the configured password.
              </p>
            </div>

            <form
              className="space-y-4 rounded-[1.5rem] border border-[var(--border)] bg-white/80 p-5"
              onSubmit={handleAdminLogin}
            >
              <label className="block">
                <span className="text-sm font-medium text-[var(--muted)]">
                  Password
                </span>
                <input
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  placeholder="Enter admin password"
                />
              </label>
              <button
                type="submit"
                disabled={authSubmitting}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {authSubmitting ? "Signing in..." : "Unlock admin dashboard"}
              </button>
            </form>
          </div>
        </section>
      ) : (
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
                Finance overview
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Dashboard summary</h2>
            </div>
            <div className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-medium text-[var(--accent)]">
              {trendHeadline}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.4rem] bg-white/80 p-4">
              <p className="text-sm text-[var(--muted)]">Total income</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">
                {formatCurrency(summary?.totals.income ?? 0)}
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-white/80 p-4">
              <p className="text-sm text-[var(--muted)]">Total expenses</p>
              <p className="mt-2 text-2xl font-semibold text-[#b64926]">
                {formatCurrency(summary?.totals.expenses ?? 0)}
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-white/80 p-4">
              <p className="text-sm text-[var(--muted)]">Net balance</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(summary?.totals.netBalance ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold">Recent activity</h3>
            <div className="mt-4 space-y-3">
              {summary?.recentActivity.length ? (
                summary.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {item.description || item.notes || "Untitled transaction"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {item.category} •{" "}
                        {new Date(item.transactionDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p
                      className={
                        item.type === "income"
                          ? "font-semibold text-[var(--accent)]"
                          : "font-semibold text-[#b64926]"
                      }
                    >
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  No transactions yet. Use the financial record APIs to create one.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Monthly trend</h2>
          <div className="mt-5 space-y-3">
            {summary?.monthlyTrend.length ? (
              summary.monthlyTrend.map((month) => (
                <div
                  key={month.month}
                  className="rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{month.month}</p>
                    <p className="text-sm text-[var(--muted)]">
                      Net {formatCurrency(month.net)}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p className="text-sm text-[var(--accent)]">
                      Income {formatCurrency(month.income)}
                    </p>
                    <p className="text-sm text-[#b64926]">
                      Expenses {formatCurrency(month.expenses)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Trends will appear after you add dated financial records.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {selectedRole === "viewer" ? (
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
            <h2 className="text-2xl font-semibold">Viewer snapshot</h2>
            <div className="mt-5 space-y-4">
              <p className="text-sm leading-7 text-[var(--muted)]">
                This view is intentionally minimal. Viewers only see summaries and
                activity derived from records they own, with no access to shared
                workspace records or operational controls.
              </p>
              <div className="rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4">
                <p className="text-sm text-[var(--muted)]">Available in viewer mode</p>
                <p className="mt-2 font-medium">
                  Personal summary cards, monthly trend, and recent activity.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {canReviewRecords ? (
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <h2 className="text-2xl font-semibold">
            {selectedRole === "analyst" ? "Analyst insights" : "Categories"}
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm"
              >
                <span className="font-medium">{category.name}</span>
                <span className="ml-2 text-[var(--muted)]">({category.kind})</span>
              </div>
            ))}
          </div>
        </div>
        ) : null}

        {canReviewRecords ? (
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Category totals</h2>
          <div className="mt-5 space-y-3">
            {summary?.categoryTotals.length ? (
              summary.categoryTotals.map((item) => (
                <div
                  key={item.categoryId}
                  className="flex items-center justify-between rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4"
                >
                  <div>
                    <p className="font-medium">{item.category}</p>
                    <p className="text-sm text-[var(--muted)]">{item.kind}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.total)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Category totals will populate when records are added.
              </p>
            )}
          </div>
        </div>
        ) : null}

        {canReviewRecords ? (
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Raw records preview</h2>
          <div className="mt-5 space-y-3">
            {records.length ? (
              records.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">
                      {record.description || "Unnamed record"}
                    </p>
                    <p className="font-semibold">{formatCurrency(record.amount)}</p>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {record.type} • {record.category}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">
                No financial records yet. POST to `/api/financial-records` to begin.
              </p>
            )}
          </div>
        </div>
        ) : null}

        {canManage ? (
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Create category</h2>
          <form className="mt-5 space-y-4" onSubmit={handleCreateCategory}>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm outline-none"
              placeholder="Category name"
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm outline-none"
                value={categoryForm.kind}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    kind: event.target.value as "income" | "expense",
                  }))
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <input
                className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm outline-none"
                placeholder="Color (optional)"
                value={categoryForm.color}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    color: event.target.value,
                  }))
                }
              />
            </div>
            <button
              type="submit"
              disabled={submitting === "category"}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting === "category" ? "Creating..." : "Create category"}
            </button>
          </form>
        </div>
        ) : null}

        {canManage ? (
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Create record</h2>
          <form className="mt-5 space-y-4" onSubmit={handleCreateRecord}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm outline-none"
                placeholder="Amount"
                value={recordForm.amount}
                onChange={(event) =>
                  setRecordForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
              <select
                className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm outline-none"
                value={recordForm.type}
                onChange={(event) =>
                  setRecordForm((current) => ({
                    ...current,
                    type: event.target.value as "income" | "expense",
                  }))
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm outline-none"
                value={recordForm.categoryId}
                onChange={(event) =>
                  setRecordForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm outline-none"
                value={recordForm.transactionDate}
                onChange={(event) =>
                  setRecordForm((current) => ({
                    ...current,
                    transactionDate: event.target.value,
                  }))
                }
              />
            </div>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm outline-none"
              placeholder="Description"
              value={recordForm.description}
              onChange={(event) =>
                setRecordForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <textarea
              className="min-h-24 w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm outline-none"
              placeholder="Notes"
              value={recordForm.notes}
              onChange={(event) =>
                setRecordForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
            <button
              type="submit"
              disabled={submitting === "record" || categories.length === 0}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting === "record" ? "Creating..." : "Create record"}
            </button>
          </form>
        </div>
        ) : null}

        {canManage ? (
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <h2 className="text-2xl font-semibold">User roster</h2>
          <div className="mt-5 space-y-3">
            {users.length ? (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-[var(--muted)]">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium capitalize">{user.role}</p>
                    <p className="text-sm text-[var(--muted)] capitalize">
                      {user.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">No users returned yet.</p>
            )}
          </div>
        </div>
        ) : null}
      </div>
      </section>
      )}
    </section>
  );
}
