import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { auditLogs, categories, financialRecords } from "@/src/db/schema";
import { ApiError, assertRole, getActorFromHeaders } from "@/src/lib/auth";
import { sendMethodNotAllowed, sendRouteError } from "@/src/lib/api-response";
import {
  asDateString,
  asOptionalString,
  asPositiveAmount,
  asRecordType,
} from "@/src/lib/validation";

function getRecordId(req: NextApiRequest) {
  const { id } = req.query;
  if (typeof id !== "string") {
    throw new ApiError(400, "Record id is required.");
  }
  return id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const actor = await getActorFromHeaders(req.headers);
    const recordId = getRecordId(req);

    if (req.method === "GET") {
      assertRole(actor, ["viewer", "analyst", "admin"]);

      const [record] = await db
        .select({
          id: financialRecords.id,
          amount: financialRecords.amount,
          type: financialRecords.type,
          description: financialRecords.description,
          notes: financialRecords.notes,
          transactionDate: financialRecords.transactionDate,
          categoryId: financialRecords.categoryId,
          category: categories.name,
          isDeleted: financialRecords.isDeleted,
        })
        .from(financialRecords)
        .innerJoin(categories, eq(financialRecords.categoryId, categories.id))
        .where(eq(financialRecords.id, recordId));

      if (!record || record.isDeleted) {
        throw new ApiError(404, "Financial record not found.");
      }

      return res.status(200).json({ data: record });
    }

    if (req.method === "PATCH") {
      assertRole(actor, ["admin"]);
      const body = req.body ?? {};

      const [record] = await db
        .update(financialRecords)
        .set({
          amount: body.amount ? asPositiveAmount(body.amount) : undefined,
          type: body.type ? asRecordType(body.type) : undefined,
          categoryId: body.categoryId,
          transactionDate: body.transactionDate
            ? new Date(asDateString(body.transactionDate, "transactionDate"))
            : undefined,
          description:
            body.description !== undefined
              ? asOptionalString(body.description, "description", 255)
              : undefined,
          notes:
            body.notes !== undefined
              ? asOptionalString(body.notes, "notes", 1000)
              : undefined,
          updatedByUserId: actor.id,
          updatedAt: new Date(),
        })
        .where(eq(financialRecords.id, recordId))
        .returning();

      if (!record) {
        throw new ApiError(404, "Financial record not found.");
      }

      await db.insert(auditLogs).values({
        actorUserId: actor.id,
        entity: "financial_record",
        entityId: record.id,
        action: "updated",
        details: body,
      });

      return res.status(200).json({ data: record });
    }

    if (req.method === "DELETE") {
      assertRole(actor, ["admin"]);

      const [record] = await db
        .update(financialRecords)
        .set({
          isDeleted: true,
          updatedByUserId: actor.id,
          updatedAt: new Date(),
        })
        .where(eq(financialRecords.id, recordId))
        .returning();

      if (!record) {
        throw new ApiError(404, "Financial record not found.");
      }

      await db.insert(auditLogs).values({
        actorUserId: actor.id,
        entity: "financial_record",
        entityId: record.id,
        action: "deleted",
        details: null,
      });

      return res.status(200).json({ data: record });
    }

    return sendMethodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
  } catch (error) {
    return sendRouteError(res, error);
  }
}
