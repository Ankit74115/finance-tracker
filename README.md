# Finance Tracker Backend

This project is a Zero-ready finance dashboard backend built with Next.js, Drizzle, Postgres, and Zero Cache. It is shaped around the assignment requirements for user management, financial records, dashboard summaries, access control, validation, and maintainable backend structure.

## Current Scope

- Role-aware backend model with `viewer`, `analyst`, and `admin`
- Drizzle schema for users, categories, financial records, and audit logs
- API endpoints for users, categories, financial record CRUD, and dashboard summaries
- Header-based authorization for viewer and analyst local development
- Password-gated admin login with an HTTP-only session cookie
- Frontend role switcher with visibly different dashboards for viewer, analyst, and admin
- PostgreSQL + Zero local setup through Docker and `zero-cache-dev`

## Tech Stack

- Next.js 16
- Zero Cache
- Drizzle ORM
- PostgreSQL
- TypeScript

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Copy the environment file

```bash
cp .env.example .env
```

3. Start PostgreSQL

```bash
docker compose up -d
```

4. Push the schema

```bash
npm run db:push
```

5. Seed demo users, starter categories, and sample records

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5433/finance_tracker npm run db:seed
```

6. Start Zero Cache in one terminal

```bash
npx zero-cache-dev
```

7. Start Next.js in another terminal

```bash
npm run dev
```

## Mock Authorization

For local development, viewer and analyst API access can be controlled using request headers:

- `x-user-id`
- `x-user-role`
- `x-user-status`

Admin access is different: the UI now asks for the password defined in `.env` as `ADMIN_LOGIN_PASSWORD` and sets a secure HTTP-only session cookie before allowing admin data access.

The frontend also includes a mock role switcher so evaluators can quickly preview:

- `viewer` as a read-only dashboard scoped to that viewer's own records
- `analyst` as a shared records-and-insights dashboard
- `admin` as a password-protected management dashboard with create flows and user visibility

## API Surface

### Users

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users`

### Financial Records

- `GET /api/financial-records`
- `POST /api/financial-records`
- `GET /api/financial-records/:id`
- `PATCH /api/financial-records/:id`
- `DELETE /api/financial-records/:id`

### Categories

- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories`

### Dashboard

- `GET /api/dashboard/summary`

## Role Rules

- Viewer can read only their own financial records and summaries
- Analyst can read shared financial records and dashboard summaries
- Admin can manage users and fully manage financial records after password login

## Data Model

### Users

- `id`
- `name`
- `email`
- `role`
- `status`
- timestamps

### Categories

- `id`
- `name`
- `kind`
- `color`
- `description`

### Financial Records

- `id`
- `amount`
- `type`
- `categoryId`
- `transactionDate`
- `description`
- `notes`
- `createdByUserId`
- `updatedByUserId`
- `isDeleted`
- timestamps

### Audit Logs

- `id`
- `actorUserId`
- `entity`
- `entityId`
- `action`
- `details`
- `createdAt`

## Assumptions

- Viewer and analyst remain mock roles for local evaluation, while admin is protected with a simple password-backed session
- Soft delete is used for financial records to preserve auditability
- Categories are shared system-wide instead of user-specific for the first version
- Zero integration is currently focused on the data layer and local replication workflow, with the frontend still evolving

## Next Steps

- Add pagination for financial records
- Introduce stronger request validation helpers
- Add tests for access control and summary calculations
- Replace mock header auth with real token or session authentication
- Connect the frontend directly to Zero queries instead of fetch-only API calls
