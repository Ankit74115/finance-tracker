import { createHmac, timingSafeEqual } from "node:crypto";
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

export const ADMIN_SESSION_COOKIE = "finance_tracker_admin_session";

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

function getCookieValue(
  headers: Headers | IncomingHttpHeaders,
  cookieName: string,
): string | null {
  const cookieHeader = getHeaderValue(headers, "cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const match = cookies.find((part) => part.startsWith(`${cookieName}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(cookieName.length + 1));
}

function getAdminPassword() {
  return process.env.ADMIN_LOGIN_PASSWORD ?? "admin123";
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "finance-tracker-admin-session";
}

export function createAdminSessionToken() {
  return createHmac("sha256", getAdminSessionSecret())
    .update(`admin:${getAdminPassword()}`)
    .digest("hex");
}

export function validateAdminPassword(password: string) {
  const expected = Buffer.from(getAdminPassword());
  const actual = Buffer.from(password);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export function hasValidAdminSession(
  headers: Headers | IncomingHttpHeaders,
): boolean {
  const providedToken = getCookieValue(headers, ADMIN_SESSION_COOKIE);

  if (!providedToken) {
    return false;
  }

  const expectedToken = Buffer.from(createAdminSessionToken());
  const actualToken = Buffer.from(providedToken);

  if (expectedToken.length !== actualToken.length) {
    return false;
  }

  return timingSafeEqual(expectedToken, actualToken);
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

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new ApiError(401, "Request actor was not found in the database.");
    }

    if (user.role === "admin" && !hasValidAdminSession(headers)) {
      throw new ApiError(401, "Admin password login is required.");
    }

    if (user.role !== role || user.status !== statusHeader) {
      throw new ApiError(
        403,
        "Request actor headers do not match the stored role or status.",
      );
    }

    return {
      id: user.id,
      role: user.role,
      status: user.status,
    };
  }

  if (hasValidAdminSession(headers)) {
    const authenticatedAdmin = await db.query.users.findFirst({
      where: eq(users.role, "admin"),
      columns: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!authenticatedAdmin) {
      throw new ApiError(401, "Admin session exists but no admin user was found.");
    }

    return authenticatedAdmin;
  }

  throw new ApiError(
    401,
    "No request actor found. Sign in as admin or send valid viewer or analyst headers.",
  );
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
