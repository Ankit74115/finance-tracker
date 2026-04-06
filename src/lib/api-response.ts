import type { NextApiResponse } from "next";

import { ApiError } from "@/src/lib/auth";

export function sendMethodNotAllowed(
  res: NextApiResponse,
  allowedMethods: string[],
) {
  res.setHeader("Allow", allowedMethods.join(", "));
  return res.status(405).json({ error: "Method not allowed." });
}

export function sendRouteError(res: NextApiResponse, error: unknown) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message });
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error.";

  return res.status(500).json({ error: message });
}
