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
import { globalChatRouter } from "./api/routers/globalChat";
import { chatRouter } from "./api/routers/chat";
import { teamChatRouter } from "./api/routers/teamChat";
import { estimatesRouter } from "./api/routers/estimates";
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




// CRM Role check helper
const CRM_ROLES = ["owner", "admin", "office", "sales_rep", "project_manager", "team_lead"];

// Helper to log edit history
async function logEditHistory(
  db: any,
  reportRequestId: number,
  userId: number,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null,
  editType: "create" | "update" | "delete" | "assign" | "status_change" = "update",
  ctx?: any
) {
  await db.insert(editHistory).values({
    reportRequestId,
    userId,
    fieldName,
    oldValue,
    newValue,
    editType,
    ipAddress: ctx?.req?.ip || ctx?.req?.headers?.["x-forwarded-for"] || null,
    userAgent: ctx?.req?.headers?.["user-agent"]?.substring(0, 500) || null,
  });
}

// Helper to get team member IDs for a team lead
async function getTeamMemberIds(db: any, teamLeadId: number): Promise<number[]> {
  const members = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.teamLeadId, teamLeadId));
  return members.map((m: any) => m.id);
}

// Helper to filter leads based on user role
async function filterLeadsByRole(db: any, user: any, leads: any[]): Promise<any[]> {
  if (!user) return [];
  
  const role = normalizeRole(user.role);
  
  // Owners and Admins see everything
  if (role === "owner" || role === "admin") {
    return leads;
  }
  
  // Team leads see their own + team members' leads
  if (role === "team_lead") {
    const teamMemberIds = await getTeamMemberIds(db, user.id);
    return leads.filter(lead => 
      lead.assignedTo === user.id || 
      (lead.assignedTo && teamMemberIds.includes(lead.assignedTo))
    );
  }
  
  // Sales reps only see their assigned leads
  if (role === "sales_rep") {
    return leads.filter(lead => lead.assignedTo === user.id);
  }
  
  return [];
}

// Helper function to detect @mentions in text
// Format: @[userId:userName] or @userName
function detectMentions(text: string): number[] {
  const mentionRegex = /@\[(\d+):[^\]]+\]/g;
  const matches = Array.from(text.matchAll(mentionRegex));
  const userIds: number[] = [];
  
  for (const match of matches) {
    const userId = parseInt(match[1]);
    if (!isNaN(userId) && !userIds.includes(userId)) {
      userIds.push(userId);
    }
  }
  
  return userIds;
}

// Helper function to create mention notifications
async function createMentionNotifications(
  db: any,
  mentionedUserIds: number[],
  createdBy: number,
  resourceId: number,
  content: string
) {
  if (mentionedUserIds.length === 0) return;
  
  const notificationRecords = mentionedUserIds.map(userId => ({
    userId,
    createdBy,
    resourceId,
    type: "mention" as const,
    content: content.substring(0, 200), // Truncate for preview
    isRead: false,
  }));
  
  await db.insert(notifications).values(notificationRecords);
}

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
  globalChat: globalChatRouter, // Refactored to server/api/routers/globalChat.ts
  chat: chatRouter, // Real team messaging - server/api/routers/chat.ts
  teamChat: teamChatRouter, // Channel-based team chat - server/api/routers/teamChat.ts
  estimates: estimatesRouter, // Refactored to server/api/routers/estimates.ts
  
  // CRM router - core job/lead operations, analytics, scheduling
  // (Semantically this is "jobs" but kept as "crm" for frontend compatibility)
  crm: jobsRouter, // Refactored to server/api/routers/jobs.ts

  // Customer portal - public job lookup, messages, callbacks
  portal: portalRouter, // Refactored to server/api/routers/portal.ts
});

export type AppRouter = typeof appRouter;
