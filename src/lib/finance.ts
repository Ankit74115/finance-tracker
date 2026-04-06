import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";

import { db } from "@/src/db/client";
import { categories, financialRecords } from "@/src/db/schema";

export function buildRecordFilters(searchParams: URLSearchParams) {
  const filters = [eq(financialRecords.isDeleted, false)];

  const type = searchParams.get("type");
  if (type === "income" || type === "expense") {
    filters.push(eq(financialRecords.type, type));
  }

  const categoryId = searchParams.get("categoryId");
  if (categoryId) {
    filters.push(eq(financialRecords.categoryId, categoryId));
  }

  const from = searchParams.get("from");
  if (from) {
    filters.push(gte(financialRecords.transactionDate, new Date(from)));
  }

  const to = searchParams.get("to");
  if (to) {
    filters.push(lte(financialRecords.transactionDate, new Date(to)));
  }

  const query = searchParams.get("query");
  if (query) {
    filters.push(ilike(financialRecords.description, `%${query}%`));
  }

  return and(...filters);
}

export async function getDashboardSummary() {
  const [totals] = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${financialRecords.type} = 'income' then ${financialRecords.amount}::numeric else 0 end), 0)`,
      expenses: sql<number>`coalesce(sum(case when ${financialRecords.type} = 'expense' then ${financialRecords.amount}::numeric else 0 end), 0)`,
    })
    .from(financialRecords)
    .where(eq(financialRecords.isDeleted, false));

  const categoryTotals = await db
    .select({
      categoryId: categories.id,
      category: categories.name,
      kind: categories.kind,
      total: sql<number>`coalesce(sum(${financialRecords.amount}::numeric), 0)`,
    })
    .from(financialRecords)
    .innerJoin(categories, eq(financialRecords.categoryId, categories.id))
    .where(eq(financialRecords.isDeleted, false))
    .groupBy(categories.id, categories.name, categories.kind)
    .orderBy(desc(sql`coalesce(sum(${financialRecords.amount}::numeric), 0)`));

  const monthlyTrend = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${financialRecords.transactionDate}), 'YYYY-MM')`,
      income: sql<number>`coalesce(sum(case when ${financialRecords.type} = 'income' then ${financialRecords.amount}::numeric else 0 end), 0)`,
      expenses: sql<number>`coalesce(sum(case when ${financialRecords.type} = 'expense' then ${financialRecords.amount}::numeric else 0 end), 0)`,
    })
    .from(financialRecords)
    .where(eq(financialRecords.isDeleted, false))
    .groupBy(sql`date_trunc('month', ${financialRecords.transactionDate})`)
    .orderBy(sql`date_trunc('month', ${financialRecords.transactionDate}) desc`)
    .limit(6);

  const recentActivity = await db
    .select({
      id: financialRecords.id,
      amount: financialRecords.amount,
      type: financialRecords.type,
      description: financialRecords.description,
      notes: financialRecords.notes,
      transactionDate: financialRecords.transactionDate,
      category: categories.name,
    })
    .from(financialRecords)
    .innerJoin(categories, eq(financialRecords.categoryId, categories.id))
    .where(eq(financialRecords.isDeleted, false))
    .orderBy(desc(financialRecords.transactionDate))
    .limit(5);

  return {
    totals: {
      income: Number(totals?.income ?? 0),
      expenses: Number(totals?.expenses ?? 0),
      netBalance: Number(totals?.income ?? 0) - Number(totals?.expenses ?? 0),
    },
    categoryTotals: categoryTotals.map((item) => ({
      ...item,
      total: Number(item.total),
    })),
    monthlyTrend: monthlyTrend.map((item) => ({
      ...item,
      income: Number(item.income),
      expenses: Number(item.expenses),
      net: Number(item.income) - Number(item.expenses),
    })),
    recentActivity,
  };
}
