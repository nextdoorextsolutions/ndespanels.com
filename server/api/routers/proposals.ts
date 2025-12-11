import { protectedProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../../db";
import { reportRequests, documents } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin } from "../../lib/supabase";
import { isTeamLead, canEditJob, canViewJob } from "../../lib/rbac";

// Import helper functions (these should be in a shared utilities file)
async function getTeamMemberIds(db: any, teamLeadId: number): Promise<number[]> {
  const { users } = await import("../../../drizzle/schema");
  const members = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.teamLeadId, teamLeadId));
  return members.map((m: any) => m.id);
}

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
  const { editHistory } = await import("../../../drizzle/schema");
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

/**
 * Proposals Router
 * Handles proposal pricing, PDF generation, and signature workflows
 */
export const proposalsRouter = router({
  // Update proposal pricing
  updateProposal: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      pricePerSq: z.string().nullable().optional(),
      totalPrice: z.string().nullable().optional(),
      counterPrice: z.string().nullable().optional(),
      priceStatus: z.enum(["draft", "pending_approval", "negotiation", "approved"]).optional(),
      manualAreaSqFt: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get current job
      const [currentJob] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
      if (!currentJob) throw new Error("Job not found");

      // Check permission
      const user = ctx.user;
      const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
      if (!canEditJob(user, currentJob, teamMemberIds)) {
        throw new Error("You don't have permission to edit this job");
      }

      const updateData: Record<string, unknown> = {};

      if (input.pricePerSq !== undefined) {
        updateData.pricePerSq = input.pricePerSq;
      }
      if (input.totalPrice !== undefined) {
        updateData.totalPrice = input.totalPrice;
      }
      if (input.counterPrice !== undefined) {
        updateData.counterPrice = input.counterPrice;
      }
      if (input.priceStatus) {
        updateData.priceStatus = input.priceStatus;
      }
      if (input.manualAreaSqFt !== undefined) {
        updateData.manualAreaSqFt = input.manualAreaSqFt;
      }

      updateData.updatedAt = new Date();

      await db.update(reportRequests)
        .set(updateData)
        .where(eq(reportRequests.id, input.jobId));

      // Log the proposal update
      await logEditHistory(
        db,
        input.jobId,
        user!.id,
        "proposal",
        null,
        `Updated proposal: ${input.priceStatus || 'pricing changed'}`,
        "update",
        ctx
      );

      return { success: true };
    }),

  // Generate proposal PDF
  generateProposal: protectedProcedure
    .input(z.object({
      jobId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get job details
      const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
      if (!job) throw new Error("Job not found");

      // Check permission
      const user = ctx.user;
      const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
      if (!canViewJob(user, job, teamMemberIds)) {
        throw new Error("You don't have permission to view this job");
      }

      // Verify proposal is approved
      if (job.priceStatus !== 'approved') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Proposal must be approved before generating PDF',
        });
      }

      // Calculate roof squares
      const roofSqFt = (job.solarApiData as any)?.totalArea || job.manualAreaSqFt || 0;
      const roofSquares = roofSqFt / 100;

      // Prepare proposal data
      const proposalData = {
        customerName: job.fullName,
        customerEmail: job.email || undefined,
        customerPhone: job.phone || undefined,
        propertyAddress: job.address,
        cityStateZip: job.cityStateZip,
        totalPrice: parseFloat(job.totalPrice || '0'),
        pricePerSq: parseFloat(job.pricePerSq || '0'),
        roofSquares: roofSquares,
        dealType: (job.dealType || 'cash') as 'insurance' | 'cash' | 'financed',
        insuranceCarrier: job.insuranceCarrier || undefined,
        claimNumber: job.claimNumber || undefined,
        proposalDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };

      // Generate PDF preview (without signature) using form filler
      const { generateProposalPDF } = await import('../../lib/pdfFormFiller');
      const pdfBuffer = await generateProposalPDF(proposalData);

      // Return PDF as base64 for preview
      return { 
        success: true, 
        message: 'PDF preview generated',
        proposalData,
        pdfPreview: pdfBuffer.toString('base64')
      };
    }),

  // Generate signed proposal PDF and save to documents
  generateSignedProposal: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      customerSignature: z.string(), // Base64 data URL
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get job details
      const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
      if (!job) throw new Error("Job not found");

      // Check permission
      const user = ctx.user;
      const teamMemberIds = user && isTeamLead(user) ? await getTeamMemberIds(db, user.id) : [];
      if (!canViewJob(user, job, teamMemberIds)) {
        throw new Error("You don't have permission to view this job");
      }

      // Verify proposal is approved
      if (job.priceStatus !== 'approved') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Proposal must be approved before generating PDF',
        });
      }

      // Calculate roof squares
      const roofSqFt = (job.solarApiData as any)?.totalArea || job.manualAreaSqFt || 0;
      const roofSquares = roofSqFt / 100;

      const signatureDate = new Date();

      // Prepare proposal data with signature
      const proposalData = {
        customerName: job.fullName,
        customerEmail: job.email || undefined,
        customerPhone: job.phone || undefined,
        propertyAddress: job.address,
        cityStateZip: job.cityStateZip,
        totalPrice: parseFloat(job.totalPrice || '0'),
        pricePerSq: parseFloat(job.pricePerSq || '0'),
        roofSquares: roofSquares,
        dealType: (job.dealType || 'cash') as 'insurance' | 'cash' | 'financed',
        insuranceCarrier: job.insuranceCarrier || undefined,
        claimNumber: job.claimNumber || undefined,
        proposalDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        customerSignature: input.customerSignature,
        signatureDate: signatureDate,
      };

      // Generate PDF with signature using template
      const { generateProposalPDF } = await import('../../lib/pdfTemplateGenerator');
      const pdfBuffer = await generateProposalPDF(proposalData);

      // Save to Supabase storage in private 'documents' bucket
      // Organize by job ID with customer name in filename
      const safeCustomerName = job.fullName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
      const fileName = `job-${input.jobId}/Proposal - ${safeCustomerName}.pdf`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('documents')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get signed URL for private access (valid for 1 year)
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('documents')
        .createSignedUrl(fileName, 365 * 24 * 60 * 60); // 1 year

      if (signedUrlError) throw signedUrlError;
      const fileUrl = signedUrlData.signedUrl;

      // Save document record to database
      await db.insert(documents).values({
        reportRequestId: input.jobId,
        fileName: fileName,
        fileUrl: fileUrl,
        fileType: 'application/pdf',
        category: 'proposal',
        uploadedBy: user!.id,
      });

      // Log activity
      await logEditHistory(
        db,
        input.jobId,
        user!.id,
        "document",
        null,
        `Signed proposal document generated`,
        "create",
        ctx
      );

      return { 
        success: true, 
        message: 'Signed proposal generated successfully',
        documentUrl: fileUrl,
        signatureDate: signatureDate.toISOString(),
      };
    }),
});
