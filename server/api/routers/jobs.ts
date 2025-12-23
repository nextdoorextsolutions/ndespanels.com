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
import { reportRequests, users, activities, documents, editHistory, jobAttachments, notifications, systemCache } from "../../../drizzle/schema";
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
import { GoogleGenerativeAI } from "@google/generative-ai";

// Import sub-routers for modular architecture
import { analyticsRouter } from "./jobs/analytics";
import { documentsRouter } from "./jobs/documents";
import { lienRightsRouter } from "./jobs/lien-rights";

// Email validation helper - allows empty string or valid email
const emailOrEmpty = z.string().refine(
  (val) => !val || val.length === 0 || z.string().email().safeParse(val).success,
  { message: "Must be a valid email address or empty" }
);


// Exported Jobs Router
export const jobsRouter = router({
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

        console.log('[getLead] User accessing job:', ctx.user?.email, 'Role:', ctx.user?.role, 'Job ID:', input.id);

        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.id));
        if (!lead) {
          console.error('[getLead] Lead not found:', input.id);
          throw new Error("Lead not found");
        }

        // Check permission
        const user = ctx.user;
        const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
        const hasPermission = canViewJob(user, lead, teamMemberIds);
        
        console.log('[getLead] Permission check - User:', user?.email, 'Role:', user?.role, 'Can view:', hasPermission);
        
        if (!hasPermission) {
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

        // Enrich activities with user information
        const userIds = Array.from(new Set(leadActivities.map(a => a.userId).filter((id): id is number => id !== null && id !== undefined)));
        const activityUsers = userIds.length > 0
          ? await db.select({ id: users.id, name: users.name, email: users.email })
              .from(users)
              .where(inArray(users.id, userIds))
          : [];
        
        const userMap = new Map(activityUsers.map(u => [u.id, u]));
        const enrichedActivities = leadActivities.map(activity => ({
          ...activity,
          user: activity.userId ? userMap.get(activity.userId) : null,
        }));

        const leadDocuments = await db.select().from(documents)
          .where(eq(documents.reportRequestId, input.id))
          .orderBy(desc(documents.createdAt));

        return { ...lead, activities: enrichedActivities, documents: leadDocuments };
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
        approvedAmount: z.number().nullable().optional(), // Approved amount (visible after approval)
        extrasCharged: z.number().nullable().optional(), // Additional charges for extras/change orders
        supplementNumbers: z.string().nullable().optional(), // Supplement numbers for insurance claims
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
            // Check incoming data first, then fall back to current database values
            const phoneToCheck = input.phone !== undefined ? input.phone : currentLead.phone;
            const emailToCheck = input.email !== undefined ? input.email : currentLead.email;
            
            const hasPhone = phoneToCheck && phoneToCheck.trim() !== '';
            const hasEmail = emailToCheck && emailToCheck.trim() !== '';
            
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
        if (input.approvedAmount !== undefined && input.approvedAmount !== Number(currentLead.approvedAmount)) {
          updateData.approvedAmount = input.approvedAmount;
          await logEditHistory(db, input.id, user!.id, "approvedAmount", String(currentLead.approvedAmount || ""), String(input.approvedAmount || ""), "update", ctx);
        }
        if (input.extrasCharged !== undefined && input.extrasCharged !== Number(currentLead.extrasCharged)) {
          updateData.extrasCharged = input.extrasCharged;
          await logEditHistory(db, input.id, user!.id, "extrasCharged", String(currentLead.extrasCharged || ""), String(input.extrasCharged || ""), "update", ctx);
        }
        if (input.supplementNumbers !== undefined && input.supplementNumbers !== currentLead.supplementNumbers) {
          updateData.supplementNumbers = input.supplementNumbers;
          await logEditHistory(db, input.id, user!.id, "supplementNumbers", currentLead.supplementNumbers || "", input.supplementNumbers || "", "update", ctx);
        }
        
        // Handle phone and email updates
        if (input.phone !== undefined && input.phone !== currentLead.phone) {
          updateData.phone = input.phone;
          await logEditHistory(db, input.id, user!.id, "phone", currentLead.phone || "", input.phone, "update", ctx);
        }
        
        if (input.email !== undefined && input.email !== currentLead.email) {
          updateData.email = input.email;
          await logEditHistory(db, input.id, user!.id, "email", currentLead.email || "", input.email, "update", ctx);
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

    // Update selected product for proposal
    updateProduct: protectedProcedure
      .input(z.object({
        id: z.number(),
        selectedProductId: z.number().nullable(),
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

        // Update the selected product
        await db.update(reportRequests)
          .set({ 
            selectedProductId: input.selectedProductId,
            updatedAt: new Date()
          })
          .where(eq(reportRequests.id, input.id));

        // Log edit history
        await logEditHistory(
          db,
          input.id,
          user?.id || 0,
          "selected_product_id",
          currentLead.selectedProductId?.toString() || null,
          input.selectedProductId?.toString() || null,
          "update",
          ctx
        );

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

    // Toggle follow-up status on a job
    toggleFollowUp: protectedProcedure
      .input(z.object({ 
        jobId: z.number(),
        needsFollowUp: z.boolean()
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
        if (!canEditJob(user, job, teamMemberIds)) {
          throw new Error("You don't have permission to edit this job");
        }

        // Update follow-up status
        await db.update(reportRequests)
          .set({ 
            needsFollowUp: input.needsFollowUp,
            followUpRequestedAt: input.needsFollowUp ? new Date() : null,
            followUpRequestedBy: input.needsFollowUp ? user!.id : null,
            updatedAt: new Date()
          })
          .where(eq(reportRequests.id, input.jobId));

        // Log activity
        await db.insert(activities).values({
          reportRequestId: input.jobId,
          userId: user?.id,
          activityType: "note_added",
          description: input.needsFollowUp 
            ? `Follow-up requested by ${user?.name || user?.email}`
            : `Follow-up cleared by ${user?.name || user?.email}`,
        });

        // If follow-up is requested and job has an assigned sales rep, create notification
        if (input.needsFollowUp && job.assignedTo && job.assignedTo !== user?.id) {
          await db.insert(notifications).values({
            userId: job.assignedTo,
            createdBy: user?.id,
            resourceId: input.jobId,
            type: "assignment",
            content: `${user?.name || user?.email} requested follow-up on: ${job.fullName} - ${job.address}`,
            isRead: false,
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
          ? db.select({
              id: reportRequests.id,
              fullName: reportRequests.fullName,
              email: reportRequests.email,
              phone: reportRequests.phone,
              address: reportRequests.address,
              cityStateZip: reportRequests.cityStateZip,
              status: reportRequests.status,
              dealType: reportRequests.dealType,
              salesRepCode: reportRequests.salesRepCode,
              leadSource: reportRequests.leadSource,
              insuranceCarrier: reportRequests.insuranceCarrier,
              amountPaid: reportRequests.amountPaid,
              totalPrice: reportRequests.totalPrice,
              approvedAmount: reportRequests.approvedAmount,
              manualAreaSqFt: reportRequests.manualAreaSqFt,
              scheduledDate: reportRequests.scheduledDate,
              completedDate: reportRequests.completedDate,
              createdAt: reportRequests.createdAt,
              assignedTo: reportRequests.assignedTo,
            }).from(reportRequests).where(and(...conditions)).orderBy(desc(reportRequests.createdAt))
          : db.select({
              id: reportRequests.id,
              fullName: reportRequests.fullName,
              email: reportRequests.email,
              phone: reportRequests.phone,
              address: reportRequests.address,
              cityStateZip: reportRequests.cityStateZip,
              status: reportRequests.status,
              dealType: reportRequests.dealType,
              salesRepCode: reportRequests.salesRepCode,
              leadSource: reportRequests.leadSource,
              insuranceCarrier: reportRequests.insuranceCarrier,
              amountPaid: reportRequests.amountPaid,
              totalPrice: reportRequests.totalPrice,
              approvedAmount: reportRequests.approvedAmount,
              manualAreaSqFt: reportRequests.manualAreaSqFt,
              scheduledDate: reportRequests.scheduledDate,
              completedDate: reportRequests.completedDate,
              createdAt: reportRequests.createdAt,
              assignedTo: reportRequests.assignedTo,
            }).from(reportRequests).orderBy(desc(reportRequests.createdAt));

        let leads = await query;
        
        // Filter by role
        leads = await filterLeadsByRole(db, ctx.user, leads);
        
        return leads;
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

    // ============ SOLAR API ============

    // Get solar building data (moved from frontend for API key security)
    getSolarBuildingData: protectedProcedure
      .input(z.object({
        lat: z.number(),
        lng: z.number(),
      }))
      .query(async ({ input }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY not configured");
        }

        try {
          // Call Google Solar API
          const solarUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${input.lat}&location.longitude=${input.lng}&key=${apiKey}`;
          
          const response = await fetch(solarUrl);
          
          if (!response.ok) {
            if (response.status === 404) {
              return {
                success: false,
                error: "No solar data available for this location",
                status: 404
              };
            }
            
            const errorText = await response.text();
            console.error(`[Solar API] Error (${response.status}):`, errorText);
            throw new Error(`Solar API Error: ${response.status}`);
          }

          const data = await response.json();
          
          return {
            success: true,
            data
          };
        } catch (error) {
          console.error("[Solar API] Error:", error);
          throw new Error(error instanceof Error ? error.message : "Failed to fetch solar data");
        }
      }),

    // AI-Powered Executive Summary for Dashboard
    getExecutiveSummary: protectedProcedure
      .input(z.object({
        force: z.boolean().optional().default(false),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!ctx.user?.id) throw new Error("User not authenticated");

        // Security: Only admin and owner can access executive summary
        const userRole = normalizeRole(ctx.user.role);
        if (!isOwner(ctx.user) && !isAdmin(ctx.user)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Only administrators and owners can access executive summary",
          });
        }

        const CACHE_KEY = "executive_summary";
        const CACHE_DURATION_MS = 60 * 60 * 1000; // 60 minutes (1 hour)

        try {
          // STEP A: Check cache (unless force refresh)
          if (!input.force) {
            const [cached] = await db
              .select()
              .from(systemCache)
              .where(eq(systemCache.key, CACHE_KEY))
              .limit(1);

            if (cached) {
              const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
              
              // Return cached data if less than 15 minutes old
              if (cacheAge < CACHE_DURATION_MS) {
                console.log(`[Executive Summary] Returning cached data (age: ${Math.round(cacheAge / 1000)}s)`);
                return cached.data as any;
              }
              
              console.log(`[Executive Summary] Cache expired (age: ${Math.round(cacheAge / 1000)}s), regenerating...`);
            } else {
              console.log("[Executive Summary] No cache found, generating fresh data...");
            }
          } else {
            console.log("[Executive Summary] Force refresh requested, bypassing cache...");
          }

          // STEP B: Fetch fresh data and call AI
          // Get current month date range
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

          // Fetch key stats for current month
          const allJobs = await db
            .select()
            .from(reportRequests)
            .where(
              and(
                gte(reportRequests.createdAt, firstDayOfMonth),
                lte(reportRequests.createdAt, lastDayOfMonth)
              )
            );

          const totalRevenue = allJobs
            .filter(j => ['completed', 'invoiced', 'closed_deal'].includes(j.status))
            .reduce((sum, j) => sum + (j.amountPaid / 100), 0);

          const pipelineCount = allJobs.length;
          const wonJobs = allJobs.filter(j => ['completed', 'invoiced', 'closed_deal'].includes(j.status));
          const winRate = pipelineCount > 0 ? (wonJobs.length / pipelineCount) * 100 : 0;

          // Fetch last 5 recent activities
          const recentActivities = await db
            .select({
              type: activities.activityType,
              description: activities.description,
              createdAt: activities.createdAt,
              jobName: reportRequests.fullName,
              jobStatus: reportRequests.status,
            })
            .from(activities)
            .leftJoin(reportRequests, eq(activities.reportRequestId, reportRequests.id))
            .orderBy(desc(activities.createdAt))
            .limit(5);

          // Prepare data for AI
          const statsData = {
            totalRevenue: `$${totalRevenue.toFixed(2)}`,
            pipelineCount,
            winRate: `${winRate.toFixed(1)}%`,
            recentActivities: recentActivities.map(a => ({
              type: a.type,
              description: a.description,
              jobName: a.jobName,
              jobStatus: a.jobStatus,
            })),
          };

          // Initialize Gemini AI
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

          const systemPrompt = `You are an expert Sales Director analyzing CRM performance data. 
Provide exactly 3 short, high-impact bullet points of actionable advice for the business owner.
Focus on:
- Identifying risks (stalled deals, low conversion rates, inactive leads)
- Celebrating wins (high revenue, strong conversion, successful closes)
- Recommending specific actions to improve performance

Be concise, direct, and business-focused. Each bullet point should be 1-2 sentences maximum.
Return ONLY a JSON array of 3 objects with this structure:
[
  { "title": "Brief Title", "description": "Actionable insight", "type": "success" | "warning" | "info" },
  { "title": "Brief Title", "description": "Actionable insight", "type": "success" | "warning" | "info" },
  { "title": "Brief Title", "description": "Actionable insight", "type": "success" | "warning" | "info" }
]`;

          const prompt = `Analyze this CRM data and provide 3 actionable insights:

STATS FOR CURRENT MONTH:
- Total Revenue: ${statsData.totalRevenue}
- Pipeline Count: ${statsData.pipelineCount} jobs
- Win Rate: ${statsData.winRate}

RECENT ACTIVITIES:
${statsData.recentActivities.map((a, i) => `${i + 1}. ${a.type}: ${a.description || a.jobName} (Status: ${a.jobStatus})`).join('\n')}

Return ONLY the JSON array, no other text.`;

          const aiResult = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: systemPrompt,
          });

          const response = await aiResult.response;
          const text = response.text();
          
          // Parse JSON response
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            throw new Error("Invalid AI response format");
          }

          const insights = JSON.parse(jsonMatch[0]);

          const summaryResult = {
            insights,
            stats: statsData,
            generatedAt: new Date().toISOString(),
          };

          // STEP C: Save to cache
          try {
            const [existing] = await db
              .select()
              .from(systemCache)
              .where(eq(systemCache.key, CACHE_KEY))
              .limit(1);

            if (existing) {
              // Update existing cache
              await db
                .update(systemCache)
                .set({
                  data: summaryResult as any,
                  updatedAt: new Date(),
                })
                .where(eq(systemCache.key, CACHE_KEY));
              console.log("[Executive Summary] Cache updated successfully");
            } else {
              // Insert new cache entry
              await db.insert(systemCache).values({
                key: CACHE_KEY,
                data: summaryResult as any,
                updatedAt: new Date(),
              });
              console.log("[Executive Summary] Cache created successfully");
            }
          } catch (cacheError) {
            console.error("[Executive Summary] Failed to save cache:", cacheError);
            // Continue anyway - cache failure shouldn't break the response
          }

          return summaryResult;
        } catch (error) {
          console.error("[Executive Summary] AI Error:", error);
          // Return fallback insights if AI fails
          return {
            insights: [
              {
                title: "Performance Update",
                description: "Unable to generate AI insights at this time. Please check your API configuration.",
                type: "info",
              },
            ],
            stats: {
              totalRevenue: "$0.00",
              pipelineCount: 0,
              winRate: "0%",
              recentActivities: [],
            },
            generatedAt: new Date().toISOString(),
          };
        }
      }),

    // ============================================================================
    // MERGED SUB-ROUTERS - Maintaining flat API structure for backward compatibility
    // ============================================================================
    // Analytics: getStats, getPipeline, getReportStats, getMonthlyTrends, getLeadsByCategory, getCategoryCounts
    // Documents: uploadPhoto, getJobForUpload, uploadFieldPhoto, searchJob
    // Lien Rights: getLienRightsJobs, getLienRightsAlertSummary, sendLienRightsAlert
    ...analyticsRouter._def.procedures,
    ...documentsRouter._def.procedures,
    ...lienRightsRouter._def.procedures,
});
