import { z } from "zod";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { bankTransactions, reportRequests } from "../../../drizzle/schema";

export const bankingRouter = router({
  // Debug endpoint to check raw transaction count
  getCount: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(bankTransactions);
      
      console.log('[getCount] Total transactions in DB:', result[0]?.count);
      return { count: result[0]?.count || 0 };
    }),

  // Get all bank transactions with optional filters
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "reconciled", "ignored", "all"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      category: z.string().optional(),
      accountId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      
      if (input?.status && input.status !== "all") {
        conditions.push(eq(bankTransactions.status, input.status));
      }
      
      if (input?.startDate) {
        conditions.push(gte(bankTransactions.transactionDate, new Date(input.startDate)));
      }
      
      if (input?.endDate) {
        conditions.push(lte(bankTransactions.transactionDate, new Date(input.endDate)));
      }
      
      if (input?.category) {
        conditions.push(eq(bankTransactions.category, input.category));
      }
      
      if (input?.accountId) {
        conditions.push(eq(bankTransactions.accountId, input.accountId));
      }

      console.log('[getAll] Querying transactions with conditions:', conditions.length);

      const transactions = await db
        .select({
          transaction: bankTransactions,
          project: {
            id: reportRequests.id,
            fullName: reportRequests.fullName,
          },
        })
        .from(bankTransactions)
        .leftJoin(reportRequests, eq(bankTransactions.projectId, reportRequests.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(bankTransactions.transactionDate));

      console.log('[getAll] Retrieved', transactions.length, 'transactions');
      if (transactions.length > 0) {
        console.log('[getAll] Sample transaction:', transactions[0]);
      }

      return transactions;
    }),

  // Get transaction by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [transaction] = await db
        .select()
        .from(bankTransactions)
        .where(eq(bankTransactions.id, input.id))
        .limit(1);

      return transaction;
    }),

  // Create new bank transaction
  create: protectedProcedure
    .input(z.object({
      transactionDate: z.string(),
      description: z.string(),
      amount: z.number(),
      category: z.string().optional(),
      projectId: z.number().optional(),
      bankAccount: z.string().optional(),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [transaction] = await db
        .insert(bankTransactions)
        .values({
          transactionDate: new Date(input.transactionDate),
          description: input.description,
          amount: input.amount.toString(),
          category: input.category,
          projectId: input.projectId,
          bankAccount: input.bankAccount,
          referenceNumber: input.referenceNumber,
          notes: input.notes,
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning();

      return transaction;
    }),

  // Update bank transaction
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      transactionDate: z.string().optional(),
      description: z.string().optional(),
      amount: z.number().optional(),
      category: z.string().optional(),
      projectId: z.number().optional(),
      status: z.enum(["pending", "reconciled", "ignored"]).optional(),
      bankAccount: z.string().optional(),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {};
      
      if (input.transactionDate) updateData.transactionDate = new Date(input.transactionDate);
      if (input.description) updateData.description = input.description;
      if (input.amount !== undefined) updateData.amount = input.amount.toString();
      if (input.category !== undefined) updateData.category = input.category;
      if (input.projectId !== undefined) updateData.projectId = input.projectId;
      if (input.status) updateData.status = input.status;
      if (input.bankAccount !== undefined) updateData.bankAccount = input.bankAccount;
      if (input.referenceNumber !== undefined) updateData.referenceNumber = input.referenceNumber;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const [transaction] = await db
        .update(bankTransactions)
        .set(updateData)
        .where(eq(bankTransactions.id, input.id))
        .returning();

      return transaction;
    }),

  // Reconcile transaction
  reconcile: protectedProcedure
    .input(z.object({
      id: z.number(),
      category: z.string(),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [transaction] = await db
        .update(bankTransactions)
        .set({
          status: "reconciled",
          category: input.category,
          projectId: input.projectId,
        })
        .where(eq(bankTransactions.id, input.id))
        .returning();

      return transaction;
    }),

  // Bulk import transactions (from CSV/PDF)
  bulkImport: protectedProcedure
    .input(z.object({
      transactions: z.array(z.object({
        transactionDate: z.string(),
        description: z.string(),
        amount: z.number(),
        bankAccount: z.string().optional(),
        referenceNumber: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      console.log('[bulkImport] Inserting', input.transactions.length, 'transactions');
      console.log('[bulkImport] Sample transaction:', input.transactions[0]);
      console.log('[bulkImport] User ID:', ctx.user.id);

      try {
        // Validate and transform data before insertion
        const valuesToInsert = input.transactions.map((t, idx) => {
          const date = new Date(t.transactionDate);
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date at index ${idx}: ${t.transactionDate}`);
          }
          
          return {
            transactionDate: date,
            description: t.description,
            amount: t.amount.toString(),
            bankAccount: t.bankAccount,
            referenceNumber: t.referenceNumber,
            status: "pending" as const,
            createdBy: ctx.user.id,
          };
        });

        console.log('[bulkImport] Sample value to insert:', valuesToInsert[0]);

        const transactions = await db
          .insert(bankTransactions)
          .values(valuesToInsert)
          .returning();

        console.log('[bulkImport] Successfully inserted', transactions.length, 'transactions');
        console.log('[bulkImport] Sample inserted transaction:', transactions[0]);

        return { count: transactions.length, transactions };
      } catch (error) {
        console.error('[bulkImport] Error during insertion:', error);
        throw error;
      }
    }),

  // Delete transaction
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(bankTransactions)
        .where(eq(bankTransactions.id, input.id));

      return { success: true };
    }),

  // Get categories (distinct)
  getCategories: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const categories = await db
      .selectDistinct({ category: bankTransactions.category })
      .from(bankTransactions)
      .where(sql`${bankTransactions.category} IS NOT NULL`);

    return categories.map((c) => c.category).filter(Boolean);
  }),

  // Get summary stats
  getStats: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      
      if (input?.startDate) {
        conditions.push(gte(bankTransactions.transactionDate, new Date(input.startDate)));
      }
      
      if (input?.endDate) {
        conditions.push(lte(bankTransactions.transactionDate, new Date(input.endDate)));
      }

      const [stats] = await db
        .select({
          totalIncome: sql<number>`SUM(CASE WHEN ${bankTransactions.amount} > 0 THEN ${bankTransactions.amount} ELSE 0 END)`,
          totalExpenses: sql<number>`SUM(CASE WHEN ${bankTransactions.amount} < 0 THEN ABS(${bankTransactions.amount}) ELSE 0 END)`,
          pendingCount: sql<number>`COUNT(CASE WHEN ${bankTransactions.status} = 'pending' THEN 1 END)`,
          reconciledCount: sql<number>`COUNT(CASE WHEN ${bankTransactions.status} = 'reconciled' THEN 1 END)`,
          totalCount: sql<number>`COUNT(*)`,
        })
        .from(bankTransactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        totalIncome: Number(stats.totalIncome) || 0,
        totalExpenses: Number(stats.totalExpenses) || 0,
        netCashFlow: (Number(stats.totalIncome) || 0) - (Number(stats.totalExpenses) || 0),
        pendingCount: Number(stats.pendingCount) || 0,
        reconciledCount: Number(stats.reconciledCount) || 0,
        totalCount: Number(stats.totalCount) || 0,
      };
    }),
});
