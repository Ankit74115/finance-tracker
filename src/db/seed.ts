import { eq } from "drizzle-orm";

import { db } from "./client.ts";
import { categories, users } from "./schema.ts";

async function seed() {
  const adminEmail = "admin@finance-tracker.local";

  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  });

  if (!existingAdmin) {
    await db.insert(users).values({
      name: "System Admin",
      email: adminEmail,
      role: "admin",
      status: "active",
    });
  }

  const categorySeeds = [
    { name: "Salary", kind: "income" as const, color: "#0f766e" },
    { name: "Freelance", kind: "income" as const, color: "#2563eb" },
    { name: "Rent", kind: "expense" as const, color: "#dc2626" },
    { name: "Groceries", kind: "expense" as const, color: "#f59e0b" },
    { name: "Utilities", kind: "expense" as const, color: "#7c3aed" },
  ];

  for (const category of categorySeeds) {
    const exists = await db.query.categories.findFirst({
      where: eq(categories.name, category.name),
    });

    if (!exists) {
      await db.insert(categories).values(category);
    }
  }

  console.log("Seed completed.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
