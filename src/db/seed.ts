import { eq } from "drizzle-orm";

import { db } from "./client.ts";
import { categories, financialRecords, users } from "./schema.ts";

const demoUsers = {
  admin: {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Demo Admin",
    email: "demo-admin@finance-tracker.local",
    role: "admin" as const,
    status: "active" as const,
  },
  analyst: {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Demo Analyst",
    email: "demo-analyst@finance-tracker.local",
    role: "analyst" as const,
    status: "active" as const,
  },
  viewer: {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Demo Viewer",
    email: "demo-viewer@finance-tracker.local",
    role: "viewer" as const,
    status: "active" as const,
  },
};

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

  for (const demoUser of Object.values(demoUsers)) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, demoUser.email),
    });

    if (!existingUser) {
      await db.insert(users).values(demoUser);
    }
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

  const salaryCategory = await db.query.categories.findFirst({
    where: eq(categories.name, "Salary"),
  });
  const freelanceCategory = await db.query.categories.findFirst({
    where: eq(categories.name, "Freelance"),
  });
  const rentCategory = await db.query.categories.findFirst({
    where: eq(categories.name, "Rent"),
  });
  const groceriesCategory = await db.query.categories.findFirst({
    where: eq(categories.name, "Groceries"),
  });

  const existingViewerRecord = await db.query.financialRecords.findFirst({
    where: eq(financialRecords.createdByUserId, demoUsers.viewer.id),
  });

  if (
    !existingViewerRecord &&
    salaryCategory &&
    freelanceCategory &&
    rentCategory &&
    groceriesCategory
  ) {
    await db.insert(financialRecords).values([
      {
        amount: "95000.00",
        type: "income",
        categoryId: salaryCategory.id,
        transactionDate: new Date("2026-04-01T09:00:00.000Z"),
        description: "April salary",
        notes: "Viewer-owned record for scoped dashboards",
        createdByUserId: demoUsers.viewer.id,
        updatedByUserId: demoUsers.viewer.id,
      },
      {
        amount: "12000.00",
        type: "expense",
        categoryId: groceriesCategory.id,
        transactionDate: new Date("2026-04-04T18:30:00.000Z"),
        description: "Monthly groceries",
        notes: "Viewer-owned household expense",
        createdByUserId: demoUsers.viewer.id,
        updatedByUserId: demoUsers.viewer.id,
      },
      {
        amount: "180000.00",
        type: "income",
        categoryId: freelanceCategory.id,
        transactionDate: new Date("2026-04-02T10:30:00.000Z"),
        description: "Consulting retainer",
        notes: "Admin-visible shared workspace revenue",
        createdByUserId: demoUsers.admin.id,
        updatedByUserId: demoUsers.admin.id,
      },
      {
        amount: "40000.00",
        type: "expense",
        categoryId: rentCategory.id,
        transactionDate: new Date("2026-04-03T07:00:00.000Z"),
        description: "Office rent",
        notes: "Admin/analyst can review this, viewer cannot",
        createdByUserId: demoUsers.admin.id,
        updatedByUserId: demoUsers.admin.id,
      },
    ]);
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
