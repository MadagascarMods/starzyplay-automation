import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela para armazenar contas criadas no StarzyPlay
 */
export const createdAccounts = mysqlTable("created_accounts", {
  id: int("id").autoincrement().primaryKey(),
  referenceCode: varchar("referenceCode", { length: 10 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  password: varchar("password", { length: 100 }).notNull(),
  age: int("age").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  inviteCodeUsed: varchar("inviteCodeUsed", { length: 10 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  loginSuccess: boolean("loginSuccess").default(false).notNull(),
  codeApplied: boolean("codeApplied").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreatedAccount = typeof createdAccounts.$inferSelect;
export type InsertCreatedAccount = typeof createdAccounts.$inferInsert;

/**
 * Tabela para armazenar logs de operações
 */
export const operationLogs = mysqlTable("operation_logs", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["info", "success", "error", "warning"]).default("info").notNull(),
  operation: varchar("operation", { length: 50 }).notNull(),
  message: text("message").notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = typeof operationLogs.$inferInsert;

/**
 * Tabela para armazenar estatísticas
 */
export const statistics = mysqlTable("statistics", {
  id: int("id").autoincrement().primaryKey(),
  accountsCreated: int("accountsCreated").default(0).notNull(),
  codesAppliedSuccess: int("codesAppliedSuccess").default(0).notNull(),
  codesAppliedFailed: int("codesAppliedFailed").default(0).notNull(),
  codesAlreadyUsed: int("codesAlreadyUsed").default(0).notNull(),
  starsEarned: int("starsEarned").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Statistics = typeof statistics.$inferSelect;
export type InsertStatistics = typeof statistics.$inferInsert;
