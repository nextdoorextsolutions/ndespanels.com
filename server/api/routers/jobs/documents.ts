/**
 * Jobs Documents Router
 * Handles file uploads, photo management, and document queries
 */

import {
  protectedProcedure,
  publicProcedure,
  router,
  z,
  getDb,
  reportRequests,
  documents,
  activities,
  eq,
  like,
  or,
  storagePut,
  extractExifMetadata,
  canEditJob,
  getTeamMemberIds,
  isTeamLead,
  logEditHistory,
} from "./shared";

export const documentsRouter = router({
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
        description: `Field photo uploaded: ${input.fileName}`,
      });

      return { success: true, documentId: result.id, url };
    }),

  // Search within job (documents, notes, messages)
  searchJob: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      query: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const searchTerm = `%${input.query}%`;

      // Search documents
      const foundDocuments = await db.select()
        .from(documents)
        .where(
          or(
            like(documents.fileName, searchTerm),
            like(documents.category, searchTerm)
          )
        );

      // Search activities (messages/notes)
      const foundActivities = await db.select()
        .from(activities)
        .where(
          or(
            like(activities.description, searchTerm),
            like(activities.activityType, searchTerm)
          )
        );

      const results = {
        documents: foundDocuments,
        activities: foundActivities,
        totalResults: foundDocuments.length + foundActivities.length,
      };

      return results;
    }),
});
