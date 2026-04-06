import { ApiError } from "@/src/lib/auth";
import type { RecordType, UserRole, UserStatus } from "@/src/db/schema";

const userRoles = new Set<UserRole>(["viewer", "analyst", "admin"]);
const userStatuses = new Set<UserStatus>(["active", "inactive"]);
const recordTypes = new Set<RecordType>(["income", "expense"]);

export function asNonEmptyString(
  value: unknown,
  field: string,
  maxLength?: number,
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${field} is required.`);
  }

  const normalized = value.trim();

  if (maxLength && normalized.length > maxLength) {
    throw new ApiError(400, `${field} must be ${maxLength} characters or less.`);
  }

  return normalized;
}

export function asOptionalString(
  value: unknown,
  field: string,
  maxLength?: number,
) {
  if (value == null || value === "") return undefined;
  return asNonEmptyString(value, field, maxLength);
}

export function asPositiveAmount(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "amount must be a positive number.");
  }

  return amount.toFixed(2);
}

export function asDateString(value: unknown, field: string) {
  if (typeof value !== "string") {
    throw new ApiError(400, `${field} must be a valid ISO date string.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `${field} must be a valid ISO date string.`);
  }

  return parsed.toISOString();
}

export function asUserRole(value: unknown) {
  if (typeof value !== "string" || !userRoles.has(value as UserRole)) {
    throw new ApiError(400, "role must be viewer, analyst, or admin.");
  }

  return value as UserRole;
}

export function asUserStatus(value: unknown) {
  if (typeof value !== "string" || !userStatuses.has(value as UserStatus)) {
    throw new ApiError(400, "status must be active or inactive.");
  }

  return value as UserStatus;
}

export function asRecordType(value: unknown) {
  if (typeof value !== "string" || !recordTypes.has(value as RecordType)) {
    throw new ApiError(400, "type must be income or expense.");
  }

  return value as RecordType;
}
