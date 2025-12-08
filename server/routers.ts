// @ts-nocheck
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { reportRequests, users, activities, documents, editHistory, jobAttachments, jobMessageReads, notifications } from "../drizzle/schema";
import { PRODUCTS, validatePromoCode } from "./products";
import { notifyOwner } from "./_core/notification";
import { sendSMSNotification } from "./sms";
import { sendWelcomeEmail } from "./email";
import { sendLienRightsAlertNotification, getLienRightsAlertJobs } from "./lienRightsNotification";


import { eq, desc, and, or, like, sql, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { storagePut, storageGet, STORAGE_BUCKET } from "./storage";
import { supabaseAdmin } from "./lib/supabase";
import { extractExifMetadata } from "./lib/exif";
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
  const matches = text.matchAll(mentionRegex);
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
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // Sync Supabase Auth user to CRM users table
    syncSupabaseUser: publicProcedure
      .input(z.object({
        supabaseUserId: z.string(),
        email: z.string(),
        name: z.string().optional(),
        role: z.string().optional(),
        repCode: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log(`[Sync] Attempting sync for: ${input.email}`);
        
        try {
          const db = await getDb();
          if (!db) {
            console.error('[Sync] Database not available');
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
          }
          
          // 1. Check if it's the very first user (Owner logic)
          const allUsers = await db.select({ id: users.id }).from(users).limit(1);
          const isFirstUser = allUsers.length === 0;
          
          // 2. Determine Role
          let targetRole = input.role || 'user';
          if (isFirstUser) targetRole = 'owner';
          
          // 3. UPSERT (Insert or Update if Email exists)
          const [result] = await db
            .insert(users)
            .values({
              openId: input.supabaseUserId,
              email: input.email,
              name: input.name || input.email.split('@')[0],
              role: targetRole as any,
              isActive: true,
              lastSignedIn: new Date(),
              repCode: input.repCode || null,
            })
            .onConflictDoUpdate({
              target: users.email,
              set: {
                openId: input.supabaseUserId,
                lastSignedIn: new Date(),
              },
            })
            .returning();
          
          console.log(`[Sync] Successfully synced user: ${result.email} (Role: ${result.role})`);
          
          // Set session cookie
          const { sdk } = await import("./_core/sdk");
          const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
          const sessionToken = await sdk.createSessionToken(input.supabaseUserId, {
            name: result.name || input.name || "",
            expiresInMs: ONE_YEAR_MS,
          });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          
          return { 
            success: true, 
            user: { id: result.id, name: result.name, role: result.role, email: result.email },
            isNewUser: isFirstUser,
            isOwner: result.role === 'owner',
            sessionToken, // Return token for cross-origin auth via Authorization header
          };
        } catch (error: any) {
          console.error('❌ CRITICAL ERROR in syncSupabaseUser:');
          console.error('Message:', error.message);
          console.error('Code:', error.code);
          console.error('Detail:', error.detail);
          
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Sync failed: ${error.message}`,
            cause: error,
          });
        }
      }),
    loginWithPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Find user by email
        const [user] = await db.select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);
        
        if (!user) {
          throw new Error("Invalid email or password");
        }
        
        if (!user.password) {
          throw new Error("Password not set. Contact your administrator.");
        }
        
        if (!user.isActive) {
          throw new Error("Account is deactivated. Contact your administrator.");
        }
        
        // Simple password comparison (in production, use bcrypt)
        // For now, we'll do a simple comparison since passwords are stored as plain text during account creation
        const crypto = await import("crypto");
        const hashedInput = crypto.createHash("sha256").update(input.password).digest("hex");
        
        if (user.password !== hashedInput && user.password !== input.password) {
          throw new Error("Invalid email or password");
        }
        
        // Update last signed in
        await db.update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, user.id));
        
        // Set session cookie using SDK
        const { sdk } = await import("./_core/sdk");
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
        return { success: true, user: { id: user.id, name: user.name, role: user.role } };
      }),
  }),

  // Report request procedures (public landing page)
  report: router({
    validatePromo: publicProcedure
      .input(z.object({ code: z.string() }))
      .mutation(({ input }) => {
        const result = validatePromoCode(input.code);
        return result;
      }),

    submit: publicProcedure
      .input(z.object({
        fullName: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(10),
        address: z.string().min(5),
        cityStateZip: z.string().min(5),
        roofAge: z.string().optional(),
        roofConcerns: z.string().optional(),
        handsOnInspection: z.boolean().optional(),
        promoCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const promoResult = input.promoCode ? validatePromoCode(input.promoCode) : { valid: false, discountPercent: 0, salesRep: undefined };
        const isFree = promoResult.valid && promoResult.discountPercent === 100;
        const salesRepAttribution = promoResult.salesRep || "Direct/No Code";
        const handsOnText = input.handsOnInspection ? "✅ YES - Requested" : "No";
        const concernsText = input.roofConcerns?.trim() || "None specified";

        

         // Landing page/inspection submissions disabled - client portal only  
        // Return a disabled response instead of throwing to maintain type safety
        return { success: false, requiresPayment: false, checkoutUrl: null, requestId: null, error: "Storm report submissions are not available. Please contact us directly." };
      }),
  }),

  // CRM procedures (protected - requires login)
  crm: router({
    // Get current user's role and permissions
    getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user;
      if (!user) return null;
      
      const role = normalizeRole(user.role);
      return {
        role,
        roleDisplayName: getRoleDisplayName(user.role),
        canViewAll: role === "owner" || role === "admin",
        canEditAll: role === "owner" || role === "admin",
        canDelete: role === "owner",
        canViewEditHistory: role === "owner" || role === "admin",
        canManageTeam: role === "owner",
        isTeamLead: role === "team_lead",
        isSalesRep: role === "sales_rep",
      };
    }),

    // Dashboard stats (filtered by role)
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const user = ctx.user;
      const role = normalizeRole(user?.role || "user");
      
      // Build base conditions based on role
      let roleConditions: any[] = [];
      
      if (role === "sales_rep" && user) {
        roleConditions.push(eq(reportRequests.assignedTo, user.id));
      } else if (role === "team_lead" && user) {
        const teamMemberIds = await getTeamMemberIds(db, user.id);
        if (teamMemberIds.length > 0) {
          roleConditions.push(
            or(
              eq(reportRequests.assignedTo, user.id),
              inArray(reportRequests.assignedTo, teamMemberIds)
            )
          );
        } else {
          roleConditions.push(eq(reportRequests.assignedTo, user.id));
        }
      }
      // Owners and Admins see everything - no conditions

      const whereClause = roleConditions.length > 0 ? and(...roleConditions) : undefined;

      // Pipeline stage counts
      const [totalLeads] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause);
      const [leadCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "lead")) : eq(reportRequests.status, "lead"));
      const [appointmentSetCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "appointment_set")) : eq(reportRequests.status, "appointment_set"));
      const [prospectCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "prospect")) : eq(reportRequests.status, "prospect"));
      const [approvedCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "approved")) : eq(reportRequests.status, "approved"));
      const [projectScheduledCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "project_scheduled")) : eq(reportRequests.status, "project_scheduled"));
      const [completedCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "completed")) : eq(reportRequests.status, "completed"));
      const [invoicedCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "invoiced")) : eq(reportRequests.status, "invoiced"));
      const [lienLegalCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "lien_legal")) : eq(reportRequests.status, "lien_legal"));
      const [closedDealCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "closed_deal")) : eq(reportRequests.status, "closed_deal"));
      const [closedLostCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "closed_lost")) : eq(reportRequests.status, "closed_lost"));
      
      // Deal type counts
      const [insuranceCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.dealType, "insurance")) : eq(reportRequests.dealType, "insurance"));
      const [cashCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.dealType, "cash")) : eq(reportRequests.dealType, "cash"));
      const [financedCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.dealType, "financed")) : eq(reportRequests.dealType, "financed"));
      
      // Lien rights urgency counts
      const [lienActiveCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.lienRightsStatus, "active")) : eq(reportRequests.lienRightsStatus, "active"));
      const [lienWarningCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.lienRightsStatus, "warning")) : eq(reportRequests.lienRightsStatus, "warning"));
      const [lienCriticalCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.lienRightsStatus, "critical")) : eq(reportRequests.lienRightsStatus, "critical"));
      const [lienExpiredCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.lienRightsStatus, "expired")) : eq(reportRequests.lienRightsStatus, "expired"));
      
      const [totalRevenue] = await db.select({ sum: sql<number>`COALESCE(SUM(amount_paid), 0)` })
        .from(reportRequests)
        .where(whereClause);

      return {
        totalLeads: totalLeads?.count || 0,
        // Pipeline stages
        leadCount: leadCount?.count || 0,
        appointmentSetCount: appointmentSetCount?.count || 0,
        prospectCount: prospectCount?.count || 0,
        approvedCount: approvedCount?.count || 0,
        projectScheduledCount: projectScheduledCount?.count || 0,
        completedCount: completedCount?.count || 0,
        invoicedCount: invoicedCount?.count || 0,
        lienLegalCount: lienLegalCount?.count || 0,
        closedDealCount: closedDealCount?.count || 0,
        closedLostCount: closedLostCount?.count || 0,
        // Deal types
        insuranceCount: insuranceCount?.count || 0,
        cashCount: cashCount?.count || 0,
        financedCount: financedCount?.count || 0,
        // Lien rights
        lienActiveCount: lienActiveCount?.count || 0,
        lienWarningCount: lienWarningCount?.count || 0,
        lienCriticalCount: lienCriticalCount?.count || 0,
        lienExpiredCount: lienExpiredCount?.count || 0,
        // Revenue
        totalRevenue: (totalRevenue?.sum || 0) / 100,
      };
    }),

    // Get all leads with filtering (role-based)
    getLeads: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        assignedTo: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional())
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let leads = await db.select().from(reportRequests).orderBy(desc(reportRequests.createdAt));
        
        // Filter by role
        leads = await filterLeadsByRole(db, ctx.user, leads);

        return leads.slice(input?.offset || 0, (input?.offset || 0) + (input?.limit || 50));
      }),

    // Get single lead by ID (with permission check)
    getLead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.id));
        if (!lead) throw new Error("Lead not found");

        // Check permission
        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canViewJob(user, lead, teamMemberIds)) {
          throw new Error("You don't have permission to view this job");
        }

        const leadActivities = await db.select().from(activities)
          .where(eq(activities.reportRequestId, input.id))
          .orderBy(desc(activities.createdAt));

        const leadDocuments = await db.select().from(documents)
          .where(eq(documents.reportRequestId, input.id))
          .orderBy(desc(documents.createdAt));

        return { ...lead, activities: leadActivities, documents: leadDocuments };
      }),

    // Create a new job/lead from CRM
    createJob: protectedProcedure
      .input(z.object({
        fullName: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(10),
        address: z.string().min(5),
        cityStateZip: z.string().min(5),
        roofAge: z.string().optional(),
        roofConcerns: z.string().optional(),
        dealType: z.enum(["insurance", "cash", "financed"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only owners and admins can create jobs
        if (!isOwner(ctx.user) && !isAdmin(ctx.user)) {
          throw new Error("Only owners and admins can create new jobs");
        }

        const [result] = await db.insert(reportRequests).values({
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          cityStateZip: input.cityStateZip,
          roofAge: input.roofAge || null,
          roofConcerns: input.roofConcerns || null,
          dealType: input.dealType || "cash",
          status: "lead",
          priority: "medium" as const,
          handsOnInspection: false,
          amountPaid: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning({ id: reportRequests.id });

        const newJobId = result.id;
        const [newJob] = await db.select().from(reportRequests).where(eq(reportRequests.id, newJobId));

        // Create dedicated folder in Supabase Storage for this job
        try {
          const folderPath = `jobs/${newJobId}/.folder`;
          await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .upload(folderPath, new Uint8Array(0), {
              contentType: 'application/octet-stream',
              upsert: true,
            });
          console.log(`Created storage folder for job ${newJobId}`);
        } catch (folderError) {
          console.warn(`Failed to create storage folder for job ${newJobId}:`, folderError);
          // Don't fail the job creation if folder creation fails
        }

        // Log the creation in edit history
        await logEditHistory(
          db,
          newJob.id,
          ctx.user.id,
          "Job Created",
          null,
          `Created by ${ctx.user.name || ctx.user.email}`,
          "create",
          ctx
        );

        return newJob;
      }),

    // Update lead (with permission check and edit history)
    updateLead: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum([
          "lead", "appointment_set", "prospect", "approved", 
          "project_scheduled", "completed", "invoiced", 
          "lien_legal", "closed_deal", "closed_lost"
        ]).optional(),
        dealType: z.enum(["insurance", "cash", "financed"]).optional(),
        priority: z.string().optional(),
        assignedTo: z.number().optional(),
        teamLeadId: z.number().nullable().optional(),
        internalNotes: z.string().optional(),
        scheduledDate: z.string().optional(),
        customerStatusMessage: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get current lead data
        const [currentLead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.id));
        if (!currentLead) throw new Error("Lead not found");

        // Check permission
        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canEditJob(user, currentLead, teamMemberIds)) {
          throw new Error("You don't have permission to edit this job");
        }

        const updateData: Record<string, unknown> = {};
        
        // Log each field change to edit history
        if (input.status && input.status !== currentLead.status) {
          updateData.status = input.status;
          await logEditHistory(db, input.id, user!.id, "status", currentLead.status, input.status, "status_change", ctx);
          
          // Handle lien rights tracking when status changes to "completed"
          if (input.status === "completed" && currentLead.status !== "completed") {
            const completedAt = new Date();
            const expiresAt = new Date(completedAt);
            expiresAt.setDate(expiresAt.getDate() + 90); // 90 days from completion
            
            updateData.projectCompletedAt = completedAt;
            updateData.lienRightsExpiresAt = expiresAt;
            updateData.lienRightsStatus = "active";
            
            await logEditHistory(db, input.id, user!.id, "projectCompletedAt", null, completedAt.toISOString(), "update", ctx);
            await logEditHistory(db, input.id, user!.id, "lienRightsStatus", currentLead.lienRightsStatus || "not_applicable", "active", "update", ctx);
          }
          
          // Handle lien_legal status
          if (input.status === "lien_legal") {
            updateData.lienRightsStatus = "legal";
            await logEditHistory(db, input.id, user!.id, "lienRightsStatus", currentLead.lienRightsStatus || "not_applicable", "legal", "update", ctx);
          }
        }
        
        // Handle deal type changes
        if (input.dealType && input.dealType !== currentLead.dealType) {
          updateData.dealType = input.dealType;
          await logEditHistory(db, input.id, user!.id, "dealType", currentLead.dealType || "", input.dealType, "update", ctx);
        }
        
        if (input.priority && input.priority !== currentLead.priority) {
          updateData.priority = input.priority;
          await logEditHistory(db, input.id, user!.id, "priority", currentLead.priority, input.priority, "update", ctx);
        }
        if (input.assignedTo !== undefined && input.assignedTo !== currentLead.assignedTo) {
          updateData.assignedTo = input.assignedTo;
          await logEditHistory(db, input.id, user!.id, "assignedTo", String(currentLead.assignedTo || ""), String(input.assignedTo), "assign", ctx);
        }
        if (input.teamLeadId !== undefined && input.teamLeadId !== currentLead.teamLeadId) {
          updateData.teamLeadId = input.teamLeadId;
          await logEditHistory(db, input.id, user!.id, "teamLeadId", String(currentLead.teamLeadId || ""), String(input.teamLeadId || ""), "assign", ctx);
        }
        if (input.internalNotes !== undefined && input.internalNotes !== currentLead.internalNotes) {
          updateData.internalNotes = input.internalNotes;
          await logEditHistory(db, input.id, user!.id, "internalNotes", currentLead.internalNotes || "", input.internalNotes, "update", ctx);
        }
        if (input.scheduledDate) {
          updateData.scheduledDate = new Date(input.scheduledDate);
          await logEditHistory(db, input.id, user!.id, "scheduledDate", currentLead.scheduledDate?.toISOString() || "", input.scheduledDate, "update", ctx);
        }
        if (input.customerStatusMessage !== undefined && input.customerStatusMessage !== currentLead.customerStatusMessage) {
          updateData.customerStatusMessage = input.customerStatusMessage;
          await logEditHistory(db, input.id, user!.id, "customerStatusMessage", currentLead.customerStatusMessage || "", input.customerStatusMessage, "update", ctx);
        }

        if (Object.keys(updateData).length > 0) {
          await db.update(reportRequests).set(updateData).where(eq(reportRequests.id, input.id));
        }

        // Log activity
        if (input.status) {
          await db.insert(activities).values({
            reportRequestId: input.id,
            userId: ctx.user?.id,
            activityType: "status_change",
            description: `Status changed to ${input.status}`,
          });
        }

        return { success: true };
      }),

    // Update customer info (editable fields with edit history)
    updateCustomerInfo: protectedProcedure
      .input(z.object({
        id: z.number(),
        fullName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        cityStateZip: z.string().optional(),
        roofAge: z.string().optional(),
        roofConcerns: z.string().optional(),
        handsOnInspection: z.boolean().optional(),
        leadSource: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get current lead data
        const [currentLead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.id));
        if (!currentLead) throw new Error("Lead not found");

        // Check permission
        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canEditJob(user, currentLead, teamMemberIds)) {
          throw new Error("You don't have permission to edit this job");
        }

        const updateData: Record<string, unknown> = {};
        const fieldsToCheck = [
          { key: "fullName", current: currentLead.fullName, new: input.fullName },
          { key: "email", current: currentLead.email, new: input.email },
          { key: "phone", current: currentLead.phone, new: input.phone },
          { key: "address", current: currentLead.address, new: input.address },
          { key: "cityStateZip", current: currentLead.cityStateZip, new: input.cityStateZip },
          { key: "roofAge", current: currentLead.roofAge, new: input.roofAge },
          { key: "roofConcerns", current: currentLead.roofConcerns, new: input.roofConcerns },
          { key: "leadSource", current: currentLead.leadSource, new: input.leadSource },
        ];

        for (const field of fieldsToCheck) {
          if (field.new !== undefined && field.new !== field.current) {
            updateData[field.key] = field.new;
            await logEditHistory(db, input.id, user!.id, field.key, String(field.current || ""), String(field.new), "update", ctx);
          }
        }

        // Handle boolean field
        if (input.handsOnInspection !== undefined && input.handsOnInspection !== currentLead.handsOnInspection) {
          updateData.handsOnInspection = input.handsOnInspection;
          await logEditHistory(db, input.id, user!.id, "handsOnInspection", String(currentLead.handsOnInspection), String(input.handsOnInspection), "update", ctx);
        }

        if (Object.keys(updateData).length > 0) {
          await db.update(reportRequests).set(updateData).where(eq(reportRequests.id, input.id));
          
          // Log activity
          await db.insert(activities).values({
            reportRequestId: input.id,
            userId: ctx.user?.id,
            activityType: "note_added",
            description: `Customer info updated: ${Object.keys(updateData).join(", ")}`,
          });
        }

        return { success: true };
      }),

    // Delete lead (Owner only)
    deleteLead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only owners can delete
        if (!canDeleteJob(ctx.user)) {
          throw new Error("Only owners can delete jobs");
        }

        // Get lead info for logging
        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.id));
        if (!lead) throw new Error("Lead not found");

        // Log the deletion in edit history
        await logEditHistory(db, input.id, ctx.user!.id, "deleted", JSON.stringify(lead), null, "delete", ctx);

        // Delete related records first
        await db.delete(activities).where(eq(activities.reportRequestId, input.id));
        await db.delete(documents).where(eq(documents.reportRequestId, input.id));
        await db.delete(editHistory).where(eq(editHistory.reportRequestId, input.id));
        
        // Delete the lead
        await db.delete(reportRequests).where(eq(reportRequests.id, input.id));

        return { success: true };
      }),

    // Get edit history for a job (Owner/Admin only)
    getEditHistory: protectedProcedure
      .input(z.object({ 
        jobId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only owners and admins can view edit history
        if (!canViewEditHistory(ctx.user)) {
          throw new Error("You don't have permission to view edit history");
        }

        const history = await db.select({
          id: editHistory.id,
          fieldName: editHistory.fieldName,
          oldValue: editHistory.oldValue,
          newValue: editHistory.newValue,
          editType: editHistory.editType,
          createdAt: editHistory.createdAt,
          userId: editHistory.userId,
        })
        .from(editHistory)
        .where(eq(editHistory.reportRequestId, input.jobId))
        .orderBy(desc(editHistory.createdAt))
        .limit(input.limit);

        // Enrich with user names
        const userIds = Array.from(new Set(history.map(h => h.userId).filter((id): id is number => id !== null)));
        const historyUsers = userIds.length > 0
          ? await db.select({ id: users.id, name: users.name, email: users.email })
              .from(users)
              .where(inArray(users.id, userIds))
          : [];
        const userMap = historyUsers.reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<number, any>);

        return history.map(h => ({
          ...h,
          user: h.userId ? userMap[h.userId] : null,
        }));
      }),

    // Delete edit history entry (Owner only)
    deleteEditHistory: protectedProcedure
      .input(z.object({ 
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only owners can delete edit history
        if (!isOwner(ctx.user)) {
          throw new Error("Only owners can delete edit history entries");
        }

        // Verify the entry exists
        const [entry] = await db.select().from(editHistory).where(eq(editHistory.id, input.id));
        if (!entry) throw new Error("Edit history entry not found");

        // Delete the entry
        await db.delete(editHistory).where(eq(editHistory.id, input.id));

        return { success: true };
      }),

    // Add note to lead
    addNote: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        note: z.string().min(1),
        attachments: z.array(z.object({
          fileName: z.string(),
          fileData: z.string(), // base64
          fileType: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check permission
        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.leadId));
        if (!lead) throw new Error("Lead not found");

        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canEditJob(user, lead, teamMemberIds)) {
          throw new Error("You don't have permission to add notes to this job");
        }

        const [activity] = await db.insert(activities).values({
          reportRequestId: input.leadId,
          userId: ctx.user?.id,
          activityType: "note_added",
          description: input.note,
        }).returning({ id: activities.id });

        // Handle file attachments if provided
        if (input.attachments && input.attachments.length > 0) {
          for (const attachment of input.attachments) {
            const buffer = Buffer.from(attachment.fileData, "base64");
            const fileSize = buffer.length;
            const timestamp = Date.now();
            const safeName = attachment.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
            const filePath = `jobs/${input.leadId}/attachments/${timestamp}_${safeName}`;

            // Upload to Supabase Storage (job-attachments bucket)
            const { url } = await storagePut(filePath, buffer, attachment.fileType, "job-attachments");

            // Save attachment record
            await db.insert(jobAttachments).values({
              jobId: input.leadId,
              activityId: activity.id,
              fileName: attachment.fileName,
              fileUrl: url,
              fileType: attachment.fileType,
              fileSize: fileSize,
              uploadedBy: ctx.user?.id,
            });
          }
        }

        // Detect mentions and create notifications
        if (ctx.user?.id) {
          const mentionedUserIds = detectMentions(input.note);
          await createMentionNotifications(
            db,
            mentionedUserIds,
            ctx.user.id,
            input.leadId,
            input.note
          );
        }

        // Log to edit history for audit trail
        if (ctx.user?.id) {
          const attachmentInfo = input.attachments && input.attachments.length > 0 
            ? ` (${input.attachments.length} file${input.attachments.length > 1 ? 's' : ''} attached)` 
            : '';
          await logEditHistory(
            db,
            input.leadId,
            ctx.user.id,
            "note",
            null,
            input.note.substring(0, 500) + attachmentInfo,
            "create",
            ctx
          );
        }

        return { success: true, activityId: activity.id };
      }),

    // Get pipeline data (role-based filtering)
    getPipeline: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let leads = await db.select().from(reportRequests).orderBy(desc(reportRequests.createdAt));
      
      // Filter by role
      leads = await filterLeadsByRole(db, ctx.user, leads);

      const pipeline = {
        lead: leads.filter(l => l.status === "lead"),
        appointment_set: leads.filter(l => l.status === "appointment_set"),
        prospect: leads.filter(l => l.status === "prospect"),
        approved: leads.filter(l => l.status === "approved"),
        project_scheduled: leads.filter(l => l.status === "project_scheduled"),
        completed: leads.filter(l => l.status === "completed"),
        invoiced: leads.filter(l => l.status === "invoiced"),
        lien_legal: leads.filter(l => l.status === "lien_legal"),
        closed_deal: leads.filter(l => l.status === "closed_deal"),
        closed_lost: leads.filter(l => l.status === "closed_lost"),
      };

      return pipeline;
    }),

    // Get team members
    getTeam: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Filter out users without name or email (incomplete profiles)
      const team = await db.select().from(users)
        .where(and(isNotNull(users.name), isNotNull(users.email)))
        .orderBy(users.name);
      
      // Add role display names and team lead info
      const teamWithRoles = await Promise.all(team.map(async (member) => {
        let teamLeadName = null;
        if (member.teamLeadId) {
          const [teamLead] = await db.select({ name: users.name }).from(users).where(eq(users.id, member.teamLeadId));
          teamLeadName = teamLead?.name;
        }
        
        // Count team members if this user is a team lead
        let teamMemberCount = 0;
        if (member.role === "team_lead") {
          const [count] = await db.select({ count: sql<number>`COUNT(*)` })
            .from(users)
            .where(eq(users.teamLeadId, member.id));
          teamMemberCount = count?.count || 0;
        }
        
        return {
          ...member,
          roleDisplayName: getRoleDisplayName(member.role),
          teamLeadName,
          teamMemberCount,
        };
      }));
      
      return teamWithRoles;
    }),

    // Update team member role (Owner only for role changes)
    updateTeamMember: protectedProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "owner", "office", "sales_rep", "project_manager", "team_lead"]),
        repCode: z.string().optional(),
        isActive: z.boolean().optional(),
        teamLeadId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only owners can change roles
        if (!isOwner(ctx.user)) {
          throw new Error("Only owners can update team member roles");
        }

        const updateData: Record<string, unknown> = { role: input.role };
        if (input.repCode !== undefined) updateData.repCode = input.repCode;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.teamLeadId !== undefined) updateData.teamLeadId = input.teamLeadId;

        await db.update(users).set(updateData).where(eq(users.id, input.userId));
        return { success: true };
      }),

    // Create team account (Owner only)
    createTeamAccount: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["admin", "owner", "office", "sales_rep", "team_lead", "field_crew"]),
        teamLeadId: z.number().optional(),
        password: z.string().min(6).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        console.log('[CreateAccount] Starting account creation for:', input.email);
        
        // Step 1: Check database connection
        const db = await getDb();
        if (!db) {
          console.error('[CreateAccount] STEP 1 FAILED: Database not available');
          throw new Error("[DB_ERROR] Database connection failed");
        }
        console.log('[CreateAccount] Step 1 passed: Database connected');

        // Step 2: Check permissions
        if (!isOwner(ctx.user)) {
          console.error('[CreateAccount] STEP 2 FAILED: User is not owner. User role:', ctx.user?.role);
          throw new Error("[PERMISSION_ERROR] Only owners can create team accounts");
        }
        console.log('[CreateAccount] Step 2 passed: User is owner');

        // Step 3: Check if email already exists
        try {
          const existing = await db.select().from(users).where(eq(users.email, input.email));
          if (existing.length > 0) {
            console.error('[CreateAccount] STEP 3 FAILED: Email already exists in users table');
            throw new Error("[DUPLICATE_ERROR] An account with this email already exists in CRM");
          }
          console.log('[CreateAccount] Step 3 passed: Email is unique in CRM');
        } catch (dbError: any) {
          if (dbError.message.includes('[DUPLICATE_ERROR]')) throw dbError;
          console.error('[CreateAccount] STEP 3 FAILED: Database query error:', dbError);
          throw new Error(`[DB_QUERY_ERROR] Failed to check existing users: ${dbError.message}`);
        }

        // Step 4: Generate temp password
        const tempPassword = input.password || `Temp${Math.random().toString(36).substring(2, 10)}!`;
        console.log('[CreateAccount] Step 4 passed: Generated temp password');

        // Step 5: Create Supabase Auth user
        console.log('[CreateAccount] Step 5: Creating Supabase Auth user...');
        let authData;
        try {
          const result = await supabaseAdmin.auth.admin.createUser({
            email: input.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              name: input.name,
              role: input.role,
            },
          });
          
          if (result.error) {
            console.error('[CreateAccount] STEP 5 FAILED: Supabase Auth error:', JSON.stringify(result.error));
            throw new Error(`[SUPABASE_AUTH_ERROR] ${result.error.message}`);
          }
          
          if (!result.data.user) {
            console.error('[CreateAccount] STEP 5 FAILED: No user returned from Supabase');
            throw new Error("[SUPABASE_AUTH_ERROR] No user returned from Supabase Auth");
          }
          
          authData = result.data;
          console.log('[CreateAccount] Step 5 passed: Supabase Auth user created with ID:', authData.user.id);
        } catch (supabaseError: any) {
          if (supabaseError.message.includes('[SUPABASE_AUTH_ERROR]')) throw supabaseError;
          console.error('[CreateAccount] STEP 5 FAILED: Supabase exception:', supabaseError);
          throw new Error(`[SUPABASE_EXCEPTION] ${supabaseError.message}`);
        }

        // Step 6: Create user in CRM database
        console.log('[CreateAccount] Step 6: Creating user in CRM database...');
        let newUser;
        try {
          const [insertedUser] = await db.insert(users).values({
            openId: authData.user.id,
            name: input.name,
            email: input.email,
            role: input.role,
            teamLeadId: input.teamLeadId || null,
            isActive: true,
          }).returning({ id: users.id });
          newUser = insertedUser;
          console.log('[CreateAccount] Step 6 passed: CRM user created with ID:', newUser.id);
        } catch (dbInsertError: any) {
          console.error('[CreateAccount] STEP 6 FAILED: CRM database insert error:', dbInsertError);
          // Try to clean up the Supabase Auth user since CRM insert failed
          try {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.log('[CreateAccount] Cleaned up orphaned Supabase Auth user');
          } catch (cleanupError) {
            console.error('[CreateAccount] Failed to cleanup Supabase Auth user:', cleanupError);
          }
          throw new Error(`[CRM_DB_ERROR] Failed to create CRM user: ${dbInsertError.message}`);
        }

        // Login URL
        const loginUrl = 'https://ndespanels.com/login';
        
        try {
          await sendWelcomeEmail({
            recipientEmail: input.email,
            recipientName: input.name,
            role: input.role,
            loginUrl,
            companyName: 'NextDoor Exterior Solutions',
          });
        } catch (emailError) {
          console.error('[CreateAccount] Failed to send welcome email:', emailError);
          // Don't fail the account creation if email fails
        }

        return {
          id: newUser.id,
          name: input.name,
          email: input.email,
          role: input.role,
          loginUrl,
          tempPassword, // Return temp password so owner can share it
        };
      }),

    // Update user (Owner only) - with audit trail
    updateUser: protectedProcedure
      .input(z.object({
        targetUserId: z.number(),
        data: z.object({
          name: z.string().min(1).optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          role: z.enum(["user", "admin", "owner", "office", "sales_rep", "project_manager", "team_lead", "field_crew"]).optional(),
          repCode: z.string().optional(),
          teamLeadId: z.number().nullable().optional(),
          isActive: z.boolean().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Only owners can edit users
        if (!isOwner(ctx.user)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only owners can edit user details" });
        }

        const { targetUserId, data } = input;

        // Fetch original user data for audit log
        const [oldUser] = await db.select().from(users).where(eq(users.id, targetUserId));
        if (!oldUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        // Build update object with only provided fields
        const updateData: Record<string, any> = {};
        const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

        if (data.name !== undefined && data.name !== oldUser.name) {
          updateData.name = data.name;
          changes.push({ field: "name", oldValue: oldUser.name || null, newValue: data.name });
        }
        if (data.email !== undefined && data.email !== oldUser.email) {
          updateData.email = data.email;
          changes.push({ field: "email", oldValue: oldUser.email || null, newValue: data.email });
        }
        if (data.phone !== undefined && data.phone !== oldUser.phone) {
          updateData.phone = data.phone;
          changes.push({ field: "phone", oldValue: oldUser.phone || null, newValue: data.phone });
        }
        if (data.role !== undefined && data.role !== oldUser.role) {
          updateData.role = data.role;
          changes.push({ field: "role", oldValue: oldUser.role || null, newValue: data.role });
        }
        if (data.repCode !== undefined && data.repCode !== oldUser.repCode) {
          updateData.repCode = data.repCode;
          changes.push({ field: "rep_code", oldValue: oldUser.repCode || null, newValue: data.repCode });
        }
        if (data.teamLeadId !== undefined && data.teamLeadId !== oldUser.teamLeadId) {
          updateData.teamLeadId = data.teamLeadId;
          changes.push({ field: "team_lead_id", oldValue: oldUser.teamLeadId?.toString() || null, newValue: data.teamLeadId?.toString() || null });
        }
        if (data.isActive !== undefined && data.isActive !== oldUser.isActive) {
          updateData.isActive = data.isActive;
          changes.push({ field: "is_active", oldValue: String(oldUser.isActive), newValue: String(data.isActive) });
        }

        // If no changes, return early
        if (Object.keys(updateData).length === 0) {
          return { success: true, message: "No changes to save" };
        }

        // Add updatedAt timestamp
        updateData.updatedAt = new Date();

        // Update user
        await db.update(users)
          .set(updateData)
          .where(eq(users.id, targetUserId));

        // Log each change to edit history (using reportRequestId = 0 for user edits)
        for (const change of changes) {
          await db.insert(editHistory).values({
            reportRequestId: 0, // 0 indicates this is a user edit, not a job edit
            userId: ctx.user!.id,
            fieldName: `user.${change.field}`,
            oldValue: change.oldValue,
            newValue: change.newValue,
            editType: "update",
            ipAddress: ctx.req?.headers?.get?.("x-forwarded-for") || null,
            userAgent: ctx.req?.headers?.get?.("user-agent")?.substring(0, 500) || null,
          });
        }

        console.log(`[UpdateUser] Owner ${ctx.user?.name} updated user ${targetUserId}:`, changes);

        return { 
          success: true, 
          message: `User updated successfully. ${changes.length} field(s) changed.`,
          changes: changes.map(c => c.field),
        };
      }),

    // Get team leads for assignment dropdown (includes owners)
    getTeamLeads: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const teamLeads = await db.selectDistinct({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(or(eq(users.role, "team_lead"), eq(users.role, "owner")))
      .orderBy(users.role, users.name);

      // Filter to ensure unique users (in case of any duplicates)
      const uniqueLeads = teamLeads.filter((lead, index, self) => 
        index === self.findIndex(l => l.id === lead.id)
      );

      return uniqueLeads;
    }),

    // ============ DOCUMENT UPLOAD ============
    
    // Upload document to a lead
    uploadDocument: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file data
        fileType: z.string(),
        category: z.enum(["drone_photo", "inspection_photo", "report", "contract", "invoice", "other"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check permission
        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.leadId));
        if (!lead) throw new Error("Lead not found");

        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canEditJob(user, lead, teamMemberIds)) {
          throw new Error("You don't have permission to upload documents to this job");
        }

        // Decode base64 file data
        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;

        // Generate unique file path
        const timestamp = Date.now();
        const safeName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `jobs/${input.leadId}/documents/${timestamp}_${safeName}`;

        // Upload to Supabase Storage
        const { url } = await storagePut(filePath, buffer, input.fileType);

        // Save document record
        const [result] = await db.insert(documents).values({
          reportRequestId: input.leadId,
          uploadedBy: ctx.user?.id,
          fileName: input.fileName,
          fileUrl: url,
          fileType: input.fileType,
          fileSize: fileSize,
          category: input.category,
        }).returning({ id: documents.id });

        // Log activity
        await db.insert(activities).values({
          reportRequestId: input.leadId,
          userId: ctx.user?.id,
          activityType: "document_uploaded",
          description: `Uploaded ${input.category.replace("_", " ")}: ${input.fileName}`,
        });

        // Log to edit history for audit trail
        if (ctx.user?.id) {
          await logEditHistory(
            db,
            input.leadId,
            ctx.user.id,
            "document",
            null,
            `Uploaded ${input.category}: ${input.fileName} (${(fileSize / 1024).toFixed(1)}KB)`,
            "create",
            ctx
          );
        }

        return { success: true, documentId: result.id, url };
      }),

    // Get documents for a lead
    getDocuments: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check permission
        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.leadId));
        if (!lead) throw new Error("Lead not found");

        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canViewJob(user, lead, teamMemberIds)) {
          throw new Error("You don't have permission to view documents for this job");
        }

        const docs = await db.select().from(documents)
          .where(eq(documents.reportRequestId, input.leadId))
          .orderBy(desc(documents.createdAt));

        return docs;
      }),

    // Delete document (Owner only)
    deleteDocument: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only owners can delete
        if (!canDeleteJob(ctx.user)) {
          throw new Error("Only owners can delete documents");
        }

        await db.delete(documents).where(eq(documents.id, input.documentId));
        return { success: true };
      }),

    // ============ SCHEDULING / CALENDAR ============

    // Get appointments for calendar view (role-based)
    getAppointments: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        assignedTo: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const start = new Date(input.startDate);
        const end = new Date(input.endDate);

        let appointments = await db.select({
          id: reportRequests.id,
          fullName: reportRequests.fullName,
          phone: reportRequests.phone,
          address: reportRequests.address,
          cityStateZip: reportRequests.cityStateZip,
          scheduledDate: reportRequests.scheduledDate,
          status: reportRequests.status,
          priority: reportRequests.priority,
          assignedTo: reportRequests.assignedTo,
          handsOnInspection: reportRequests.handsOnInspection,
        })
        .from(reportRequests)
        .where(
          and(
            sql`${reportRequests.scheduledDate} IS NOT NULL`,
            gte(reportRequests.scheduledDate, start),
            lte(reportRequests.scheduledDate, end)
          )
        );

        // Filter by role
        appointments = await filterLeadsByRole(db, ctx.user, appointments);

        return appointments;
      }),

    // Schedule appointment
    scheduleAppointment: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        scheduledDate: z.string(),
        assignedTo: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check permission
        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.leadId));
        if (!lead) throw new Error("Lead not found");

        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canEditJob(user, lead, teamMemberIds)) {
          throw new Error("You don't have permission to schedule appointments for this job");
        }

        const updateData: Record<string, unknown> = {
          scheduledDate: new Date(input.scheduledDate),
          status: "inspection_scheduled",
        };
        if (input.assignedTo !== undefined) {
          updateData.assignedTo = input.assignedTo;
        }

        await db.update(reportRequests).set(updateData).where(eq(reportRequests.id, input.leadId));

        // Log edit history
        await logEditHistory(db, input.leadId, user!.id, "scheduledDate", lead.scheduledDate?.toISOString() || "", input.scheduledDate, "update", ctx);

        // Log activity
        await db.insert(activities).values({
          reportRequestId: input.leadId,
          userId: ctx.user?.id,
          activityType: "appointment_scheduled",
          description: `Inspection scheduled for ${new Date(input.scheduledDate).toLocaleString()}`,
        });

        return { success: true };
      }),

    // ============ REPORTS / EXPORT ============

    // Get leads for export with filters (role-based)
    getLeadsForExport: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.string().optional(),
        salesRep: z.string().optional(),
        assignedTo: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let conditions = [];
        
        if (input.startDate) {
          conditions.push(gte(reportRequests.createdAt, new Date(input.startDate)));
        }
        if (input.endDate) {
          conditions.push(lte(reportRequests.createdAt, new Date(input.endDate)));
        }
        if (input.status && input.status !== "all") {
          conditions.push(eq(reportRequests.status, input.status as any));
        }
        if (input.salesRep) {
          conditions.push(eq(reportRequests.salesRepCode, input.salesRep));
        }
        if (input.assignedTo) {
          conditions.push(eq(reportRequests.assignedTo, input.assignedTo));
        }

        const query = conditions.length > 0
          ? db.select().from(reportRequests).where(and(...conditions)).orderBy(desc(reportRequests.createdAt))
          : db.select().from(reportRequests).orderBy(desc(reportRequests.createdAt));

        let leads = await query;
        
        // Filter by role
        leads = await filterLeadsByRole(db, ctx.user, leads);
        
        return leads;
      }),

    // Get report summary stats (role-based)
    getReportStats: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get all leads first, then filter by role
        let allLeads = await db.select().from(reportRequests);
        
        if (input.startDate) {
          allLeads = allLeads.filter(l => l.createdAt >= new Date(input.startDate!));
        }
        if (input.endDate) {
          allLeads = allLeads.filter(l => l.createdAt <= new Date(input.endDate!));
        }
        
        // Filter by role
        const leads = await filterLeadsByRole(db, ctx.user, allLeads);

        // Calculate stats from filtered leads
        const total = leads.length;
        const closedWon = leads.filter(l => l.status === "closed_won").length;
        const conversionRate = total > 0 ? Number(((closedWon / total) * 100).toFixed(1)) : 0;
        const totalRevenue = leads.reduce((sum, l) => sum + (l.amountPaid || 0), 0) / 100;

        // Group by status
        const byStatus = leads.reduce((acc, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Group by sales rep
        const byRep = leads.reduce((acc, lead) => {
          const rep = lead.salesRepCode || "Unassigned";
          acc[rep] = (acc[rep] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          totalLeads: total,
          byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
          byRep: Object.entries(byRep).map(([salesRepCode, count]) => ({ salesRepCode, count })),
          totalRevenue,
          conversionRate: `${conversionRate}%`,
        };
      }),

    // ============ DASHBOARD ANALYTICS ============

    // Get monthly lead trends for charts (role-based)
    getMonthlyTrends: protectedProcedure
      .input(z.object({
        months: z.number().default(6),
      }).optional())
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const monthsBack = input?.months || 6;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);

        let leads = await db.select({
          id: reportRequests.id,
          status: reportRequests.status,
          amountPaid: reportRequests.amountPaid,
          createdAt: reportRequests.createdAt,
          assignedTo: reportRequests.assignedTo,
        })
        .from(reportRequests)
        .where(gte(reportRequests.createdAt, startDate))
        .orderBy(reportRequests.createdAt);

        // Filter by role
        leads = await filterLeadsByRole(db, ctx.user, leads);

        // Group by month
        const monthlyData: Record<string, { leads: number; closed: number; revenue: number }> = {};
        
        leads.forEach(lead => {
          const monthKey = lead.createdAt.toISOString().slice(0, 7); // YYYY-MM
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { leads: 0, closed: 0, revenue: 0 };
          }
          monthlyData[monthKey].leads++;
          if (lead.status === "closed_deal") {
            monthlyData[monthKey].closed++;
            monthlyData[monthKey].revenue += (lead.amountPaid || 0) / 100;
          }
        });

        return Object.entries(monthlyData).map(([month, data]) => ({
          month,
          ...data,
          conversionRate: data.leads > 0 ? ((data.closed / data.leads) * 100).toFixed(1) : "0",
        }));
      }),

    // Get leads by category tabs (role-based) - Updated for new pipeline
    getLeadsByCategory: protectedProcedure
      .input(z.object({
        category: z.enum(["lead", "appointment_set", "prospect", "approved", "project_scheduled", "completed", "invoiced", "lien_legal", "closed_deal", "closed_lost"]),
        dealType: z.enum(["insurance", "cash", "financed", "all"]).optional(),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let conditions: any[] = [eq(reportRequests.status, input.category as any)];
        
        // Filter by deal type if specified
        if (input.dealType && input.dealType !== "all") {
          conditions.push(eq(reportRequests.dealType, input.dealType));
        }
        
        let leads = await db.select().from(reportRequests)
          .where(and(...conditions))
          .orderBy(desc(reportRequests.createdAt));

        // Filter by role
        leads = await filterLeadsByRole(db, ctx.user, leads);

        return leads;
      }),

    // Get lien rights jobs with urgency tracking
    getLienRightsJobs: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all jobs with lien rights tracking (completed or invoiced status)
      let leads = await db.select().from(reportRequests)
        .where(
          and(
            or(
              eq(reportRequests.status, "completed"),
              eq(reportRequests.status, "invoiced")
            ),
            isNotNull(reportRequests.projectCompletedAt)
          )
        )
        .orderBy(reportRequests.lienRightsExpiresAt);

      // Filter by role
      leads = await filterLeadsByRole(db, ctx.user, leads);

      // Calculate days remaining and update status if needed
      const now = new Date();
      const jobsWithLienInfo = leads.map(lead => {
        const expiresAt = lead.lienRightsExpiresAt ? new Date(lead.lienRightsExpiresAt) : null;
        const completedAt = lead.projectCompletedAt ? new Date(lead.projectCompletedAt) : null;
        
        if (!expiresAt || !completedAt) {
          return { ...lead, daysRemaining: null, urgencyLevel: "not_applicable" };
        }
        
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const daysSinceCompletion = Math.ceil((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        let urgencyLevel: string;
        if (daysRemaining <= 0) {
          urgencyLevel = "expired";
        } else if (daysRemaining <= 14) {
          urgencyLevel = "critical";
        } else if (daysRemaining <= 30) {
          urgencyLevel = "warning";
        } else {
          urgencyLevel = "active";
        }
        
        return {
          ...lead,
          daysRemaining,
          daysSinceCompletion,
          urgencyLevel,
        };
      });

      return jobsWithLienInfo;
    }),

    // Get category counts for tabs (role-based) - Updated for new pipeline
    getCategoryCounts: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let leads = await db.select({
        status: reportRequests.status,
        dealType: reportRequests.dealType,
        lienRightsStatus: reportRequests.lienRightsStatus,
        assignedTo: reportRequests.assignedTo,
      }).from(reportRequests);

      // Filter by role
      leads = await filterLeadsByRole(db, ctx.user, leads);

      const statusMap = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const dealTypeMap = leads.reduce((acc, lead) => {
        if (lead.dealType) {
          acc[lead.dealType] = (acc[lead.dealType] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const lienStatusMap = leads.reduce((acc, lead) => {
        if (lead.lienRightsStatus) {
          acc[lead.lienRightsStatus] = (acc[lead.lienRightsStatus] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        // Pipeline stages
        lead: statusMap["lead"] || 0,
        appointment_set: statusMap["appointment_set"] || 0,
        prospect: statusMap["prospect"] || 0,
        approved: statusMap["approved"] || 0,
        project_scheduled: statusMap["project_scheduled"] || 0,
        completed: statusMap["completed"] || 0,
        invoiced: statusMap["invoiced"] || 0,
        lien_legal: statusMap["lien_legal"] || 0,
        closed_deal: statusMap["closed_deal"] || 0,
        closed_lost: statusMap["closed_lost"] || 0,
        // Deal types
        insurance: dealTypeMap["insurance"] || 0,
        cash: dealTypeMap["cash"] || 0,
        financed: dealTypeMap["financed"] || 0,
        // Lien rights status
        lien_active: lienStatusMap["active"] || 0,
        lien_warning: lienStatusMap["warning"] || 0,
        lien_critical: lienStatusMap["critical"] || 0,
        lien_expired: lienStatusMap["expired"] || 0,
      };
    }),

    // ============ JOB DETAIL PAGE ============

    // Get comprehensive job detail with all related data
    getJobDetail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.id));
        if (!job) throw new Error("Job not found");

        // Check permission
        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canViewJob(user, job, teamMemberIds)) {
          throw new Error("You don't have permission to view this job");
        }

        // Get assigned user info
        let assignedUser = null;
        if (job.assignedTo) {
          const [assignedUserData] = await db.select().from(users).where(eq(users.id, job.assignedTo));
          assignedUser = assignedUserData;
        }

        // Get all activities (timeline)
        const jobActivities = await db.select({
          id: activities.id,
          activityType: activities.activityType,
          description: activities.description,
          metadata: activities.metadata,
          createdAt: activities.createdAt,
          userId: activities.userId,
        })
        .from(activities)
        .where(eq(activities.reportRequestId, input.id))
        .orderBy(desc(activities.createdAt));

        // Enrich activities with user names
        const userIds = Array.from(new Set(jobActivities.map(a => a.userId).filter((id): id is number => id !== null && id !== undefined)));
        const activityUsers = userIds.length > 0
          ? await db.select({ id: users.id, name: users.name, email: users.email })
              .from(users)
              .where(inArray(users.id, userIds))
          : [];
        const userMap = activityUsers.reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<number, any>);

        // Get attachments for all activities
        const activityIds = jobActivities.map(a => a.id);
        const allAttachments = activityIds.length > 0
          ? await db.select().from(jobAttachments)
              .where(and(
                eq(jobAttachments.jobId, input.id),
                isNotNull(jobAttachments.activityId)
              ))
              .orderBy(desc(jobAttachments.createdAt))
          : [];
        
        // Group attachments by activity ID
        const attachmentsByActivity = allAttachments.reduce((acc, att) => {
          if (att.activityId) {
            if (!acc[att.activityId]) acc[att.activityId] = [];
            acc[att.activityId].push(att);
          }
          return acc;
        }, {} as Record<number, typeof allAttachments>);

        const enrichedActivities = jobActivities.map(a => ({
          ...a,
          user: a.userId ? userMap[a.userId] : null,
          attachments: attachmentsByActivity[a.id] || [],
        }));

        // Get all documents
        const jobDocuments = await db.select().from(documents)
          .where(eq(documents.reportRequestId, input.id))
          .orderBy(desc(documents.createdAt));

        // Separate photos from other documents
        const photos = jobDocuments.filter(d => 
          d.category === "drone_photo" || 
          d.category === "inspection_photo" ||
          d.fileType?.startsWith("image/")
        );
        const docs = jobDocuments.filter(d => 
          d.category !== "drone_photo" && 
          d.category !== "inspection_photo" &&
          !d.fileType?.startsWith("image/")
        );

        // Get messages (notes with type 'message')
        const messages = enrichedActivities.filter(a => 
          a.activityType === "message" || a.activityType === "note_added"
        );

        // Get user permissions for this job
        const canEdit = canEditJob(user, job, teamMemberIds);
        const canDelete = canDeleteJob(user);
        const canViewHistory = canViewEditHistory(user);

        return {
          job,
          assignedUser,
          activities: enrichedActivities,
          documents: docs,
          photos,
          messages,
          timeline: enrichedActivities,
          permissions: {
            canEdit,
            canDelete,
            canViewHistory,
          },
        };
      }),

    // Add message to job
    addMessage: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        message: z.string().min(1),
        isInternal: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check permission
        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
        if (!lead) throw new Error("Job not found");

        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canEditJob(user, lead, teamMemberIds)) {
          throw new Error("You don't have permission to add messages to this job");
        }

        await db.insert(activities).values({
          reportRequestId: input.jobId,
          userId: ctx.user?.id,
          activityType: "message",
          description: input.message,
          metadata: JSON.stringify({ isInternal: input.isInternal }),
        });

        return { success: true };
      }),

    // Upload photo to job
    uploadPhoto: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64
        fileType: z.string(),
        category: z.enum(["drone_photo", "inspection_photo"]).default("inspection_photo"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check permission
        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
        if (!lead) throw new Error("Job not found");

        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canEditJob(user, lead, teamMemberIds)) {
          throw new Error("You don't have permission to upload photos to this job");
        }

        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;

        // Extract EXIF metadata from photo
        const exifData = extractExifMetadata(buffer);

        const timestamp = Date.now();
        const safeName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `jobs/${input.jobId}/photos/${timestamp}_${safeName}`;

        const { url } = await storagePut(filePath, buffer, input.fileType);

        const [result] = await db.insert(documents).values({
          reportRequestId: input.jobId,
          uploadedBy: ctx.user?.id,
          fileName: input.fileName,
          fileUrl: url,
          fileType: input.fileType,
          fileSize: fileSize,
          category: input.category,
          // Photo metadata from EXIF
          photoTakenAt: exifData.photoTakenAt,
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          cameraModel: exifData.cameraModel,
        }).returning({ id: documents.id });

        await db.insert(activities).values({
          reportRequestId: input.jobId,
          userId: ctx.user?.id,
          activityType: "photo_uploaded",
          description: `Uploaded photo: ${input.fileName}`,
        });

        // Log to edit history for audit trail
        if (ctx.user?.id) {
          await logEditHistory(
            db,
            input.jobId,
            ctx.user.id,
            "photo",
            null,
            `Uploaded photo: ${input.fileName}${exifData.latitude ? ` (GPS: ${exifData.latitude}, ${exifData.longitude})` : ''}`,
            "create",
            ctx
          );
        }

        return { success: true, documentId: result.id, url };
      }),

    // ============ FIELD UPLOAD (PUBLIC) ============

    // Get job info for field upload page (public - no auth required)
    getJobForUpload: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [job] = await db.select({
          id: reportRequests.id,
          fullName: reportRequests.fullName,
          address: reportRequests.address,
          cityStateZip: reportRequests.cityStateZip,
        }).from(reportRequests).where(eq(reportRequests.id, input.id));

        if (!job) throw new Error("Job not found");
        return job;
      }),

    // Upload photo from field (public - no auth required for field staff)
    uploadFieldPhoto: publicProcedure
      .input(z.object({
        jobId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64
        fileType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verify job exists
        const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
        if (!job) throw new Error("Job not found");

        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;

        // Extract EXIF metadata from photo
        const exifData = extractExifMetadata(buffer);

        const timestamp = Date.now();
        const safeName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `jobs/${input.jobId}/photos/${timestamp}_${safeName}`;

        const { url } = await storagePut(filePath, buffer, input.fileType);

        // Save document record with EXIF metadata
        const [result] = await db.insert(documents).values({
          reportRequestId: input.jobId,
          uploadedBy: null, // Field upload - no user
          fileName: input.fileName,
          fileUrl: url,
          fileType: input.fileType,
          fileSize: fileSize,
          category: "inspection_photo",
          // Photo metadata from EXIF
          photoTakenAt: exifData.photoTakenAt,
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          cameraModel: exifData.cameraModel,
        }).returning({ id: documents.id });

        // Log activity
        await db.insert(activities).values({
          reportRequestId: input.jobId,
          userId: null,
          activityType: "photo_uploaded",
          description: `Field upload: ${input.fileName}`,
        });

        return { success: true, documentId: result.id, url };
      }),

    // Search within job (documents, notes, messages)
    searchJob: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        query: z.string().min(1),
        type: z.enum(["all", "documents", "notes", "photos"]).default("all"),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check permission
        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
        if (!lead) throw new Error("Job not found");

        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canViewJob(user, lead, teamMemberIds)) {
          throw new Error("You don't have permission to search this job");
        }

        const searchTerm = `%${input.query}%`;
        const results: { documents: any[]; activities: any[] } = { documents: [], activities: [] };

        if (input.type === "all" || input.type === "documents" || input.type === "photos") {
          const docs = await db.select().from(documents)
            .where(and(
              eq(documents.reportRequestId, input.jobId),
              like(documents.fileName, searchTerm)
            ));
          results.documents = docs;
        }

        if (input.type === "all" || input.type === "notes") {
          const acts = await db.select().from(activities)
            .where(and(
              eq(activities.reportRequestId, input.jobId),
              like(activities.description, searchTerm)
            ))
            .orderBy(desc(activities.createdAt));
          results.activities = acts;
        }

        return results;
      }),

    // ============ LIEN RIGHTS ALERTS ============

    // Get lien rights alert summary (for dashboard widget)
    getLienRightsAlertSummary: protectedProcedure.query(async () => {
      const { warningJobs, criticalJobs } = await getLienRightsAlertJobs();
      
      return {
        warningCount: warningJobs.length,
        criticalCount: criticalJobs.length,
        warningJobs: warningJobs.slice(0, 5), // Top 5 most urgent
        criticalJobs: criticalJobs.slice(0, 5),
      };
    }),

    // Send lien rights alert notification (Owner/Admin only)
    sendLienRightsAlert: protectedProcedure
      .input(z.object({
        crmUrl: z.string().optional(),
      }).optional())
      .mutation(async ({ input, ctx }) => {
        // Only owners and admins can trigger alerts
        if (!isOwner(ctx.user) && !isAdmin(ctx.user)) {
          throw new Error("Only owners and admins can send lien rights alerts");
        }

        const crmUrl = input?.crmUrl || "https://nextdoor-landing.manus.space";
        const result = await sendLienRightsAlertNotification(crmUrl);
        
        return result;
      }),
  }),

  // ============ CUSTOMER PORTAL (PUBLIC) ============
  portal: router({
    // Look up job by phone number (public - no auth required)
    lookupJob: publicProcedure
      .input(z.object({
        phone: z.string().min(10),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Normalize phone number - remove all non-digits
        const normalizedPhone = input.phone.replace(/\D/g, "");
        
        // Search for jobs with matching phone number
        const jobs = await db.select({
          id: reportRequests.id,
          fullName: reportRequests.fullName,
          address: reportRequests.address,
          cityStateZip: reportRequests.cityStateZip,
          status: reportRequests.status,
          customerStatusMessage: reportRequests.customerStatusMessage,
          scheduledDate: reportRequests.scheduledDate,
          createdAt: reportRequests.createdAt,
        })
        .from(reportRequests)
        .where(
          or(
            like(reportRequests.phone, `%${normalizedPhone}%`),
            like(reportRequests.phone, `%${input.phone}%`)
          )
        )
        .orderBy(desc(reportRequests.createdAt));

        if (jobs.length === 0) {
          return { found: false, jobs: [] };
        }

        // Get timeline for each job (limited public view)
        const jobsWithTimeline = await Promise.all(jobs.map(async (job) => {
          const timeline = await db.select({
            id: activities.id,
            activityType: activities.activityType,
            description: activities.description,
            createdAt: activities.createdAt,
          })
          .from(activities)
          .where(
            and(
              eq(activities.reportRequestId, job.id),
              // Only show certain activity types to customers
              inArray(activities.activityType, [
                "status_change",
                "appointment_scheduled",
                "inspection_complete",
                "document_uploaded",
                "customer_message",
                "callback_requested"
              ])
            )
          )
          .orderBy(desc(activities.createdAt))
          .limit(20);

          return {
            ...job,
            timeline,
          };
        }));

        return { found: true, jobs: jobsWithTimeline };
      }),

    // Send a message to job file (public)
    sendMessage: publicProcedure
      .input(z.object({
        jobId: z.number(),
        phone: z.string().min(10),
        message: z.string().min(1).max(1000),
        senderName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verify phone matches the job
        const normalizedPhone = input.phone.replace(/\D/g, "");
        const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
        
        if (!job) {
          throw new Error("Job not found");
        }

        const jobPhone = job.phone?.replace(/\D/g, "") || "";
        if (!jobPhone.includes(normalizedPhone) && !normalizedPhone.includes(jobPhone)) {
          throw new Error("Phone number does not match job record");
        }

        // Add activity/note to job
        await db.insert(activities).values({
          reportRequestId: input.jobId,
          activityType: "customer_message",
          description: `Customer Message from ${input.senderName || job.fullName}: ${input.message}`,
          metadata: JSON.stringify({
            phone: input.phone,
            senderName: input.senderName || job.fullName,
            message: input.message,
            sentAt: new Date().toISOString(),
          }),
        });

        // Log to edit history for audit trail (use userId 0 for customer messages)
        await logEditHistory(
          db,
          input.jobId,
          0, // Customer message, no user ID
          "customer_message",
          null,
          `${input.senderName || job.fullName}: ${input.message.substring(0, 400)}`,
          "create",
          null
        );

        // Notify admins/owners about the customer message
        const admins = await db.select({ id: users.id, email: users.email, name: users.name })
          .from(users)
          .where(
            and(
              isNotNull(users.email),
              isNotNull(users.name),
              inArray(users.role, ["owner", "admin"])
            )
          );

        // Send notification to owner
        try {
          await notifyOwner({
            title: "New Customer Message",
            content: `${job.fullName} sent a message regarding job #${job.id}: "${input.message.substring(0, 100)}${input.message.length > 100 ? '...' : ''}"`
          });
        } catch (e) {
          console.error("Failed to send customer message notification:", e);
        }

        return { success: true, message: "Your message has been sent to our team." };
      }),

    // Request a callback (public)
    requestCallback: publicProcedure
      .input(z.object({
        jobId: z.number(),
        phone: z.string().min(10),
        preferredTime: z.string().optional(),
        notes: z.string().max(500).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verify phone matches the job
        const normalizedPhone = input.phone.replace(/\D/g, "");
        const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
        
        if (!job) {
          throw new Error("Job not found");
        }

        const jobPhone = job.phone?.replace(/\D/g, "") || "";
        if (!jobPhone.includes(normalizedPhone) && !normalizedPhone.includes(jobPhone)) {
          throw new Error("Phone number does not match job record");
        }

        // Add activity to job
        await db.insert(activities).values({
          reportRequestId: input.jobId,
          activityType: "callback_requested",
          description: `Callback Requested: Customer ${job.fullName} requested a call${input.preferredTime ? ` (preferred: ${input.preferredTime})` : ""}${input.notes ? `. Notes: ${input.notes}` : ""}`,
          metadata: JSON.stringify({
            phone: input.phone,
            preferredTime: input.preferredTime,
            notes: input.notes,
            requestedAt: new Date().toISOString(),
          }),
        });

        // Update job priority to indicate callback needed
        await db.update(reportRequests)
          .set({ priority: "high" })
          .where(eq(reportRequests.id, input.jobId));

        // Notify admins/owners about the callback request
        try {
          await notifyOwner({
            title: "Callback Requested",
            content: `${job.fullName} (${job.phone}) requested a callback for job #${job.id}${input.preferredTime ? ` - Preferred time: ${input.preferredTime}` : ""}`
          });
        } catch (e) {
          console.error("Failed to send callback request notification:", e);
        }

        return { 
          success: true, 
          message: "Your callback request has been received. A team member will contact you within 48 business hours." 
        };
      }),

    // Mark messages as read for a job
    markMessagesAsRead: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!ctx.user?.id) throw new Error("User not authenticated");

        // Upsert: update if exists, insert if not
        const existing = await db.select()
          .from(jobMessageReads)
          .where(and(
            eq(jobMessageReads.jobId, input.jobId),
            eq(jobMessageReads.userId, ctx.user.id)
          ))
          .limit(1);

        if (existing.length > 0) {
          await db.update(jobMessageReads)
            .set({ lastReadAt: new Date() })
            .where(and(
              eq(jobMessageReads.jobId, input.jobId),
              eq(jobMessageReads.userId, ctx.user.id)
            ));
        } else {
          await db.insert(jobMessageReads).values({
            jobId: input.jobId,
            userId: ctx.user.id,
            lastReadAt: new Date(),
          });
        }

        return { success: true };
      }),

    // Get unread message counts for all jobs
    getUnreadCounts: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!ctx.user?.id) return [];

        // Get all jobs the user can view
        let jobs = await db.select({ id: reportRequests.id }).from(reportRequests);
        
        // Filter by role
        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        jobs = jobs.filter(job => {
          const fullJob = { ...job, assignedTo: null, teamLeadId: null } as any;
          return canViewJob(user, fullJob, teamMemberIds);
        });

        const jobIds = jobs.map(j => j.id);
        if (jobIds.length === 0) return [];

        // Get last read times for this user
        const readTimes = await db.select()
          .from(jobMessageReads)
          .where(and(
            eq(jobMessageReads.userId, ctx.user.id),
            inArray(jobMessageReads.jobId, jobIds)
          ));

        const readTimeMap = readTimes.reduce((acc, rt) => {
          acc[rt.jobId] = rt.lastReadAt;
          return acc;
        }, {} as Record<number, Date>);

        // Get latest message time for each job
        const latestMessages = await db.select({
          jobId: activities.reportRequestId,
          latestMessageTime: sql<Date>`MAX(${activities.createdAt})`.as('latest_message_time'),
        })
        .from(activities)
        .where(and(
          inArray(activities.reportRequestId, jobIds),
          or(
            eq(activities.activityType, 'note_added'),
            eq(activities.activityType, 'message'),
            eq(activities.activityType, 'customer_message')
          )
        ))
        .groupBy(activities.reportRequestId);

        // Determine which jobs have unread messages
        const unreadJobIds = latestMessages
          .filter(msg => {
            const lastRead = readTimeMap[msg.jobId];
            // If never read, or last read is before latest message, it's unread
            return !lastRead || new Date(lastRead) < new Date(msg.latestMessageTime);
          })
          .map(msg => msg.jobId);

        return unreadJobIds;
      }),

    // Get all users for @mention dropdown
    getAllUsers: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const allUsers = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(isNotNull(users.name))
        .orderBy(users.name);

        return allUsers;
      }),

    // Get notifications for current user
    getNotifications: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!ctx.user?.id) return [];

        const userNotifications = await db.select({
          id: notifications.id,
          userId: notifications.userId,
          createdBy: notifications.createdBy,
          resourceId: notifications.resourceId,
          type: notifications.type,
          content: notifications.content,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50);

        // Enrich with creator info
        const creatorIds = Array.from(new Set(userNotifications.map(n => n.createdBy).filter(id => id !== null)));
        const creators = creatorIds.length > 0
          ? await db.select({ id: users.id, name: users.name, email: users.email })
              .from(users)
              .where(inArray(users.id, creatorIds))
          : [];
        
        const creatorMap = creators.reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<number, any>);

        return userNotifications.map(n => ({
          ...n,
          creator: n.createdBy ? creatorMap[n.createdBy] : null,
        }));
      }),

    // Mark notification as read
    markNotificationRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!ctx.user?.id) throw new Error("User not authenticated");

        await db.update(notifications)
          .set({ isRead: true })
          .where(and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          ));

        return { success: true };
      }),

    // Mark all notifications as read
    markAllNotificationsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!ctx.user?.id) throw new Error("User not authenticated");

        await db.update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.userId, ctx.user.id));

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
