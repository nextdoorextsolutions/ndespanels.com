import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Report requests table - stores storm documentation report requests
 */
export const reportRequests = mysqlTable("report_requests", {
  id: int("id").autoincrement().primaryKey(),
  
  // Customer info (not requiring login)
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  
  // Property info
  address: varchar("address", { length: 500 }).notNull(),
  cityStateZip: varchar("cityStateZip", { length: 255 }).notNull(),
  roofAge: varchar("roofAge", { length: 50 }),
  roofConcerns: text("roofConcerns"), // Customer notes about specific issues
  handsOnInspection: boolean("handsOnInspection").default(false).notNull(), // Request in-person tech inspection
  
  // Payment info
  promoCode: varchar("promoCode", { length: 50 }),
  promoApplied: boolean("promoApplied").default(false).notNull(),
  amountPaid: int("amountPaid").default(0).notNull(), // in cents
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
  
  // Status
  status: mysqlEnum("status", ["pending", "paid", "scheduled", "completed", "cancelled"]).default("pending").notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportRequest = typeof reportRequests.$inferSelect;
export type InsertReportRequest = typeof reportRequests.$inferInsert;
