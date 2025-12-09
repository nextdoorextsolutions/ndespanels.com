import { pgTable, serial, text, varchar, boolean, timestamp, integer, pgEnum, doublePrecision, jsonb, numeric } from "drizzle-orm/pg-core";

// PostgreSQL enums
export const roleEnum = pgEnum("role", ["user", "admin", "owner", "office", "sales_rep", "project_manager", "team_lead", "field_crew"]);

export const statusEnum = pgEnum("status", [
  "lead",
  "appointment_set",
  "prospect",
  "approved",
  "project_scheduled",
  "completed",
  "invoiced",
  "lien_legal",
  "closed_deal",
  "closed_lost"
]);

export const dealTypeEnum = pgEnum("deal_type", ["insurance", "cash", "financed"]);

export const lienRightsStatusEnum = pgEnum("lien_rights_status", [
  "not_applicable",
  "active",
  "warning",
  "critical",
  "expired",
  "legal"
]);

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "refunded"]);

export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);

export const priceStatusEnum = pgEnum("price_status", ["draft", "pending_approval", "negotiation", "approved"]);

export const orderStatusEnum = pgEnum("order_status", ["draft", "pending", "sent", "confirmed", "delivered", "cancelled"]);

export const activityTypeEnum = pgEnum("activity_type", [
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
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "drone_photo",
  "inspection_photo",
  "report",
  "contract",
  "invoice",
  "other"
]);

export const editTypeEnum = pgEnum("edit_type", [
  "create",
  "update",
  "delete",
  "assign",
  "status_change"
]);

/**
 * CRM Users table - team members with role-based access
 * Roles:
 * - owner: Full access - view, edit, delete everything, view edit history
 * - admin: View all jobs, edit everything, cannot delete (Office Staff)
 * - field_crew: View scope of work and upload photos only (Laborers)
 * - team_lead: View own jobs + jobs of team members assigned to them
 * - sales_rep: View and edit only their own assigned jobs, no delete
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  repCode: varchar("rep_code", { length: 20 }),
  teamLeadId: integer("team_lead_id"),
  password: varchar("password", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Report requests / Leads table - incoming storm documentation requests
 */
