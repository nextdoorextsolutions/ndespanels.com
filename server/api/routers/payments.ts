/**
 * Payments Router
 * Handles manual payment recording (checks, cash, wire transfers)
 */

import { protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { payments, reportRequests, activities } from "../../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const paymentsRouter = router({
  // Record a new payment
  recordPayment: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      amount: z.number().positive(), // Amount in dollars
      paymentDate: z.string(), // ISO date string
      paymentMethod: z.enum(["check", "cash", "wire", "credit_card", "other"]),
      checkNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify job exists
      const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      // Convert amount to cents
      const amountInCents = Math.round(input.amount * 100);

      // Insert payment record
      const [payment] = await db.insert(payments).values({
        reportRequestId: input.jobId,
        amount: amountInCents,
        paymentDate: new Date(input.paymentDate),
        paymentMethod: input.paymentMethod,
        checkNumber: input.checkNumber || null,
        notes: input.notes || null,
        createdBy: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Calculate total payments for this job
      const [totalResult] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
        })
        .from(payments)
        .where(eq(payments.reportRequestId, input.jobId));

      const totalPaid = totalResult?.total || 0;

      // Update job's amountPaid field
      await db.update(reportRequests)
        .set({
          amountPaid: totalPaid,
          updatedAt: new Date(),
        })
        .where(eq(reportRequests.id, input.jobId));

      // Log activity
      await db.insert(activities).values({
        reportRequestId: input.jobId,
        userId: ctx.user.id,
        activityType: "payment_received",
        description: `Payment received: $${input.amount.toFixed(2)} via ${input.paymentMethod}${input.checkNumber ? ` (Check #${input.checkNumber})` : ''}`,
        createdAt: new Date(),
      });

      return {
        success: true,
        payment,
        totalPaid: totalPaid / 100, // Return in dollars
      };
    }),

  // Get all payments for a job
  getJobPayments: protectedProcedure
    .input(z.object({
      jobId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const jobPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.reportRequestId, input.jobId))
        .orderBy(desc(payments.paymentDate));

      return jobPayments;
    }),

  // Delete a payment (and recalculate job total)
  deletePayment: protectedProcedure
    .input(z.object({
      paymentId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get payment details before deleting
      const [payment] = await db.select().from(payments).where(eq(payments.id, input.paymentId));
      if (!payment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' });
      }

      const jobId = payment.reportRequestId;

      // Delete the payment
      await db.delete(payments).where(eq(payments.id, input.paymentId));

      // Recalculate total payments for this job
      const [totalResult] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
        })
        .from(payments)
        .where(eq(payments.reportRequestId, jobId));

      const totalPaid = totalResult?.total || 0;

      // Update job's amountPaid field
      await db.update(reportRequests)
        .set({
          amountPaid: totalPaid,
          updatedAt: new Date(),
        })
        .where(eq(reportRequests.id, jobId));

      // Log activity
      await db.insert(activities).values({
        reportRequestId: jobId,
        userId: ctx.user.id,
        activityType: "note_added",
        description: `Payment deleted: $${(payment.amount / 100).toFixed(2)} via ${payment.paymentMethod}`,
        createdAt: new Date(),
      });

      return {
        success: true,
        totalPaid: totalPaid / 100,
      };
    }),

  // Get payment summary for a job
  getPaymentSummary: protectedProcedure
    .input(z.object({
      jobId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db
        .select({
          totalPaid: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
          paymentCount: sql<number>`COUNT(*)`,
        })
        .from(payments)
        .where(eq(payments.reportRequestId, input.jobId));

      return {
        totalPaid: (result?.totalPaid || 0) / 100,
        paymentCount: result?.paymentCount || 0,
      };
    }),
});
