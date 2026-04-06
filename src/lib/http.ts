import { NextResponse } from "next/server";

import { ApiError } from "@/src/lib/auth";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error.";

  return NextResponse.json({ error: message }, { status: 500 });
}
