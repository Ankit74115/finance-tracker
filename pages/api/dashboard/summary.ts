import type { NextApiRequest, NextApiResponse } from "next";

import { assertRole, getActorFromHeaders } from "@/src/lib/auth";
import { getDashboardSummary } from "@/src/lib/finance";
import { sendMethodNotAllowed, sendRouteError } from "@/src/lib/api-response";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method !== "GET") {
      return sendMethodNotAllowed(res, ["GET"]);
    }

    const actor = await getActorFromHeaders(req.headers);
    assertRole(actor, ["viewer", "analyst", "admin"]);

    const data = await getDashboardSummary();

    return res.status(200).json({ data });
  } catch (error) {
    return sendRouteError(res, error);
  }
}
