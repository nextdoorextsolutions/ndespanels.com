import { protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { reportRequests, documents, activities, users } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { storagePut } from "../../storage";
import { isTeamLead, canEditJob, canViewJob, canDeleteJob } from "../../lib/rbac";

// Import helper functions
async function getTeamMemberIds(db: any, teamLeadId: number): Promise<number[]> {
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
 * Documents Router
 * Handles document uploads, retrieval, and deletion for jobs
 */
export const documentsRouter = router({
  // Upload document to a lead
  uploadDocument: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      fileName: z.string(),
      fileData: z.string(), // Base64 encoded file data
      fileType: z.string(),
      category: z.enum(["drone_photo", "inspection_photo", "report", "contract", "invoice", "proposal", "other"]),
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

      // Upload to Supabase Storage in private 'documents' bucket
      const { url } = await storagePut(filePath, buffer, input.fileType, 'documents');

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
});
