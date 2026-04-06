# Finance Tracker Backend

This project is a Zero-ready finance dashboard backend built with Next.js, Drizzle, Postgres, and Zero Cache. It is shaped around the assignment requirements for user management, financial records, dashboard summaries, access control, validation, and maintainable backend structure.

## Current Scope

- Role-aware backend model with `viewer`, `analyst`, and `admin`
- Drizzle schema for users, categories, financial records, and audit logs
- API endpoints for users, categories, financial record CRUD, and dashboard summaries
- Mock header-based authorization for local development
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

5. Seed an admin user and starter categories

```bash
npm run db:seed
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

For local development, API access can be controlled using request headers:

- `x-user-id`
- `x-user-role`
- `x-user-status`

If those headers are omitted, the backend falls back to the first admin user in the database. The seed script creates `admin@finance-tracker.local` for that purpose.

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

- Viewer can read financial records and dashboard summaries
- Analyst can read financial records and dashboard summaries
- Admin can manage users and fully manage financial records

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

- Header-based authorization is acceptable for local evaluation and can later be replaced with token or session auth
- Soft delete is used for financial records to preserve auditability
- Categories are shared system-wide instead of user-specific for the first version
- Zero integration is currently focused on the data layer and local replication workflow, with the frontend still evolving

## Next Steps

- Add pagination for financial records
- Introduce stronger request validation helpers
- Add tests for access control and summary calculations
- Replace mock header auth with real token or session authentication
- Connect the frontend directly to Zero queries instead of fetch-only API calls
