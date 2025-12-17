/**
 * LEGACY MONOLITHIC ROUTER FILE
 * 
 * This file is being gradually refactored into domain-specific routers.
 * New routers are in server/api/routers/
 * 
 * Refactored:
 * - auth -> server/api/routers/auth.ts
 * - solar -> server/api/routers/solar.ts
 * - jobs (crm) -> server/api/routers/jobs.ts
 * 
 * TODO: Extract Portal router
 */
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, ownerOfficeProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Import refactored routers
import { authRouter } from "./api/routers/auth";
import { solarRouter } from "./api/routers/solar";
import { reportRouter } from "./api/routers/report";
import { proposalsRouter } from "./api/routers/proposals";
import { materialsRouter } from "./api/routers/materials";
import { usersRouter } from "./api/routers/users";
import { activitiesRouter } from "./api/routers/activities";
import { documentsRouter } from "./api/routers/documents";
import { jobsRouter } from "./api/routers/jobs";
import { portalRouter } from "./api/routers/portal";
import { productsRouter } from "./api/routers/products";
import { aiRouter } from "./api/routers/ai";
import { invoicesRouter } from "./api/routers/invoices";
import { messagingRouter } from "./api/routers/messaging";
import { estimatesRouter } from "./api/routers/estimates";
import { utilityRouter } from "./api/routers/utility";
import { analyticsRouter } from "./api/routers/analytics";
import { commissionsRouter } from "./api/routers/commissions";
import { leadsRouter } from "./api/routers/leads";
import { eventsRouter } from "./api/routers/events";
import { getDb } from "./db";
import { reportRequests, users, activities, documents, editHistory, jobAttachments, jobMessageReads, notifications, materialOrders, materialKits } from "../drizzle/schema";
import { PRODUCTS, validatePromoCode } from "./products";
import { notifyOwner } from "./_core/notification";
import { sendSMSNotification } from "./sms";
import { sendWelcomeEmail } from "./email";
import { sendLienRightsAlertNotification, getLienRightsAlertJobs } from "./lienRightsNotification";


import { eq, desc, and, or, like, sql, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { storagePut, storageGet, STORAGE_BUCKET } from "./storage";
import { supabaseAdmin } from "./lib/supabase";
import { extractExifMetadata } from "./lib/exif";
import * as solarApi from "./lib/solarApi";
import { fetchEstimatorLeads, parseEstimatorAddress, formatEstimateData } from "./lib/estimatorApi";
import { calculateMaterialOrder, generateBeaconCSV, generateOrderNumber } from "./lib/materialCalculator";
import { MATERIAL_DEFAULTS } from "./lib/materialConstants";
import { generateMaterialOrderPDF } from "./lib/materialOrderPDF";
import { 
  normalizeRole, 
  isOwner, 
  isAdmin, 
  isTeamLead, 
  isSalesRep,
  canViewJob,
  canEditJob,
  canDeleteJob,
  canViewEditHistory,
  canManageTeam,
  getRoleDisplayName
} from "./lib/rbac";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter, // Refactored to server/api/routers/auth.ts
  solar: solarRouter, // Refactored to server/api/routers/solar.ts
  report: reportRouter, // Refactored to server/api/routers/report.ts
  proposals: proposalsRouter, // Refactored to server/api/routers/proposals.ts
  materials: materialsRouter, // Refactored to server/api/routers/materials.ts
  users: usersRouter, // Refactored to server/api/routers/users.ts
  activities: activitiesRouter, // Refactored to server/api/routers/activities.ts
  documents: documentsRouter, // Refactored to server/api/routers/documents.ts
  products: productsRouter, // Refactored to server/api/routers/products.ts
  ai: aiRouter, // Refactored to server/api/routers/ai.ts
  invoices: invoicesRouter, // Refactored to server/api/routers/invoices.ts
  messaging: messagingRouter, // Unified messaging - channels, DMs, and AI chat
  estimates: estimatesRouter, // Refactored to server/api/routers/estimates.ts
  utility: utilityRouter, // System utilities - error reporting, etc.
  analytics: analyticsRouter, // Team performance & production dashboard metrics
  commissions: commissionsRouter, // Commission requests and bonus tracking
  leads: leadsRouter, // CSV import and lead management
  events: eventsRouter, // Calendar events with type support
  
  // CRM router - core job/lead operations, analytics, scheduling
  // (Semantically this is "jobs" but kept as "crm" for frontend compatibility)
  crm: jobsRouter, // Refactored to server/api/routers/jobs.ts

  // Customer portal - public job lookup, messages, callbacks
  portal: portalRouter, // Refactored to server/api/routers/portal.ts
});

export type AppRouter = typeof appRouter;
