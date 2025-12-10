/**
 * Portal Router
 * 
 * Handles customer-facing portal functionality (public access, no authentication required).
 * Customers can look up their jobs by phone number, send messages, and request callbacks.
 */

import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { reportRequests, users, activities, jobMessageReads } from "../../../drizzle/schema";
import { eq, desc, and, or, like, inArray, isNotNull, sql } from "drizzle-orm";
import { notifyOwner } from "../../_core/notification";
import { isTeamLead, canViewJob, getTeamMemberIds } from "../../lib/rbac";
import { logEditHistory } from "../../lib/editHistory";

export const portalRouter = router({
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

  // Get unread message counts for all jobs (protected - requires auth)
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
});
