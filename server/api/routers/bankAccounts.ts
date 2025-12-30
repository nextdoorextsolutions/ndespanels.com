import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@/drizzle/db";
import { bankAccounts, bankTransactions } from "@/drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const bankAccountsRouter = router({
  // Get all bank accounts
  getAll: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().optional().default(false),
    }))
    .query(async ({ input }) => {
      const accounts = await db
        .select()
        .from(bankAccounts)
        .where(input.includeInactive ? undefined : eq(bankAccounts.isActive, true))
        .orderBy(desc(bankAccounts.createdAt));

      return accounts;
    }),

  // Get account by ID with transaction summary
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const account = await db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, input.id))
        .limit(1);

      if (!account[0]) {
        throw new Error("Account not found");
      }

      // Get transaction summary
      const summary = await db
        .select({
          totalTransactions: sql<number>`count(*)::int`,
          totalIncome: sql<number>`sum(case when amount > 0 then amount else 0 end)`,
          totalExpenses: sql<number>`sum(case when amount < 0 then abs(amount) else 0 end)`,
          pendingCount: sql<number>`sum(case when status = 'pending' then 1 else 0 end)::int`,
        })
        .from(bankTransactions)
        .where(eq(bankTransactions.accountId, input.id));

      return {
        account: account[0],
        summary: summary[0],
      };
    }),

  // Create new account
  create: protectedProcedure
    .input(z.object({
      accountName: z.string().min(1),
      accountType: z.enum(["checking", "savings", "credit_card", "line_of_credit"]),
      accountNumberLast4: z.string().max(4).optional(),
      institutionName: z.string().optional(),
      creditLimit: z.number().optional(),
      currentBalance: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [account] = await db
        .insert(bankAccounts)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      return account;
    }),

  // Update account
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      accountName: z.string().min(1).optional(),
      accountType: z.enum(["checking", "savings", "credit_card", "line_of_credit"]).optional(),
      accountNumberLast4: z.string().max(4).optional(),
      institutionName: z.string().optional(),
      creditLimit: z.number().optional(),
      currentBalance: z.number().optional(),
      isActive: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [account] = await db
        .update(bankAccounts)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.id, id))
        .returning();

      return account;
    }),

  // Delete account (soft delete by setting isActive to false)
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Check if account has transactions
      const txCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bankTransactions)
        .where(eq(bankTransactions.accountId, input.id));

      if (txCount[0].count > 0) {
        // Soft delete if has transactions
        await db
          .update(bankAccounts)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(bankAccounts.id, input.id));
      } else {
        // Hard delete if no transactions
        await db
          .delete(bankAccounts)
          .where(eq(bankAccounts.id, input.id));
      }

      return { success: true };
    }),

  // Get account statistics
  getStats: protectedProcedure.query(async () => {
    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.isActive, true));

    const stats = {
      totalAccounts: accounts.length,
      byType: {
        checking: accounts.filter(a => a.accountType === "checking").length,
        savings: accounts.filter(a => a.accountType === "savings").length,
        credit_card: accounts.filter(a => a.accountType === "credit_card").length,
        line_of_credit: accounts.filter(a => a.accountType === "line_of_credit").length,
      },
      totalCreditLimit: accounts
        .filter(a => a.creditLimit)
        .reduce((sum, a) => sum + Number(a.creditLimit || 0), 0),
      totalBalance: accounts
        .reduce((sum, a) => sum + Number(a.currentBalance || 0), 0),
    };

    return stats;
  }),

  // Update account balance (recalculate from transactions)
  updateBalance: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await db
        .select({
          balance: sql<number>`sum(amount)`,
        })
        .from(bankTransactions)
        .where(eq(bankTransactions.accountId, input.id));

      const balance = result[0]?.balance || 0;

      await db
        .update(bankAccounts)
        .set({
          currentBalance: balance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.id, input.id));

      return { balance };
    }),
});
