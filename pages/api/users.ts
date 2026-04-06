import type { NextApiRequest, NextApiResponse } from "next";
import { desc, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import { auditLogs, users } from "@/src/db/schema";
import { ApiError, assertRole, getActorFromHeaders } from "@/src/lib/auth";
import { sendMethodNotAllowed, sendRouteError } from "@/src/lib/api-response";
import {
  asNonEmptyString,
  asUserRole,
  asUserStatus,
} from "@/src/lib/validation";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const actor = await getActorFromHeaders(req.headers);
    assertRole(actor, ["admin"]);

    if (req.method === "GET") {
      const statusFilter = req.query.status;
      const normalizedStatus =
        statusFilter === "active" || statusFilter === "inactive"
          ? statusFilter
          : undefined;

      const data = await db.query.users.findMany({
        where: normalizedStatus ? eq(users.status, normalizedStatus) : undefined,
        orderBy: [desc(users.createdAt)],
      });

      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      const body = req.body ?? {};

      const payload = {
        name: asNonEmptyString(body.name, "name", 120),
        email: asNonEmptyString(body.email, "email", 255).toLowerCase(),
        role: asUserRole(body.role),
        status: body.status ? asUserStatus(body.status) : "active",
      };

      const [user] = await db.insert(users).values(payload).returning();

      await db.insert(auditLogs).values({
        actorUserId: actor.id,
        entity: "user",
        entityId: user.id,
        action: "created",
        details: {
          email: user.email,
          role: user.role,
        },
      });

      return res.status(201).json({ data: user });
    }

    if (req.method === "PATCH") {
      const body = req.body ?? {};
      const userId = asNonEmptyString(body.id, "id");

      const [updatedUser] = await db
        .update(users)
        .set({
          name: body.name ? asNonEmptyString(body.name, "name", 120) : undefined,
          role: body.role ? asUserRole(body.role) : undefined,
          status: body.status ? asUserStatus(body.status) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new ApiError(404, "User not found.");
      }

      await db.insert(auditLogs).values({
        actorUserId: actor.id,
        entity: "user",
        entityId: updatedUser.id,
        action: "updated",
        details: body,
      });

      return res.status(200).json({ data: updatedUser });
    }

    return sendMethodNotAllowed(res, ["GET", "POST", "PATCH"]);
  } catch (error) {
    return sendRouteError(res, error);
  }
}
