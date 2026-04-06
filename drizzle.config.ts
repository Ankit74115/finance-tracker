import { defineConfig } from "drizzle-kit";

const connectionString =
  process.env.DATABASE_URL ?? process.env.ZERO_UPSTREAM_DB ?? "";

if (!connectionString) {
  throw new Error(
    "Missing DATABASE_URL or ZERO_UPSTREAM_DB for drizzle-kit configuration.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  strict: true,
  verbose: true,
});