export const reportRequests = pgTable("report_requests", {
  id: serial("id").primaryKey(),
  
  // Customer info
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }), // Made optional
  phone: varchar("phone", { length: 50 }), // Made optional
  
  // Secondary contact info
  secondaryFirstName: varchar("secondary_first_name", { length: 100 }),
  secondaryLastName: varchar("secondary_last_name", { length: 100 }),
  secondaryPhone: varchar("secondary_phone", { length: 50 }),
  secondaryEmail: varchar("secondary_email", { length: 320 }),
  secondaryRelation: varchar("secondary_relation", { length: 50 }), // e.g., Spouse, Property Manager
  
  // Property info
  address: varchar("address", { length: 500 }).notNull(),
  cityStateZip: varchar("city_state_zip", { length: 255 }).notNull(),
  latitude: doublePrecision("latitude"), // Geocoded latitude for instant roof reports
  longitude: doublePrecision("longitude"), // Geocoded longitude for instant roof reports
  solarApiData: jsonb("solar_api_data"), // Google Solar API response (JSONB) - includes coverage flag
  estimatorData: jsonb("estimator_data"), // Imported estimate data from NextDoor Exterior Solutions estimator
  roofAge: varchar("roof_age", { length: 50 }),
  roofConcerns: text("roof_concerns"),
  handsOnInspection: boolean("hands_on_inspection").default(false).notNull(),
  
  // Site access info
  gateCode: varchar("gate_code", { length: 50 }),
  accessInstructions: text("access_instructions"),
  
  // Insurance info
  insuranceCarrier: varchar("insurance_carrier", { length: 200 }),
  policyNumber: varchar("policy_number", { length: 100 }),
  claimNumber: varchar("claim_number", { length: 100 }),
  deductible: numeric("deductible", { precision: 10, scale: 2 }),
  
  // Payment info
  promoCode: varchar("promo_code", { length: 50 }),
  promoApplied: boolean("promo_applied").default(false).notNull(),
  amountPaid: integer("amount_paid").default(0).notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),
  
  // CRM fields
  assignedTo: integer("assigned_to"),
  teamLeadId: integer("team_lead_id"),
  salesRepCode: varchar("sales_rep_code", { length: 50 }),
  leadSource: varchar("lead_source", { length: 100 }).default("website"),
  
  // Pipeline status
  status: statusEnum("status").default("lead").notNull(),
  
  // Deal type
  dealType: dealTypeEnum("deal_type"),
  
  // Lien rights tracking
  projectCompletedAt: timestamp("project_completed_at"),
  lienRightsStatus: lienRightsStatusEnum("lien_rights_status").default("not_applicable"),
  lienRightsExpiresAt: timestamp("lien_rights_expires_at"),
  lastLienRightsNotification: timestamp("last_lien_rights_notification"),
  
  // Payment tracking
  paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
  
  // Priority and notes
  priority: priorityEnum("priority").default("medium").notNull(),
  internalNotes: text("internal_notes"),
  
  // Customer-facing status message
  customerStatusMessage: text("customer_status_message"),
  
  // Scheduling
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  
  // Pricing & Proposal
  pricePerSq: numeric("price_per_sq", { precision: 10, scale: 2 }),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }),
  counterPrice: numeric("counter_price", { precision: 10, scale: 2 }),
  priceStatus: priceStatusEnum("price_status").default("draft"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ReportRequest = typeof reportRequests.$inferSelect;
export type InsertReportRequest = typeof reportRequests.$inferInsert;

/**
 * Activity log - tracks all actions on leads/jobs
 */
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  reportRequestId: integer("report_request_id").notNull(),
  userId: integer("user_id"),
  
  activityType: activityTypeEnum("activity_type").notNull(),
  
  description: text("description").notNull(),
  metadata: text("metadata"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

/**
 * Documents - files attached to leads/jobs
 */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  reportRequestId: integer("report_request_id").notNull(),
  uploadedBy: integer("uploaded_by"),
  
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  
  category: documentCategoryEnum("category").default("other").notNull(),
  
  // Photo metadata
  photoTakenAt: timestamp("photo_taken_at"),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  cameraModel: varchar("camera_model", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Edit History - tracks all edits made to leads/jobs for audit trail
 */
export const editHistory = pgTable("edit_history", {
  id: serial("id").primaryKey(),
  reportRequestId: integer("report_request_id").notNull(),
  userId: integer("user_id").notNull(),
  
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  
  editType: editTypeEnum("edit_type").default("update").notNull(),
  
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EditHistory = typeof editHistory.$inferSelect;
export type InsertEditHistory = typeof editHistory.$inferInsert;

/**
 * Job Attachments - files/images attached to notes and messages
 */
export const jobAttachments = pgTable("job_attachments", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  activityId: integer("activity_id"), // Optional link to specific note/message
  
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  
  uploadedBy: integer("uploaded_by"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type JobAttachment = typeof jobAttachments.$inferSelect;
export type InsertJobAttachment = typeof jobAttachments.$inferInsert;

/**
 * Job Message Reads - tracks when users last viewed messages for a job
 */
export const jobMessageReads = pgTable("job_message_reads", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  userId: integer("user_id").notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
});

export type JobMessageRead = typeof jobMessageReads.$inferSelect;
export type InsertJobMessageRead = typeof jobMessageReads.$inferInsert;

/**
 * Notifications - tracks user mentions and other notifications
 */
export const notificationTypeEnum = pgEnum("notification_type", ["mention", "assignment", "status_change"]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Who was tagged/notified
  createdBy: integer("created_by"), // Who created the notification
  resourceId: integer("resource_id").notNull(), // Job ID
  type: notificationTypeEnum("type").default("mention").notNull(),
  content: text("content"), // The message/note content
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Material Kits - Product coverage rules for material calculations
 */
export const materialKits = pgTable("material_kits", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Standard Laminate Shingle"
  manufacturer: varchar("manufacturer", { length: 100 }), // e.g., "GAF", "Owens Corning"
  productType: varchar("product_type", { length: 100 }).notNull(), // e.g., "shingle", "underlayment", "accessory"
  bundlesPerSquare: doublePrecision("bundles_per_square").default(3).notNull(),
  wasteFactor: doublePrecision("waste_factor").default(1.10).notNull(), // 1.10 = 10% waste
  starterCoverage: doublePrecision("starter_coverage"), // Linear ft per bundle
  hipRidgeCoverage: doublePrecision("hip_ridge_coverage"), // Linear ft per bundle
  beaconSku: varchar("beacon_sku", { length: 100 }), // Beacon product code
  unitOfMeasure: varchar("unit_of_measure", { length: 50 }).default("bundle").notNull(), // bundle, roll, piece, box
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MaterialKit = typeof materialKits.$inferSelect;
export type InsertMaterialKit = typeof materialKits.$inferInsert;

/**
 * Material Orders - Generated purchase orders for suppliers
 */
export const materialOrders = pgTable("material_orders", {
  id: serial("id").primaryKey(),
  reportRequestId: integer("report_request_id").notNull(), // Link to job
  orderNumber: varchar("order_number", { length: 50 }), // Generated order number
  status: orderStatusEnum("status").default("draft").notNull(),
  supplierName: varchar("supplier_name", { length: 255 }).default("Beacon Building Products").notNull(),
  supplierEmail: varchar("supplier_email", { length: 320 }),
  shingleColor: varchar("shingle_color", { length: 100 }),
  materialSystem: varchar("material_system", { length: 100 }), // GAF, OC, etc.
  deliveryDate: timestamp("delivery_date"),
  lineItems: jsonb("line_items").notNull(), // Array of {productName, quantity, unit, beaconSku}
  accessories: jsonb("accessories"), // Manual items like pipe boots, vents
  totalSquares: doublePrecision("total_squares"),
  notes: text("notes"),
  pdfUrl: varchar("pdf_url", { length: 500 }), // Link to generated PDF
  csvUrl: varchar("csv_url", { length: 500 }), // Link to generated CSV
  createdBy: integer("created_by"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MaterialOrder = typeof materialOrders.$inferSelect;
export type InsertMaterialOrder = typeof materialOrders.$inferInsert;
