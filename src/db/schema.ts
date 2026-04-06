import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["viewer", "analyst", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);
export const recordTypeEnum = pgEnum("record_type", ["income", "expense"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    role: userRoleEnum("role").default("viewer").notNull(),
    status: userStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
  }),
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull().unique(),
    kind: recordTypeEnum("kind").notNull(),
    color: varchar("color", { length: 20 }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    categoryKindIdx: index("categories_kind_idx").on(table.kind),
  }),
);

export const financialRecords = pgTable(
  "financial_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    type: recordTypeEnum("type").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    notes: text("notes"),
    description: varchar("description", { length: 255 }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    recordTypeIdx: index("financial_records_type_idx").on(table.type),
    recordCategoryIdx: index("financial_records_category_idx").on(table.categoryId),
    recordDateIdx: index("financial_records_date_idx").on(table.transactionDate),
    recordDeletedIdx: index("financial_records_deleted_idx").on(table.isDeleted),
    recordCreatorIdx: index("financial_records_creator_idx").on(table.createdByUserId),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    entity: varchar("entity", { length: 80 }).notNull(),
    entityId: varchar("entity_id", { length: 80 }).notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    auditEntityIdx: index("audit_logs_entity_idx").on(table.entity, table.entityId),
    auditActorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
  }),
);

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type RecordType = (typeof recordTypeEnum.enumValues)[number];
