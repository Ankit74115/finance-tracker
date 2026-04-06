import type { NextApiRequest, NextApiResponse } from "next";
import { asc, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { auditLogs, categories } from "@/src/db/schema";
import { ApiError, assertRole, getActorFromHeaders } from "@/src/lib/auth";
import { sendMethodNotAllowed, sendRouteError } from "@/src/lib/api-response";
import {
  asNonEmptyString,
  asOptionalString,
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

      const kind =
        req.query.kind === "income" || req.query.kind === "expense"
          ? req.query.kind
          : undefined;

      const data = await db.query.categories.findMany({
        where: kind ? eq(categories.kind, kind) : undefined,
        orderBy: [asc(categories.name)],
      });

      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      assertRole(actor, ["admin"]);
      const body = req.body ?? {};

      const [category] = await db
        .insert(categories)
        .values({
          name: asNonEmptyString(body.name, "name", 120),
          kind: asRecordType(body.kind),
          color: asOptionalString(body.color, "color", 20),
          description: asOptionalString(body.description, "description", 400),
        })
        .returning();

      await db.insert(auditLogs).values({
        actorUserId: actor.id,
        entity: "category",
        entityId: category.id,
        action: "created",
        details: {
          name: category.name,
          kind: category.kind,
        },
      });

      return res.status(201).json({ data: category });
    }

    if (req.method === "PATCH") {
      assertRole(actor, ["admin"]);
      const body = req.body ?? {};
      const categoryId = asNonEmptyString(body.id, "id");

      const [category] = await db
        .update(categories)
        .set({
          name: body.name ? asNonEmptyString(body.name, "name", 120) : undefined,
          kind: body.kind ? asRecordType(body.kind) : undefined,
          color:
            body.color !== undefined
              ? asOptionalString(body.color, "color", 20)
              : undefined,
          description:
            body.description !== undefined
              ? asOptionalString(body.description, "description", 400)
              : undefined,
        })
        .where(eq(categories.id, categoryId))
        .returning();

      if (!category) {
        throw new ApiError(404, "Category not found.");
      }

      await db.insert(auditLogs).values({
        actorUserId: actor.id,
        entity: "category",
        entityId: category.id,
        action: "updated",
        details: body,
      });

      return res.status(200).json({ data: category });
    }

    return sendMethodNotAllowed(res, ["GET", "POST", "PATCH"]);
  } catch (error) {
    return sendRouteError(res, error);
  }
}
