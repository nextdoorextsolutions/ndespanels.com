import { z } from "zod";
import { eq, and, desc, isNull } from "drizzle-orm";
import { getDb } from "../../db";
import { changeOrders, reportRequests, activities, users } from "../../../drizzle/schema";
import { protectedProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";

export const changeOrdersRouter = router({
  // Get all change orders for a job
  getJobChangeOrders: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const orders = await db
        .select({
          id: changeOrders.id,
          jobId: changeOrders.jobId,
          type: changeOrders.type,
          description: changeOrders.description,
          amount: changeOrders.amount,
          status: changeOrders.status,
          invoiceId: changeOrders.invoiceId,
          approvedBy: changeOrders.approvedBy,
          approvedAt: changeOrders.approvedAt,
          createdBy: changeOrders.createdBy,
          createdAt: changeOrders.createdAt,
          updatedAt: changeOrders.updatedAt,
          approverName: users.name,
        })
        .from(changeOrders)
        .leftJoin(users, eq(changeOrders.approvedBy, users.id))
        .where(eq(changeOrders.jobId, input.jobId))
        .orderBy(desc(changeOrders.createdAt));

      return orders;
    }),

  // Get unbilled change orders for a job (for supplement invoice generation)
  getUnbilledChangeOrders: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const unbilled = await db
        .select()
        .from(changeOrders)
        .where(
          and(
            eq(changeOrders.jobId, input.jobId),
            eq(changeOrders.status, "approved"),
            isNull(changeOrders.invoiceId)
          )
        )
        .orderBy(desc(changeOrders.createdAt));

      return unbilled;
    }),

  // Create a new change order
  create: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      type: z.enum(["supplement", "retail_change", "insurance_supplement"]),
      description: z.string().min(1),
      amount: z.number(), // In dollars, will be converted to cents
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!ctx.user?.id) throw new Error("User not authenticated");

      // Verify job exists
      const [job] = await db
        .select()
        .from(reportRequests)
        .where(eq(reportRequests.id, input.jobId))
        .limit(1);

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      // Create change order
      const [newOrder] = await db.insert(changeOrders).values({
        jobId: input.jobId,
        type: input.type,
        description: input.description,
        amount: Math.round(input.amount * 100), // Convert to cents
        status: "pending",
        createdBy: ctx.user.id,
      }).returning();

      // Log activity
      await db.insert(activities).values({
        reportRequestId: input.jobId,
        userId: ctx.user.id,
        activityType: "note_added",
        description: `Created ${input.type} change order: ${input.description} ($${input.amount.toFixed(2)})`,
        metadata: JSON.stringify({ 
          changeOrderId: newOrder.id, 
          type: input.type,
          amount: input.amount,
        }),
      });

      return {
        success: true,
        changeOrder: newOrder,
      };
    }),

  // Approve a change order
  approve: protectedProcedure
    .input(z.object({ 
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!ctx.user?.id) throw new Error("User not authenticated");

      // Get the change order
      const [order] = await db
        .select()
        .from(changeOrders)
        .where(eq(changeOrders.id, input.id))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Change order not found",
        });
      }

      if (order.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Change order is already ${order.status}`,
        });
      }

      // Update status
      await db
        .update(changeOrders)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(changeOrders.id, input.id));

      // Log activity
      const amount = order.amount / 100;
      await db.insert(activities).values({
        reportRequestId: order.jobId,
        userId: ctx.user.id,
        activityType: "note_added",
        description: `Approved change order: ${order.description} ($${amount.toFixed(2)})${input.notes ? ` - ${input.notes}` : ''}`,
        metadata: JSON.stringify({ 
          changeOrderId: order.id,
          amount,
        }),
      });

      return { success: true };
    }),

  // Reject a change order
  reject: protectedProcedure
    .input(z.object({ 
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!ctx.user?.id) throw new Error("User not authenticated");

      // Get the change order
      const [order] = await db
        .select()
        .from(changeOrders)
        .where(eq(changeOrders.id, input.id))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Change order not found",
        });
      }

      if (order.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Change order is already ${order.status}`,
        });
      }

      // Update status
      await db
        .update(changeOrders)
        .set({
          status: "rejected",
          updatedAt: new Date(),
        })
        .where(eq(changeOrders.id, input.id));

      // Log activity
      const amount = order.amount / 100;
      await db.insert(activities).values({
        reportRequestId: order.jobId,
        userId: ctx.user.id,
        activityType: "note_added",
        description: `Rejected change order: ${order.description} ($${amount.toFixed(2)})${input.reason ? ` - Reason: ${input.reason}` : ''}`,
        metadata: JSON.stringify({ 
          changeOrderId: order.id,
          amount,
          reason: input.reason,
        }),
      });

      return { success: true };
    }),

  // Delete a change order (only if not billed)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!ctx.user?.id) throw new Error("User not authenticated");

      // Get the change order
      const [order] = await db
        .select()
        .from(changeOrders)
        .where(eq(changeOrders.id, input.id))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Change order not found",
        });
      }

      if (order.invoiceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete a change order that has been billed",
        });
      }

      // Delete the change order
      await db.delete(changeOrders).where(eq(changeOrders.id, input.id));

      // Log activity
      const amount = order.amount / 100;
      await db.insert(activities).values({
        reportRequestId: order.jobId,
        userId: ctx.user.id,
        activityType: "note_added",
        description: `Deleted change order: ${order.description} ($${amount.toFixed(2)})`,
        metadata: JSON.stringify({ 
          changeOrderId: order.id,
          amount,
        }),
      });

      return { success: true };
    }),

  // Get change order summary for a job (total approved, total pending, etc.)
  getJobSummary: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const orders = await db
        .select()
        .from(changeOrders)
        .where(eq(changeOrders.jobId, input.jobId));

      const summary = {
        totalApproved: 0,
        totalPending: 0,
        totalBilled: 0,
        totalUnbilled: 0,
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
      };

      orders.forEach(order => {
        const amount = order.amount / 100;
        
        if (order.status === "approved") {
          summary.totalApproved += amount;
          summary.approvedCount++;
          
          if (order.invoiceId) {
            summary.totalBilled += amount;
          } else {
            summary.totalUnbilled += amount;
          }
        } else if (order.status === "pending") {
          summary.totalPending += amount;
          summary.pendingCount++;
        } else if (order.status === "rejected") {
          summary.rejectedCount++;
        }
      });

      return summary;
    }),
});
