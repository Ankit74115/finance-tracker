import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.ts";

const connectionString =
  process.env.DATABASE_URL ?? process.env.ZERO_UPSTREAM_DB ?? "";

if (!connectionString) {
  throw new Error(
    "Missing database connection string. Set DATABASE_URL or ZERO_UPSTREAM_DB.",
  );
}

const queryClient = postgres(connectionString, {
  max: 1,
  prepare: false,
});

export const db = drizzle(queryClient, { schema });
