/**
 * Commissions & Bonus Router
 * Handles commission requests, bonus tracking, and approval workflow
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { commissionRequests, bonusTiers, users, reportRequests, documents } from "../../../drizzle/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { isOwner } from "../../lib/rbac";

/**
 * Get start and end of current week (Sunday to Saturday)
 */
function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Start of week (Sunday at 00:00:00)
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  
  // End of week (Saturday at 23:59:59)
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

export const commissionsRouter = router({
  /**
   * Get weekly progress toward bonus
   * Shows approved deals this week vs required deals for next bonus tier
   */
  getWeeklyProgress: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(), // If not provided, use current user
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Role-based access control
      const currentUserRole = ctx.user.role;
      let targetUserId = ctx.user.id;

      // Sales reps can ONLY view their own data
      if (currentUserRole === 'sales_rep') {
        if (input.userId && input.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sales reps can only view their own progress",
          });
        }
        targetUserId = ctx.user.id;
      }
      // Owners and office can view any user's progress
      else if (currentUserRole === 'owner' || currentUserRole === 'office' || currentUserRole === 'admin') {
        targetUserId = input.userId || ctx.user.id;
      }
      // Other roles default to their own data
      else {
        targetUserId = ctx.user.id;
      }

      // Get current week range
      const { start, end } = getCurrentWeekRange();

      // Count approved commission requests this week
      const approvedThisWeek = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(commissionRequests)
        .where(
          and(
            eq(commissionRequests.userId, targetUserId),
            eq(commissionRequests.status, 'approved'),
            gte(commissionRequests.createdAt, start)
          )
        );

      const approvedCount = approvedThisWeek[0]?.count || 0;

      // Get user's bonus tiers (sorted by required deals ascending)
      const userBonusTiers = await db
        .select()
        .from(bonusTiers)
        .where(
          and(
            eq(bonusTiers.userId, targetUserId),
            eq(bonusTiers.period, 'weekly')
          )
        )
        .orderBy(bonusTiers.requiredDeals);

      // Find next bonus tier to achieve
      let nextTier = null;
      let currentTier = null;

      for (const tier of userBonusTiers) {
        if (approvedCount >= tier.requiredDeals) {
          currentTier = tier;
        } else if (!nextTier) {
          nextTier = tier;
        }
      }

      return {
        approvedDealsThisWeek: approvedCount,
        weekStart: start,
        weekEnd: end,
        currentTier: currentTier ? {
          requiredDeals: currentTier.requiredDeals,
          bonusAmount: parseFloat(currentTier.bonusAmount),
          achieved: true,
        } : null,
        nextTier: nextTier ? {
          requiredDeals: nextTier.requiredDeals,
          bonusAmount: parseFloat(nextTier.bonusAmount),
          dealsRemaining: nextTier.requiredDeals - approvedCount,
        } : null,
        allTiers: userBonusTiers.map(tier => ({
          requiredDeals: tier.requiredDeals,
          bonusAmount: parseFloat(tier.bonusAmount),
          achieved: approvedCount >= tier.requiredDeals,
        })),
      };
    }),

  /**
   * Submit a job for commission/bonus
   * Validates that required documents are uploaded before allowing submission
   */
  submitForBonus: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        paymentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const userId = ctx.user.id;

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

      // Check if user is assigned to this job
      if (job.assignedTo !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not assigned to this job",
        });
      }

      // Validate required documents are uploaded
      const requiredDocTypes: Array<'contract' | 'proposal'> = ['contract', 'proposal'];
      const jobDocuments = await db
        .select({ category: documents.category })
        .from(documents)
        .where(eq(documents.reportRequestId, input.jobId));

      const uploadedTypes = new Set(jobDocuments.map(d => d.category));
      const missingDocs = requiredDocTypes.filter(type => !uploadedTypes.has(type));

      if (missingDocs.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot submit: Missing required documents (${missingDocs.join(', ')})`,
        });
      }

      // Check if already submitted
      const existingRequest = await db
        .select()
        .from(commissionRequests)
        .where(
          and(
            eq(commissionRequests.jobId, input.jobId),
            eq(commissionRequests.userId, userId)
          )
        )
        .limit(1);

      if (existingRequest.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Commission request already submitted for this job",
        });
      }

      // Create commission request
      const [request] = await db
        .insert(commissionRequests)
        .values({
          jobId: input.jobId,
          userId: userId,
          paymentId: input.paymentId || null,
          status: 'pending',
        })
        .returning();

      return {
        success: true,
        requestId: request.id,
        message: "Commission request submitted for review",
      };
    }),

  /**
   * Review and approve/deny a commission request (Owner only)
   */
  reviewRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        approved: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Verify user is owner
      if (!isOwner(ctx.user)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can review commission requests",
        });
      }

      // Validate denial reason is provided if denied
      if (!input.approved && !input.reason) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Denial reason is required when denying a request",
        });
      }

      // Get the request
      const [request] = await db
        .select()
        .from(commissionRequests)
        .where(eq(commissionRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Commission request not found",
        });
      }

      // Update request status
      const newStatus = input.approved ? 'approved' : 'denied';
      
      await db
        .update(commissionRequests)
        .set({
          status: newStatus,
          denialReason: input.approved ? null : input.reason,
        })
        .where(eq(commissionRequests.id, input.requestId));

      return {
        success: true,
        status: newStatus,
        message: input.approved 
          ? "Commission request approved" 
          : "Commission request denied",
      };
    }),

  /**
   * Get all pending commission requests (Owner only)
   * Returns requests with user info, job details, and document status
   */
  getPendingRequests: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    // Verify user is owner
    if (!isOwner(ctx.user)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners can view pending commission requests",
      });
    }

    // Get all pending requests with user and job info
    const pendingRequests = await db
      .select({
        requestId: commissionRequests.id,
        jobId: commissionRequests.jobId,
        userId: commissionRequests.userId,
        paymentId: commissionRequests.paymentId,
        createdAt: commissionRequests.createdAt,
        userName: users.name,
        userEmail: users.email,
        jobName: reportRequests.fullName,
        jobAddress: reportRequests.address,
        totalPrice: reportRequests.totalPrice,
        jobStatus: reportRequests.status,
      })
      .from(commissionRequests)
      .innerJoin(users, eq(commissionRequests.userId, users.id))
      .innerJoin(reportRequests, eq(commissionRequests.jobId, reportRequests.id))
      .where(eq(commissionRequests.status, 'pending'))
      .orderBy(desc(commissionRequests.createdAt));

    // For each request, get document status
    const requestsWithDocs = await Promise.all(
      pendingRequests.map(async (request) => {
        const jobDocs = await db
          .select({ category: documents.category })
          .from(documents)
          .where(eq(documents.reportRequestId, request.jobId));

        const uploadedTypes = new Set(jobDocs.map(d => d.category));
        const hasContract = uploadedTypes.has('contract');
        const hasProposal = uploadedTypes.has('proposal');

        return {
          ...request,
          checkAmount: request.totalPrice ? parseFloat(request.totalPrice) : 0,
          documentStatus: {
            hasContract,
            hasProposal,
            allRequiredPresent: hasContract && hasProposal,
          },
        };
      })
    );

    return requestsWithDocs;
  }),

  /**
   * Get all commission requests for current user
   * Shows history of submitted, approved, and denied requests
   */
  getMyRequests: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    const userId = ctx.user.id;

    const myRequests = await db
      .select({
        requestId: commissionRequests.id,
        jobId: commissionRequests.jobId,
        paymentId: commissionRequests.paymentId,
        status: commissionRequests.status,
        denialReason: commissionRequests.denialReason,
        createdAt: commissionRequests.createdAt,
        jobName: reportRequests.fullName,
        jobAddress: reportRequests.address,
        totalPrice: reportRequests.totalPrice,
      })
      .from(commissionRequests)
      .innerJoin(reportRequests, eq(commissionRequests.jobId, reportRequests.id))
      .where(eq(commissionRequests.userId, userId))
      .orderBy(desc(commissionRequests.createdAt));

    return myRequests.map(req => ({
      ...req,
      checkAmount: req.totalPrice ? parseFloat(req.totalPrice) : 0,
    }));
  }),
});
