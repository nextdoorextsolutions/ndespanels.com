import { protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { reportRequests, activities, jobAttachments, notifications, jobMessageReads, users } from "../../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { storagePut } from "../../storage";
import { isTeamLead, canEditJob } from "../../lib/rbac";

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

/**
 * Activities Router
 * Handles notes, comments, mentions, notifications, and activity logs
 */
export const activitiesRouter = router({
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
});
