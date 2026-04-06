import type { NextApiRequest, NextApiResponse } from "next";
import { desc, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { auditLogs, categories, financialRecords } from "@/src/db/schema";
import { assertRole, getActorFromHeaders } from "@/src/lib/auth";
import { sendMethodNotAllowed, sendRouteError } from "@/src/lib/api-response";
import {
  asDateString,
  asNonEmptyString,
  asOptionalString,
  asPositiveAmount,
  asRecordType,
} from "@/src/lib/validation";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const actor = await getActorFromHeaders(req.headers);

    if (req.method === "GET") {
      assertRole(actor, ["viewer", "analyst", "admin"]);

      const type =
        req.query.type === "income" || req.query.type === "expense"
          ? req.query.type
          : undefined;
      const categoryId =
        typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
      const query = typeof req.query.query === "string" ? req.query.query : undefined;
      const from = typeof req.query.from === "string" ? req.query.from : undefined;
      const to = typeof req.query.to === "string" ? req.query.to : undefined;

      const filters = [eq(financialRecords.isDeleted, false)];

      if (type) filters.push(eq(financialRecords.type, type));
      if (categoryId) filters.push(eq(financialRecords.categoryId, categoryId));
      if (query) {
        const { ilike } = await import("drizzle-orm");
        filters.push(ilike(financialRecords.description, `%${query}%`));
      }
      if (from) {
        const { gte } = await import("drizzle-orm");
        filters.push(gte(financialRecords.transactionDate, new Date(from)));
      }
      if (to) {
        const { lte } = await import("drizzle-orm");
        filters.push(lte(financialRecords.transactionDate, new Date(to)));
      }

      const { and } = await import("drizzle-orm");

      const data = await db
        .select({
          id: financialRecords.id,
          amount: financialRecords.amount,
          type: financialRecords.type,
          description: financialRecords.description,
          notes: financialRecords.notes,
          transactionDate: financialRecords.transactionDate,
          categoryId: financialRecords.categoryId,
          category: categories.name,
          createdByUserId: financialRecords.createdByUserId,
          updatedAt: financialRecords.updatedAt,
        })
        .from(financialRecords)
        .innerJoin(categories, eq(financialRecords.categoryId, categories.id))
        .where(and(...filters))
        .orderBy(desc(financialRecords.transactionDate));

      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      assertRole(actor, ["admin"]);

      const body = req.body ?? {};

      const payload = {
        amount: asPositiveAmount(body.amount),
        type: asRecordType(body.type),
        categoryId: asNonEmptyString(body.categoryId, "categoryId"),
        transactionDate: new Date(asDateString(body.transactionDate, "transactionDate")),
        description: asOptionalString(body.description, "description", 255),
        notes: asOptionalString(body.notes, "notes", 1000),
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
      };

      const [record] = await db.insert(financialRecords).values(payload).returning();

      await db.insert(auditLogs).values({
        actorUserId: actor.id,
        entity: "financial_record",
        entityId: record.id,
        action: "created",
        details: {
          amount: record.amount,
          type: record.type,
        },
      });

      return res.status(201).json({ data: record });
    }

    return sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    return sendRouteError(res, error);
  }
}
