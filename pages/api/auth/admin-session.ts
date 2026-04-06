import type { NextApiRequest, NextApiResponse } from "next";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getActorFromHeaders,
  hasValidAdminSession,
  validateAdminPassword,
} from "@/src/lib/auth";
import { sendMethodNotAllowed, sendRouteError } from "@/src/lib/api-response";
import { asNonEmptyString } from "@/src/lib/validation";

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

function buildSessionCookie(token: string) {
  return [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=86400",
  ].join("; ");
}

function buildClearCookie() {
  return [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === "GET") {
      const authenticated = hasValidAdminSession(req.headers);

      if (!authenticated) {
        return res.status(200).json({ data: { authenticated: false } });
      }

      const actor = await getActorFromHeaders(req.headers);

      return res.status(200).json({
        data: {
          authenticated: true,
          actor,
        },
      });
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const password = asNonEmptyString(body.password, "password", 120);

      if (!validateAdminPassword(password)) {
        return res.status(401).json({ error: "Incorrect admin password." });
      }

      res.setHeader("Set-Cookie", buildSessionCookie(createAdminSessionToken()));

      return res.status(200).json({
        data: {
          authenticated: true,
          expiresInSeconds: ONE_DAY_IN_SECONDS,
        },
      });
    }

    if (req.method === "DELETE") {
      res.setHeader("Set-Cookie", buildClearCookie());
      return res.status(200).json({ data: { authenticated: false } });
    }

    return sendMethodNotAllowed(res, ["GET", "POST", "DELETE"]);
  } catch (error) {
    return sendRouteError(res, error);
  }
}
