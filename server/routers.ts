import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { reportRequests, users, activities, documents, editHistory } from "../drizzle/schema";
import { PRODUCTS, validatePromoCode } from "./products";
import { notifyOwner } from "./_core/notification";
import { sendSMSNotification } from "./sms";
import { sendWelcomeEmail } from "./email";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { eq, desc, and, or, like, sql, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { storagePut, storageGet } from "./storage";
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

// Initialize Stripe
const stripe = new Stripe(ENV.stripeSecretKey || "", {
  apiVersion: "2025-11-17.clover",
});

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

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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

        if (isFree) {
          const [result] = await db.insert(reportRequests).values({
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            address: input.address,
            cityStateZip: input.cityStateZip,
            roofAge: input.roofAge || null,
            roofConcerns: input.roofConcerns || null,
            handsOnInspection: input.handsOnInspection || false,
            promoCode: input.promoCode?.toUpperCase() || null,
            promoApplied: true,
            amountPaid: 0,
            status: "new_lead",
            salesRepCode: promoResult.salesRep || null,
            leadSource: "website",
          });

          await notifyOwner({
            title: input.handsOnInspection 
              ? "🏠🔧 New Storm Report Request (FREE + HANDS-ON)" 
              : "🏠 New Storm Report Request (FREE - Promo Code)",
            content: `**New Report Request Received**\n\n**Customer Details:**\n- Name: ${input.fullName}\n- Email: ${input.email}\n- Phone: ${input.phone}\n\n**Property:**\n- Address: ${input.address}\n- City/State/ZIP: ${input.cityStateZip}\n- Roof Age: ${input.roofAge || "Not specified"}\n\n**Roof Concerns:**\n${concernsText}\n\n**Hands-On Inspection:** ${handsOnText}\n\n**Payment:**\n- Promo Code: ${input.promoCode?.toUpperCase()}\n- Amount: $0.00 (Fee Waived)\n\n**📋 Sales Rep Attribution:** ${salesRepAttribution}\n\n**Status:** Pending Scheduling`.trim(),
          });

          await sendSMSNotification({
            customerName: input.fullName,
            customerPhone: input.phone,
            address: `${input.address}, ${input.cityStateZip}`,
            isPaid: false,
            promoCode: input.promoCode?.toUpperCase(),
            salesRep: salesRepAttribution,
          });

          return { success: true, requiresPayment: false, requestId: result.insertId };
        } else {
          const origin = ctx.req.headers.origin || "http://localhost:3000";
          
          const [result] = await db.insert(reportRequests).values({
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            address: input.address,
            cityStateZip: input.cityStateZip,
            roofAge: input.roofAge || null,
            roofConcerns: input.roofConcerns || null,
            handsOnInspection: input.handsOnInspection || false,
            promoCode: input.promoCode?.toUpperCase() || null,
            promoApplied: false,
            amountPaid: 0,
            status: "new_lead",
            leadSource: "website",
          });

          const requestId = result.insertId;

          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
              price_data: {
                currency: PRODUCTS.STORM_REPORT.currency,
                product_data: {
                  name: PRODUCTS.STORM_REPORT.name,
                  description: PRODUCTS.STORM_REPORT.description,
                },
                unit_amount: PRODUCTS.STORM_REPORT.priceInCents,
              },
              quantity: 1,
            }],
            mode: "payment",
            success_url: `${origin}/thank-you?success=true&request_id=${requestId}`,
            cancel_url: `${origin}/?cancelled=true`,
            customer_email: input.email,
            client_reference_id: requestId.toString(),
            metadata: {
              request_id: requestId.toString(),
              customer_name: input.fullName,
              customer_email: input.email,
              customer_phone: input.phone,
              address: input.address,
              city_state_zip: input.cityStateZip,
              hands_on_inspection: input.handsOnInspection ? "yes" : "no",
            },
          });

          await db.update(reportRequests)
            .set({ stripeCheckoutSessionId: session.id })
            .where(eq(reportRequests.id, requestId));

          return { success: true, requiresPayment: true, checkoutUrl: session.url, requestId };
        }
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

      const [totalLeads] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause);
      const [newLeads] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "new_lead")) : eq(reportRequests.status, "new_lead"));
      const [scheduledLeads] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause 
          ? and(whereClause, or(eq(reportRequests.status, "appointment_set"), eq(reportRequests.status, "inspection_scheduled")))
          : or(eq(reportRequests.status, "appointment_set"), eq(reportRequests.status, "inspection_scheduled"))
        );
      const [completedLeads] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(reportRequests)
        .where(whereClause ? and(whereClause, eq(reportRequests.status, "closed_won")) : eq(reportRequests.status, "closed_won"));
      const [totalRevenue] = await db.select({ sum: sql<number>`COALESCE(SUM(amountPaid), 0)` })
        .from(reportRequests)
        .where(whereClause);

      return {
        totalLeads: totalLeads?.count || 0,
        newLeads: newLeads?.count || 0,
        scheduledLeads: scheduledLeads?.count || 0,
        completedLeads: completedLeads?.count || 0,
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

    // Update lead (with permission check and edit history)
    updateLead: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assignedTo: z.number().optional(),
        internalNotes: z.string().optional(),
        scheduledDate: z.string().optional(),
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
        }
        if (input.priority && input.priority !== currentLead.priority) {
          updateData.priority = input.priority;
          await logEditHistory(db, input.id, user!.id, "priority", currentLead.priority, input.priority, "update", ctx);
        }
        if (input.assignedTo !== undefined && input.assignedTo !== currentLead.assignedTo) {
          updateData.assignedTo = input.assignedTo;
          await logEditHistory(db, input.id, user!.id, "assignedTo", String(currentLead.assignedTo || ""), String(input.assignedTo), "assign", ctx);
        }
        if (input.internalNotes !== undefined && input.internalNotes !== currentLead.internalNotes) {
          updateData.internalNotes = input.internalNotes;
          await logEditHistory(db, input.id, user!.id, "internalNotes", currentLead.internalNotes || "", input.internalNotes, "update", ctx);
        }
        if (input.scheduledDate) {
          updateData.scheduledDate = new Date(input.scheduledDate);
          await logEditHistory(db, input.id, user!.id, "scheduledDate", currentLead.scheduledDate?.toISOString() || "", input.scheduledDate, "update", ctx);
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

    // Add note to lead
    addNote: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        note: z.string().min(1),
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

        await db.insert(activities).values({
          reportRequestId: input.leadId,
          userId: ctx.user?.id,
          activityType: "note_added",
          description: input.note,
        });

        return { success: true };
      }),

    // Get pipeline data (role-based filtering)
    getPipeline: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let leads = await db.select().from(reportRequests).orderBy(desc(reportRequests.createdAt));
      
      // Filter by role
      leads = await filterLeadsByRole(db, ctx.user, leads);

      const pipeline = {
        new_lead: leads.filter(l => l.status === "new_lead"),
        contacted: leads.filter(l => l.status === "contacted"),
        appointment_set: leads.filter(l => l.status === "appointment_set"),
        inspection_scheduled: leads.filter(l => l.status === "inspection_scheduled"),
        inspection_complete: leads.filter(l => l.status === "inspection_complete"),
        report_sent: leads.filter(l => l.status === "report_sent"),
        follow_up: leads.filter(l => l.status === "follow_up"),
        closed_won: leads.filter(l => l.status === "closed_won"),
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
        role: z.enum(["admin", "owner", "office", "sales_rep", "team_lead"]),
        teamLeadId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only owners can create accounts
        if (!isOwner(ctx.user)) {
          throw new Error("Only owners can create team accounts");
        }

        // Check if email already exists
        const existing = await db.select().from(users).where(eq(users.email, input.email));
        if (existing.length > 0) {
          throw new Error("An account with this email already exists");
        }

        // Create the user account with a placeholder openId (will be updated on first login)
        const placeholderOpenId = `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const [newUser] = await db.insert(users).values({
          openId: placeholderOpenId,
          name: input.name,
          email: input.email,
          role: input.role,
          teamLeadId: input.teamLeadId || null,
          isActive: true,
        }).$returningId();

        // Send welcome email notification to owner with login details to share
        const loginUrl = process.env.NODE_ENV === 'production' 
          ? `https://${process.env.VITE_APP_ID}.manus.space/crm`
          : 'http://localhost:3000/crm';
        
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
        };
      }),

    // Get team leads for assignment dropdown
    getTeamLeads: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const teamLeads = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "team_lead"));

      return teamLeads;
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
        const filePath = `leads/${input.leadId}/${timestamp}_${safeName}`;

        // Upload to S3
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
        });

        // Log activity
        await db.insert(activities).values({
          reportRequestId: input.leadId,
          userId: ctx.user?.id,
          activityType: "document_uploaded",
          description: `Uploaded ${input.category.replace("_", " ")}: ${input.fileName}`,
        });

        return { success: true, documentId: result.insertId, url };
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
        const conversionRate = total > 0 ? ((closedWon / total) * 100).toFixed(1) : "0";
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
          if (lead.status === "closed_won") {
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

    // Get leads by category tabs (role-based)
    getLeadsByCategory: protectedProcedure
      .input(z.object({
        category: z.enum(["prospect", "in_progress", "completed", "invoiced", "closed_lost"]),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let statusFilter: string[] = [];
        switch (input.category) {
          case "prospect":
            statusFilter = ["new_lead", "contacted"];
            break;
          case "in_progress":
            statusFilter = ["appointment_set", "inspection_scheduled", "inspection_complete"];
            break;
          case "completed":
            statusFilter = ["report_sent", "follow_up"];
            break;
          case "invoiced":
            statusFilter = ["closed_won"];
            break;
          case "closed_lost":
            statusFilter = ["closed_lost", "cancelled"];
            break;
        }

        let leads = await db.select().from(reportRequests)
          .where(inArray(reportRequests.status, statusFilter as any))
          .orderBy(desc(reportRequests.createdAt));

        // Filter by role
        leads = await filterLeadsByRole(db, ctx.user, leads);

        return leads;
      }),

    // Get category counts for tabs (role-based)
    getCategoryCounts: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let leads = await db.select({
        status: reportRequests.status,
        assignedTo: reportRequests.assignedTo,
      }).from(reportRequests);

      // Filter by role
      leads = await filterLeadsByRole(db, ctx.user, leads);

      const statusMap = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        prospect: (statusMap["new_lead"] || 0) + (statusMap["contacted"] || 0),
        in_progress: (statusMap["appointment_set"] || 0) + (statusMap["inspection_scheduled"] || 0) + (statusMap["inspection_complete"] || 0),
        completed: (statusMap["report_sent"] || 0) + (statusMap["follow_up"] || 0),
        invoiced: statusMap["closed_won"] || 0,
        closed_lost: (statusMap["closed_lost"] || 0) + (statusMap["cancelled"] || 0),
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

        const enrichedActivities = jobActivities.map(a => ({
          ...a,
          user: a.userId ? userMap[a.userId] : null,
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
        });

        await db.insert(activities).values({
          reportRequestId: input.jobId,
          userId: ctx.user?.id,
          activityType: "photo_uploaded",
          description: `Uploaded photo: ${input.fileName}`,
        });

        return { success: true, documentId: result.insertId, url };
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
  }),
});

export type AppRouter = typeof appRouter;
