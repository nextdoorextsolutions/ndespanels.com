import { z } from "zod";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { expenses } from "../../../drizzle/schema";

export const expensesRouter = router({
  // Get all expenses with optional filtering
  getAll: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      reportRequestId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db.select().from(expenses);
      const conditions = [];

      if (input.category) {
        conditions.push(eq(expenses.category, input.category as any));
      }

      if (input.startDate) {
        conditions.push(gte(expenses.date, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(expenses.date, new Date(input.endDate)));
      }

      if (input.reportRequestId) {
        conditions.push(eq(expenses.reportRequestId, input.reportRequestId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const result = await query.orderBy(desc(expenses.date));
      return result;
    }),

  // Get expense by ID
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(expenses)
        .where(eq(expenses.id, input.id))
        .limit(1);

      if (!result[0]) {
        throw new Error("Expense not found");
      }

      return result[0];
    }),

  // Create new expense
  create: protectedProcedure
    .input(z.object({
      date: z.string(),
      category: z.enum([
        'materials',
        'labor',
        'equipment',
        'vehicle',
        'insurance',
        'utilities',
        'marketing',
        'office',
        'professional_services',
        'other'
      ]),
      amount: z.number(),
      description: z.string(),
      reportRequestId: z.number().optional(),
      vendorName: z.string().optional(),
      paymentMethod: z.string().optional(),
      receiptUrl: z.string().optional(),
      isTaxDeductible: z.boolean().optional(),
      taxCategory: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [expense] = await db
        .insert(expenses)
        .values({
          date: new Date(input.date),
          category: input.category,
          amount: input.amount.toString(),
          description: input.description,
          reportRequestId: input.reportRequestId,
          vendorName: input.vendorName,
          paymentMethod: input.paymentMethod,
          receiptUrl: input.receiptUrl,
          isTaxDeductible: input.isTaxDeductible,
          taxCategory: input.taxCategory,
          createdBy: ctx.user.id,
        })
        .returning();

      return expense;
    }),

  // Update expense
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      category: z.enum([
        'materials',
        'labor',
        'equipment',
        'vehicle',
        'insurance',
        'utilities',
        'marketing',
        'office',
        'professional_services',
        'other'
      ]).optional(),
      amount: z.number().optional(),
      description: z.string().optional(),
      reportRequestId: z.number().optional(),
      vendorName: z.string().optional(),
      paymentMethod: z.string().optional(),
      receiptUrl: z.string().optional(),
      isTaxDeductible: z.boolean().optional(),
      taxCategory: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...data } = input;
      const updateData: any = { ...data };

      if (data.date) {
        updateData.date = new Date(data.date);
      }

      if (data.amount !== undefined) {
        updateData.amount = data.amount.toString();
      }

      updateData.updatedAt = new Date();

      const [expense] = await db
        .update(expenses)
        .set(updateData)
        .where(eq(expenses.id, id))
        .returning();

      return expense;
    }),

  // Delete expense
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(expenses)
        .where(eq(expenses.id, input.id));

      return { success: true };
    }),

  // Get expense statistics
  getStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allExpenses = await db.select().from(expenses);

      const totalExpenses = allExpenses.reduce(
        (sum, exp) => sum + parseFloat(exp.amount || '0'),
        0
      );

      const byCategory = allExpenses.reduce((acc, exp) => {
        const category = exp.category;
        acc[category] = (acc[category] || 0) + parseFloat(exp.amount || '0');
        return acc;
      }, {} as Record<string, number>);

      const taxDeductible = allExpenses
        .filter(exp => exp.isTaxDeductible)
        .reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);

      return {
        totalExpenses,
        byCategory,
        taxDeductible,
        expenseCount: allExpenses.length,
      };
    }),
});
