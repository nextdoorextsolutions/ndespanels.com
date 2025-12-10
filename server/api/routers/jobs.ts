/**
 * Jobs Router (formerly CRM Router)
 * 
 * Handles all job/lead operations, analytics, scheduling, and CRM functionality.
 * Extracted from server/routers.ts monolith for better maintainability.
 */

import { protectedProcedure, publicProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../../db";
import { reportRequests, users, activities, documents, editHistory, jobAttachments, notifications } from "../../../drizzle/schema";
import { eq, desc, and, or, like, sql, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { storagePut, STORAGE_BUCKET } from "../../storage";
import { supabaseAdmin } from "../../lib/supabase";
import { extractExifMetadata } from "../../lib/exif";
import * as solarApi from "../../lib/solarApi";
import { fetchEstimatorLeads, parseEstimatorAddress, formatEstimateData } from "../../lib/estimatorApi";
import { sendLienRightsAlertNotification, getLienRightsAlertJobs } from "../../lienRightsNotification";
import { 
  normalizeRole, 
  isOwner, 
  isAdmin, 
  isTeamLead, 
  canViewJob,
  canEditJob,
  canDeleteJob,
  canViewEditHistory,
  getTeamMemberIds,
  filterLeadsByRole,
} from "../../lib/rbac"; 
import { logEditHistory } from "../../lib/editHistory";

// Email validation helper - allows empty string or valid email
const emailOrEmpty = z.string().refine(
  (val) => !val || val.length === 0 || z.string().email().safeParse(val).success,
  { message: "Must be a valid email address or empty" }
);


// Exported Jobs Router
export const jobsRouter = router({
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

      // PERFORMANCE OPTIMIZATION: Single aggregated query instead of 20+ separate queries
      // This reduces database round trips from 20+ to 1, improving dashboard load time by ~95%
      const [stats] = await db.select({
        // Total count
        totalLeads: sql<number>`COUNT(*)`,
        // Pipeline stage counts using CASE statements
        leadCount: sql<number>`COUNT(CASE WHEN ${reportRequests.status} = 'lead' THEN 1 END)`,
        appointmentSetCount: sql<number>`COUNT(CASE WHEN ${reportRequests.status} = 'appointment_set' THEN 1 END)`,
        prospectCount: sql<number>`COUNT(CASE WHEN ${reportRequests.status} = 'prospect' THEN 1 END)`,
        approvedCount: sql<number>`COUNT(CASE WHEN ${reportRequests.status} = 'approved' THEN 1 END)`,
        projectScheduledCount: sql<number>`COUNT(CASE WHEN ${reportRequests.status} = 'project_scheduled' THEN 1 END)`,
        completedCount: sql<number>`COUNT(CASE WHEN ${reportRequests.status} = 'completed' THEN 1 END)`,
        invoicedCount: sql<number>`COUNT(CASE WHEN ${reportRequests.status} = 'invoiced' THEN 1 END)`,
        lienLegalCount: sql<number>`COUNT(CASE WHEN ${reportRequests.status} = 'lien_legal' THEN 1 END)`,
        closedDealCount: sql<number>`COUNT(CASE WHEN ${reportRequests.status} = 'closed_deal' THEN 1 END)`,
        closedLostCount: sql<number>`COUNT(CASE WHEN ${reportRequests.status} = 'closed_lost' THEN 1 END)`,
        // Deal type counts
        insuranceCount: sql<number>`COUNT(CASE WHEN ${reportRequests.dealType} = 'insurance' THEN 1 END)`,
        cashCount: sql<number>`COUNT(CASE WHEN ${reportRequests.dealType} = 'cash' THEN 1 END)`,
        financedCount: sql<number>`COUNT(CASE WHEN ${reportRequests.dealType} = 'financed' THEN 1 END)`,
        // Lien rights urgency counts
        lienActiveCount: sql<number>`COUNT(CASE WHEN ${reportRequests.lienRightsStatus} = 'active' THEN 1 END)`,
        lienWarningCount: sql<number>`COUNT(CASE WHEN ${reportRequests.lienRightsStatus} = 'warning' THEN 1 END)`,
        lienCriticalCount: sql<number>`COUNT(CASE WHEN ${reportRequests.lienRightsStatus} = 'critical' THEN 1 END)`,
        lienExpiredCount: sql<number>`COUNT(CASE WHEN ${reportRequests.lienRightsStatus} = 'expired' THEN 1 END)`,
        // Total revenue
        totalRevenue: sql<number>`COALESCE(SUM(${reportRequests.amountPaid}), 0)`,
      })
      .from(reportRequests)
      .where(whereClause);

      return {
        totalLeads: stats?.totalLeads || 0,
        // Pipeline stages
        leadCount: stats?.leadCount || 0,
        appointmentSetCount: stats?.appointmentSetCount || 0,
        prospectCount: stats?.prospectCount || 0,
        approvedCount: stats?.approvedCount || 0,
        projectScheduledCount: stats?.projectScheduledCount || 0,
        completedCount: stats?.completedCount || 0,
        invoicedCount: stats?.invoicedCount || 0,
        lienLegalCount: stats?.lienLegalCount || 0,
        closedDealCount: stats?.closedDealCount || 0,
        closedLostCount: stats?.closedLostCount || 0,
        // Deal types
        insuranceCount: stats?.insuranceCount || 0,
        cashCount: stats?.cashCount || 0,
        financedCount: stats?.financedCount || 0,
        // Lien rights
        lienActiveCount: stats?.lienActiveCount || 0,
        lienWarningCount: stats?.lienWarningCount || 0,
        lienCriticalCount: stats?.lienCriticalCount || 0,
        lienExpiredCount: stats?.lienExpiredCount || 0,
        // Revenue
        totalRevenue: (stats?.totalRevenue || 0) / 100,
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

        // PERFORMANCE OPTIMIZATION: Select only fields needed for leads table
        let leads = await db.select({
          id: reportRequests.id,
          fullName: reportRequests.fullName,
          email: reportRequests.email,
          phone: reportRequests.phone,
          address: reportRequests.address,
          cityStateZip: reportRequests.cityStateZip,
          status: reportRequests.status,
          dealType: reportRequests.dealType,
          amountPaid: reportRequests.amountPaid,
          assignedTo: reportRequests.assignedTo,
          promoCode: reportRequests.promoCode,
          salesRepCode: reportRequests.salesRepCode,
          createdAt: reportRequests.createdAt,
          updatedAt: reportRequests.updatedAt,
        }).from(reportRequests).orderBy(desc(reportRequests.createdAt));
        
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

        const leadActivities = await db.select({
          id: activities.id,
          reportRequestId: activities.reportRequestId,
          userId: activities.userId,
          activityType: activities.activityType,
          description: activities.description,
          metadata: activities.metadata,
          parentId: activities.parentId,
          tags: activities.tags,
          createdAt: activities.createdAt,
        }).from(activities)
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
        email: emailOrEmpty.optional(), // Allows empty string or valid email
        phone: z.string().optional(), // Made optional
        address: z.string().min(5),
        cityStateZip: z.string().min(5),
        latitude: z.number().optional(), // Geocoded latitude
        longitude: z.number().optional(), // Geocoded longitude
        roofAge: z.string().optional(),
        roofConcerns: z.string().optional(),
        dealType: z.enum(["insurance", "cash", "financed"]).optional(),
        // Secondary contact
        secondaryFirstName: z.string().optional(),
        secondaryLastName: z.string().optional(),
        secondaryPhone: z.string().optional(),
        secondaryEmail: emailOrEmpty.optional(), // Allows empty string or valid email
        secondaryRelation: z.string().optional(),
        // Site access
        gateCode: z.string().optional(),
        accessInstructions: z.string().optional(),
        // Insurance
        insuranceCarrier: z.string().optional(),
        policyNumber: z.string().optional(),
        claimNumber: z.string().optional(),
        deductible: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // All authenticated users can create jobs (Sales Reps, Team Leads, Admins, Owners)
        // Note: Job will be assigned to the creator by default

        const [result] = await db.insert(reportRequests).values({
          fullName: input.fullName,
          email: input.email || null,
          phone: input.phone || null,
          address: input.address,
          cityStateZip: input.cityStateZip,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          roofAge: input.roofAge || null,
          roofConcerns: input.roofConcerns || null,
          dealType: input.dealType || "cash",
          // Secondary contact
          secondaryFirstName: input.secondaryFirstName || null,
          secondaryLastName: input.secondaryLastName || null,
          secondaryPhone: input.secondaryPhone || null,
          secondaryEmail: input.secondaryEmail || null,
          secondaryRelation: input.secondaryRelation || null,
          // Site access
          gateCode: input.gateCode || null,
          accessInstructions: input.accessInstructions || null,
          // Insurance
          insuranceCarrier: input.insuranceCarrier || null,
          policyNumber: input.policyNumber || null,
          claimNumber: input.claimNumber || null,
          deductible: input.deductible ? input.deductible.toString() : null,
          // Assignment - automatically assign to creator
          assignedTo: ctx.user.id,
          teamLeadId: ctx.user.teamLeadId || null,
          status: "lead",
          priority: "medium" as const,
          handsOnInspection: false,
          amountPaid: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning({ id: reportRequests.id });

        const newJobId = result.id;
        const [newJob] = await db.select().from(reportRequests).where(eq(reportRequests.id, newJobId));
        if (!newJob) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve created job' });

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
        manualAreaSqFt: z.number().nullable().optional(), // Manual roof area override
        attachments: z.array(z.object({
          fileName: z.string(),
          fileData: z.string(), // Base64 encoded file data
          fileType: z.string().optional(),
        })).optional(),
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

        // Validate data quality for status changes (Safety Net)
        if (input.status && input.status !== currentLead.status) {
          const allowedWithoutData = ['lead', 'appointment_set'];
          
          if (!allowedWithoutData.includes(input.status)) {
            const hasPhone = currentLead.phone && currentLead.phone.trim() !== '';
            const hasEmail = currentLead.email && currentLead.email.trim() !== '';
            
            if (!hasPhone || !hasEmail) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Cannot advance pipeline: Customer Phone and Email are required.",
              });
            }
          }
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
        if (input.manualAreaSqFt !== undefined && input.manualAreaSqFt !== currentLead.manualAreaSqFt) {
          updateData.manualAreaSqFt = input.manualAreaSqFt;
          await logEditHistory(db, input.id, user!.id, "manualAreaSqFt", String(currentLead.manualAreaSqFt || ""), String(input.manualAreaSqFt || ""), "update", ctx);
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
        email: emailOrEmpty.optional(), // Allows empty string or valid email
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

    // Update insurance info
    updateInsuranceInfo: protectedProcedure
      .input(z.object({
        id: z.number(),
        insuranceCarrier: z.string().nullable().optional(),
        policyNumber: z.string().nullable().optional(),
        claimNumber: z.string().nullable().optional(),
        deductible: z.number().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get current job data
        const [currentJob] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.id));
        if (!currentJob) throw new Error("Job not found");

        // Check permission
        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canEditJob(user, currentJob, teamMemberIds)) {
          throw new Error("You don't have permission to edit this job");
        }

        const updateData: Record<string, unknown> = {};
        const fieldsToCheck = [
          { key: "insuranceCarrier", current: currentJob.insuranceCarrier, new: input.insuranceCarrier },
          { key: "policyNumber", current: currentJob.policyNumber, new: input.policyNumber },
          { key: "claimNumber", current: currentJob.claimNumber, new: input.claimNumber },
        ];

        for (const field of fieldsToCheck) {
          if (field.new !== undefined && field.new !== field.current) {
            updateData[field.key] = field.new;
            await logEditHistory(db, input.id, user!.id, field.key, String(field.current || ""), String(field.new || ""), "update", ctx);
          }
        }

        // Handle deductible (numeric field)
        if (input.deductible !== undefined && input.deductible !== (currentJob.deductible ? parseFloat(currentJob.deductible) : null)) {
          updateData.deductible = input.deductible !== null ? input.deductible.toString() : null;
          await logEditHistory(
            db, 
            input.id, 
            user!.id, 
            "deductible", 
            currentJob.deductible ? String(currentJob.deductible) : "", 
            input.deductible !== null ? String(input.deductible) : "", 
            "update", 
            ctx
          );
        }

        if (Object.keys(updateData).length > 0) {
          await db.update(reportRequests).set(updateData).where(eq(reportRequests.id, input.id));
          
          // Log activity
          await db.insert(activities).values({
            reportRequestId: input.id,
            userId: ctx.user?.id,
            activityType: "note_added",
            description: `Insurance info updated: ${Object.keys(updateData).join(", ")}`,
          });
        }

        return { success: true };
      }),

    // Generate Roof Report (Manual Solar API Fetch)
    generateRoofReport: protectedProcedure
      .input(z.object({ 
        jobId: z.number() 
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get job data
        const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
        if (!job) throw new Error("Job not found");

        // Check permission
        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        if (!canViewJob(user, job, teamMemberIds)) {
          throw new Error("You don't have permission to view this job");
        }

        // Validate coordinates
        if (!solarApi.hasValidCoordinates(job.latitude, job.longitude)) {
          throw new Error("Job does not have valid coordinates. Please update the address first.");
        }

        console.log(`[GenerateRoofReport] Fetching Solar API data for job ${input.jobId}`);
        
        // Fetch Solar API data with error handling
        let solarData;
        try {
          solarData = await solarApi.fetchSolarApiData(job.latitude!, job.longitude!);
          console.log(`[GenerateRoofReport] Solar API response received:`, {
            coverage: solarData.coverage,
            hasImageryUrl: !!solarData.imageryUrl,
            hasSolarPotential: !!solarData.solarPotential,
          });
        } catch (error) {
          console.error(`[GenerateRoofReport] Error calling fetchSolarApiData:`, error);
          throw new Error(`Failed to fetch roof data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Debug: Verify imageryUrl is present
        if (!solarData.imageryUrl) {
          console.error(`[GenerateRoofReport] WARNING: No imageryUrl in response!`, solarData);
        }
        
        // Update job with Solar API data
        await db.update(reportRequests)
          .set({ 
            solarApiData: solarData as any,
            updatedAt: new Date()
          })
          .where(eq(reportRequests.id, input.jobId));
        
        console.log(`[GenerateRoofReport] Roof API data saved. Coverage: ${solarData.coverage}`);
        
        // Log activity
        await db.insert(activities).values({
          reportRequestId: input.jobId,
          userId: ctx.user?.id,
          activityType: "note_added",
          description: solarData.coverage 
            ? "Production measurement report generated" 
            : "Roof report generation attempted - 3D roof data not available for this location",
        });

        // Return updated job data
        const [updatedJob] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
        if (!updatedJob) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found after update' });
        
        return {
          success: true,
          coverage: solarData.coverage,
          solarApiData: updatedJob.solarApiData,
        };
      }),

    // Import Leads from Estimator
    importEstimatorLeads: protectedProcedure
      .input(z.object({
        estimatorUrl: z.string().url(),
        sessionCookie: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only owners and admins can import leads
        if (!isOwner(ctx.user) && !isAdmin(ctx.user)) {
          throw new Error("Only owners and admins can import leads");
        }

        console.log(`[ImportEstimatorLeads] Fetching leads from: ${input.estimatorUrl}`);

        try {
          // Fetch leads from estimator API
          const estimatorLeads = await fetchEstimatorLeads(input.estimatorUrl, input.sessionCookie);
          
          const importResults = {
            total: estimatorLeads.length,
            imported: 0,
            skipped: 0,
            errors: [] as string[],
          };

          // Import each lead
          for (const lead of estimatorLeads) {
            try {
              // Parse address
              const { streetAddress, cityStateZip } = parseEstimatorAddress(lead.address);
              
              // Check if lead already exists by ADDRESS (most important for roofing)
              // This allows same person to have multiple estimates at different properties
              const existingLead = await db
                .select()
                .from(reportRequests)
                .where(
                  and(
                    eq(reportRequests.address, streetAddress),
                    eq(reportRequests.cityStateZip, cityStateZip)
                  )
                )
                .limit(1);

              if (existingLead.length > 0) {
                console.log(`[ImportEstimatorLeads] Skipping duplicate lead for address: ${streetAddress}`);
                importResults.skipped++;
                continue;
              }

              // Format estimate data
              const estimatorData = formatEstimateData(lead.estimate);

              // Create new job
              await db.insert(reportRequests).values({
                fullName: lead.name,
                email: lead.email || null,
                phone: lead.phone || null,
                address: streetAddress,
                cityStateZip: cityStateZip,
                estimatorData: estimatorData as any,
                status: "lead",
                priority: "medium" as const,
                leadSource: "estimator",
                handsOnInspection: false,
                amountPaid: 0,
                internalNotes: lead.notes || null,
                createdAt: new Date(lead.createdAt),
                updatedAt: new Date(),
              });

              importResults.imported++;
              console.log(`[ImportEstimatorLeads] Imported lead: ${lead.name}`);
            } catch (error) {
              console.error(`[ImportEstimatorLeads] Error importing lead ${lead.name}:`, error);
              importResults.errors.push(`${lead.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          console.log(`[ImportEstimatorLeads] Import complete:`, importResults);
          return importResults;
        } catch (error) {
          console.error('[ImportEstimatorLeads] Error fetching leads:', error);
          throw new Error(`Failed to fetch leads from estimator: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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

    // Get edit history for a job (OWNER/ADMIN only)
    getEditHistory: protectedProcedure
      .input(z.object({ 
        jobId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Strict permission check - Only OWNER and ADMIN can view edit history
        if (ctx.user?.role !== 'owner' && ctx.user?.role !== 'admin' && ctx.user?.role !== 'office') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only owners and admins can view edit history',
          });
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

    // Get pipeline data (role-based filtering)
    getPipeline: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // PERFORMANCE OPTIMIZATION: Select only fields needed for pipeline cards
      // This reduces payload size by 60-70% and improves network transfer speed
      let leads = await db.select({
        id: reportRequests.id,
        fullName: reportRequests.fullName,
        address: reportRequests.address,
        phone: reportRequests.phone,
        status: reportRequests.status,
        dealType: reportRequests.dealType,
        amountPaid: reportRequests.amountPaid,
        assignedTo: reportRequests.assignedTo,
        projectCompletedAt: reportRequests.projectCompletedAt,
        createdAt: reportRequests.createdAt,
      }).from(reportRequests).orderBy(desc(reportRequests.createdAt));
      
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

    // ============ DOCUMENT UPLOAD ============
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
          assignedUser = assignedUserData || null; // Handle case where user might not exist
        }

        // Get all activities (timeline)
        const jobActivities = await db.select({
          id: activities.id,
          activityType: activities.activityType,
          description: activities.description,
          metadata: activities.metadata,
          parentId: activities.parentId,
          tags: activities.tags,
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
          tags: a.tags || [], // Ensure tags is always an array, never null
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
        attachments: z.array(z.object({
          fileName: z.string(),
          fileData: z.string(), // Base64 encoded file data
          fileType: z.string().optional(),
        })).optional(),
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

        // Extract mentions from message and create notifications
        // Format: @[userId:userName]
        const mentionRegex = /@\[(\d+):([^\]]+)\]/g;
        const mentions = Array.from(input.message.matchAll(mentionRegex));
        
        if (mentions.length > 0 && ctx.user?.id) {
          for (const match of mentions) {
            const mentionedUserId = parseInt(match[1]);
            const mentionedUserName = match[2];
            
            // Don't notify yourself
            if (mentionedUserId !== ctx.user.id) {
              await db.insert(notifications).values({
                userId: mentionedUserId,
                createdBy: ctx.user.id,
                resourceId: input.jobId,
                type: 'mention',
                content: `${ctx.user.name || ctx.user.email} mentioned you in Job #${input.jobId}${lead.fullName ? ` (${lead.fullName})` : ''}`,
                isRead: false,
              });
            }
          }
        }

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
.where(and(isNotNull(users.name), eq(users.isActive, true))) // Only show active users with names
        .orderBy(users.name);

        return allUsers;
      }),

});
