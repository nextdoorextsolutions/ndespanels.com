import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * CRM Users table - team members with role-based access
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // CRM roles: owner, office, sales_rep, project_manager
  role: mysqlEnum("role", ["user", "admin", "owner", "office", "sales_rep", "project_manager"]).default("user").notNull(),
  // Sales rep specific fields
  repCode: varchar("repCode", { length: 20 }), // e.g., "MJS26" - their promo code suffix
  isActive: boolean("isActive").default(true).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Report requests / Leads table - incoming storm documentation requests
 */
export const reportRequests = mysqlTable("report_requests", {
  id: int("id").autoincrement().primaryKey(),
  
  // Customer info
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  
  // Property info
  address: varchar("address", { length: 500 }).notNull(),
  cityStateZip: varchar("cityStateZip", { length: 255 }).notNull(),
  roofAge: varchar("roofAge", { length: 50 }),
  roofConcerns: text("roofConcerns"),
  handsOnInspection: boolean("handsOnInspection").default(false).notNull(),
  
  // Payment info
  promoCode: varchar("promoCode", { length: 50 }),
  promoApplied: boolean("promoApplied").default(false).notNull(),
  amountPaid: int("amountPaid").default(0).notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
  
  // CRM fields
  assignedTo: int("assignedTo"), // FK to users.id (sales rep)
  salesRepCode: varchar("salesRepCode", { length: 50 }), // Attribution from promo code
  leadSource: varchar("leadSource", { length: 100 }).default("website"), // website, referral, door_hanger, etc.
  
  // Pipeline status
  status: mysqlEnum("status", [
    "pending",
    "new_lead",
    "contacted",
    "appointment_set",
    "inspection_scheduled",
    "inspection_complete",
    "report_sent",
    "follow_up",
    "closed_won",
    "closed_lost",
    "cancelled"
  ]).default("new_lead").notNull(),
  
  // Legacy status for payment tracking
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded"]).default("pending").notNull(),
  
  // Priority and notes
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  internalNotes: text("internalNotes"),
  
  // Scheduling
  scheduledDate: timestamp("scheduledDate"),
  completedDate: timestamp("completedDate"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportRequest = typeof reportRequests.$inferSelect;
export type InsertReportRequest = typeof reportRequests.$inferInsert;

/**
 * Activity log - tracks all actions on leads/jobs
 */
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  reportRequestId: int("reportRequestId").notNull(), // FK to reportRequests.id
  userId: int("userId"), // FK to users.id (who performed the action)
  
  activityType: mysqlEnum("activityType", [
    "status_change",
    "note_added",
    "call_logged",
    "email_sent",
    "sms_sent",
    "appointment_scheduled",
    "document_uploaded",
    "payment_received",
    "assigned",
    "created",
    "message",
    "photo_uploaded"
  ]).notNull(),
  
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON string for additional data
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

/**
 * Documents - files attached to leads/jobs
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  reportRequestId: int("reportRequestId").notNull(),
  uploadedBy: int("uploadedBy"), // FK to users.id
  
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileType: varchar("fileType", { length: 100 }),
  fileSize: int("fileSize"), // in bytes
  
  category: mysqlEnum("category", [
    "drone_photo",
    "inspection_photo",
    "report",
    "contract",
    "invoice",
    "other"
  ]).default("other").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
