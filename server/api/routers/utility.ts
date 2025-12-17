import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { errorLogs, chatMessages, chatChannels, users } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const utilityRouter = router({
  /**
   * Report an error to the system
   * Logs to database and sends notification to tech-support channel
   */
  reportError: publicProcedure
    .input(
      z.object({
        errorMessage: z.string(),
        stackTrace: z.string().optional(),
        pageUrl: z.string().optional(),
        browserInfo: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }

      // Get user info if authenticated
      const userId = ctx.user?.id || null;
      const userRole = ctx.user?.role || null;
      const userName = ctx.user?.name || ctx.user?.email || "Anonymous User";

      // 1. Insert error into error_logs table
      const [errorLog] = await db
        .insert(errorLogs)
        .values({
          userId,
          userRole,
          errorMessage: input.errorMessage,
          stackTrace: input.stackTrace || null,
          pageUrl: input.pageUrl || null,
          browserInfo: input.browserInfo || null,
          resolved: false,
        })
        .returning();

      // 2. Send notification to tech-support channel
      try {
        // Find or create tech-support channel
        let [techSupportChannel] = await db
          .select()
          .from(chatChannels)
          .where(eq(chatChannels.name, "tech-support"))
          .limit(1);

        if (!techSupportChannel) {
          // Create tech-support channel if it doesn't exist
          [techSupportChannel] = await db
            .insert(chatChannels)
            .values({
              name: "tech-support",
              description: "System error reports and technical support",
              type: "public",
            })
            .returning();
        }

        // Find system bot user (first admin or owner)
        const [systemBot] = await db
          .select()
          .from(users)
          .where(eq(users.role, "admin"))
          .limit(1);

        if (systemBot && techSupportChannel) {
          // Create chat message with error report
          const errorReport = `🚨 **System Error Report**
**User:** ${userName} (${userRole || "guest"})
**Page:** ${input.pageUrl || "Unknown"}
**Error:** ${input.errorMessage}
**Error ID:** #${errorLog.id}

*(Check Error Logs table for full stack trace)*`;

          await db.insert(chatMessages).values({
            channelId: techSupportChannel.id,
            userId: systemBot.id,
            content: errorReport,
            metadata: {
              type: "system_error",
              errorLogId: errorLog.id,
              severity: "high",
            },
          });
        }
      } catch (notificationError) {
        // Don't fail the error report if notification fails
        console.error("[Error Reporter] Failed to send notification:", notificationError);
      }

      return {
        success: true,
        errorId: errorLog.id,
        message: "Error report submitted successfully",
      };
    }),

  /**
   * Get all error logs (admin only)
   */
  getErrorLogs: protectedProcedure
    .input(
      z.object({
        resolved: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      // Only admins and owners can view error logs
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const conditions = [];
      if (input.resolved !== undefined) {
        conditions.push(eq(errorLogs.resolved, input.resolved));
      }

      const logs = await db
        .select()
        .from(errorLogs)
        .where(conditions.length > 0 ? conditions[0] : undefined)
        .orderBy(desc(errorLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return logs;
    }),

  /**
   * Mark error as resolved (admin only)
   */
  resolveError: protectedProcedure
    .input(
      z.object({
        errorId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only admins and owners can resolve errors
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new Error("Unauthorized: Admin access required");
      }

      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }

      await db
        .update(errorLogs)
        .set({ resolved: true })
        .where(eq(errorLogs.id, input.errorId));

      return { success: true };
    }),
});
