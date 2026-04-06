"use client";

import { useEffect, useState } from "react";

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

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function DashboardClient() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [summaryRes, recordsRes, categoriesRes] = await Promise.all([
          fetch("/api/dashboard/summary"),
          fetch("/api/financial-records"),
          fetch("/api/categories"),
        ]);

        if (!summaryRes.ok || !recordsRes.ok || !categoriesRes.ok) {
          throw new Error("Failed to load backend data. Ensure the database is seeded.");
        }

        const summaryJson = (await summaryRes.json()) as { data: SummaryResponse };
        const recordsJson = (await recordsRes.json()) as { data: RecordItem[] };
        const categoriesJson = (await categoriesRes.json()) as { data: Category[] };

        if (!cancelled) {
          setSummary(summaryJson.data);
          setRecords(recordsJson.data);
          setCategories(categoriesJson.data);
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
  }, []);

  useEffect(() => {
    if (!recordForm.categoryId && categories.length > 0) {
      setRecordForm((current) => ({
        ...current,
        categoryId: categories[0]?.id ?? "",
      }));
    }
  }, [categories, recordForm.categoryId]);

  async function reloadData() {
    const [summaryRes, recordsRes, categoriesRes] = await Promise.all([
      fetch("/api/dashboard/summary"),
      fetch("/api/financial-records"),
      fetch("/api/categories"),
    ]);

    if (!summaryRes.ok || !recordsRes.ok || !categoriesRes.ok) {
      throw new Error("Failed to refresh dashboard data.");
    }

    const summaryJson = (await summaryRes.json()) as { data: SummaryResponse };
    const recordsJson = (await recordsRes.json()) as { data: RecordItem[] };
    const categoriesJson = (await categoriesRes.json()) as { data: Category[] };

    setSummary(summaryJson.data);
    setRecords(recordsJson.data);
    setCategories(categoriesJson.data);
  }

  async function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSubmitting("category");
      setError(null);

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryForm),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create category.");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...recordForm,
          transactionDate: new Date(recordForm.transactionDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create financial record.");
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

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
          Live backend preview
        </p>
        <p className="mt-4 text-base text-[var(--muted)]">
          Loading summary, records, and categories from your APIs...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
          Live backend preview
        </p>
        <p className="mt-4 text-base text-red-700">{error}</p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Run `npm run db:push`, `npm run db:seed`, `npx zero-cache-dev`, and `npm run dev`.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
                Live backend preview
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Dashboard summary</h2>
            </div>
            <div className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-medium text-[var(--accent)]">
              {records.length} records
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
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Categories</h2>
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
      </div>
    </section>
  );
}
