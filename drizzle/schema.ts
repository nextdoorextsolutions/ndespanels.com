import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * CRM Users table - team members with role-based access
 * Roles:
 * - owner: Full access - view, edit, delete everything, view edit history
 * - admin: View all jobs, edit everything, cannot delete
 * - team_lead: View own jobs + jobs of team members assigned to them
 * - sales_rep: View and edit only their own assigned jobs, no delete
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // CRM roles: owner, admin, team_lead, sales_rep
  role: mysqlEnum("role", ["user", "admin", "owner", "office", "sales_rep", "project_manager", "team_lead"]).default("user").notNull(),
  // Sales rep specific fields
  repCode: varchar("repCode", { length: 20 }), // e.g., "MJS26" - their promo code suffix
  // Team assignment - for team_lead to manage their team members
  teamLeadId: int("teamLeadId"), // FK to users.id - who is this user's team lead
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
  
  // Pipeline status - new workflow (includes legacy values for migration)
  status: mysqlEnum("status", [
    // New pipeline stages
    "lead",
    "appointment_set",
    "prospect",
    "approved",
    "project_scheduled",
    "completed",
    "invoiced",
    "lien_legal",
    "closed_deal",
    "closed_lost",
    // Legacy values (for migration compatibility)
    "pending",
    "new_lead",
    "contacted",
    "inspection_scheduled",
    "inspection_complete",
    "report_sent",
    "follow_up",
    "closed_won",
    "cancelled"
  ]).default("lead").notNull(),
  
  // Deal type - determines payment method
  dealType: mysqlEnum("dealType", [
    "insurance",
    "cash",
    "financed"
  ]),
  
  // Lien rights tracking (90-day window from completion)
  projectCompletedAt: timestamp("projectCompletedAt"), // When project was marked completed
  lienRightsStatus: mysqlEnum("lienRightsStatus", [
    "not_applicable", // Not yet completed
    "active",         // 0-60 days - safe
    "warning",        // 61-75 days - getting close
    "critical",       // 76-89 days - urgent
    "expired",        // 90+ days - rights lost
    "legal"           // Moved to lien legal
  ]).default("not_applicable"),
  lienRightsExpiresAt: timestamp("lienRightsExpiresAt"), // 90 days from projectCompletedAt
  lastLienRightsNotification: timestamp("lastLienRightsNotification"), // For weekly updates
  
  // Legacy status for payment tracking
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded"]).default("pending").notNull(),
  
  // Priority and notes
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  internalNotes: text("internalNotes"),
  
  // Customer-facing status message (shown in customer portal)
  customerStatusMessage: text("customerStatusMessage"),
  
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
    "photo_uploaded",
    "customer_message",
    "callback_requested",
    "inspection_complete"
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

/**
 * Edit History - tracks all edits made to leads/jobs for audit trail
 * Only visible to Owners and Admins
 */
export const editHistory = mysqlTable("edit_history", {
  id: int("id").autoincrement().primaryKey(),
  reportRequestId: int("reportRequestId").notNull(), // FK to reportRequests.id
  userId: int("userId").notNull(), // FK to users.id (who made the edit)
  
  // What was changed
  fieldName: varchar("fieldName", { length: 100 }).notNull(), // e.g., "fullName", "status", "email"
  oldValue: text("oldValue"), // Previous value (null if new)
  newValue: text("newValue"), // New value
  
  // Edit type
  editType: mysqlEnum("editType", [
    "create",
    "update",
    "delete",
    "assign",
    "status_change"
  ]).default("update").notNull(),
  
  // Additional context
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: varchar("userAgent", { length: 500 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditHistory = typeof editHistory.$inferSelect;
export type InsertEditHistory = typeof editHistory.$inferInsert;
