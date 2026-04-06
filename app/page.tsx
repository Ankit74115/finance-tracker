import { DashboardClient } from "@/app/dashboard-client";

export default function Home() {
  const endpoints = [
    {
      method: "GET",
      path: "/api/users",
      detail: "List users, with optional filtering by active or inactive status.",
    },
    {
      method: "POST",
      path: "/api/users",
      detail: "Create a user and assign viewer, analyst, or admin access.",
    },
    {
      method: "PATCH",
      path: "/api/users",
      detail: "Update user role or status with admin-only access control.",
    },
    {
      method: "GET",
      path: "/api/financial-records",
      detail: "Read records with filters for type, date range, category, and search text.",
    },
    {
      method: "POST",
      path: "/api/financial-records",
      detail: "Create a new income or expense entry.",
    },
    {
      method: "GET / PATCH / DELETE",
      path: "/api/financial-records/:id",
      detail: "Inspect, update, or soft-delete a specific record.",
    },
    {
      method: "GET",
      path: "/api/dashboard/summary",
      detail: "Return totals, category breakdowns, monthly trends, and recent activity.",
    },
    {
      method: "GET / POST / PATCH",
      path: "/api/categories",
      detail: "List and manage shared finance categories used by transactions.",
    },
  ];

  const buildSteps = [
    "Run `docker compose up -d` to start PostgreSQL with logical replication enabled.",
    "Copy `.env.example` to `.env` and keep the local database URL on port 5433.",
    "Run `npm run db:push` to sync the Drizzle schema to Postgres.",
    "Run `npm run db:seed` to create an admin user and starter categories.",
    "Keep `npx zero-cache-dev` running in one terminal and `npm run dev` in another.",
  ];

  const roleRules = [
    "Viewer can read dashboard summaries and financial records.",
    "Analyst can inspect records and insights but cannot mutate data.",
    "Admin can manage users, create and edit records, and soft-delete entries.",
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8 md:px-10 md:py-12">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] px-6 py-8 shadow-[0_20px_60px_rgba(76,63,43,0.08)] md:px-10 md:py-12">
        <div className="mb-6 inline-flex rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--muted)]">
          Zero + Next.js + Drizzle backend foundation
        </div>
        <div className="grid gap-10 md:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
              Finance dashboard backend with role-aware APIs and Zero-ready data flow.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
              This project is being shaped around your assignment brief: user and
              role management, financial record CRUD, dashboard summaries, backend
              access control, validation, and a Postgres-backed persistence layer
              that can evolve into a real Zero-powered dashboard.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-[var(--accent)] p-6 text-[#f5f1e8]">
            <p className="text-sm uppercase tracking-[0.28em] text-[#cce2db]">
              Current backend scope
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 md:text-base">
              <li>Drizzle schema for users, categories, financial records, and audit logs</li>
              <li>Mock header-based access control for viewer, analyst, and admin roles</li>
              <li>API endpoints for users, financial records, and dashboard summaries</li>
              <li>Seed workflow for an initial admin user and starter categories</li>
            </ul>
          </div>
        </div>
      </section>

      <DashboardClient />

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Available endpoints</h2>
          <div className="mt-6 space-y-4">
            {endpoints.map((endpoint) => (
              <div
                key={`${endpoint.method}-${endpoint.path}`}
                className="rounded-[1.4rem] border border-[var(--border)] bg-white/75 p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[var(--accent)]">
                    {endpoint.method}
                  </span>
                  <code className="text-sm font-semibold">{endpoint.path}</code>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {endpoint.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-2xl font-semibold">Role behavior</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--muted)]">
              {roleRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-2xl font-semibold">Build steps</h2>
            <ol className="mt-5 space-y-3 text-sm leading-7 text-[var(--muted)]">
              {buildSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
