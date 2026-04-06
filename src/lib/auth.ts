import { eq } from "drizzle-orm";
import type { IncomingHttpHeaders } from "node:http";
import type { NextRequest } from "next/server";

import { db } from "@/src/db/client";
import { users, type UserRole } from "@/src/db/schema";

export type RequestActor = {
  id: string;
  role: UserRole;
  status: "active" | "inactive";
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getHeaderValue(
  headers: Headers | IncomingHttpHeaders,
  key: string,
): string | null {
  if (headers instanceof Headers) {
    return headers.get(key);
  }

  const value = headers[key];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function getActorFromHeaders(
  headers: Headers | IncomingHttpHeaders,
): Promise<RequestActor> {
  const userId = getHeaderValue(headers, "x-user-id");
  const role = getHeaderValue(headers, "x-user-role") as UserRole | null;
  const statusHeader = getHeaderValue(headers, "x-user-status");

  if (role && (!userId || !statusHeader)) {
    throw new ApiError(
      400,
      "When x-user-role is provided, x-user-id and x-user-status are required too.",
    );
  }

  if (userId && role && statusHeader) {
    if (statusHeader !== "active" && statusHeader !== "inactive") {
      throw new ApiError(400, "x-user-status must be active or inactive.");
    }

    return {
      id: userId,
      role,
      status: statusHeader,
    };
  }

  const seedActor = await db.query.users.findFirst({
    where: eq(users.role, "admin"),
    columns: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!seedActor) {
    throw new ApiError(
      401,
      "No request actor found. Seed an admin user or send x-user-id, x-user-role, and x-user-status headers.",
    );
  }

  return seedActor;
}

export async function getRequestActor(request: NextRequest): Promise<RequestActor> {
  return getActorFromHeaders(request.headers);
}

export function assertActiveActor(actor: RequestActor) {
  if (actor.status !== "active") {
    throw new ApiError(403, "Inactive users cannot perform this action.");
  }
}

export function assertRole(actor: RequestActor, allowedRoles: UserRole[]) {
  assertActiveActor(actor);

  if (!allowedRoles.includes(actor.role)) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }
}
