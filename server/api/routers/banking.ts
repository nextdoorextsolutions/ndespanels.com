import { z } from "zod";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { bankTransactions, reportRequests } from "../../../drizzle/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const bankingRouter = router({
  // ============ AI CATEGORIZATION ============
  
  /**
   * AI-powered transaction categorization using Gemini
   */
  categorizeBatch: protectedProcedure
    .input(z.object({
      transactionIds: z.array(z.number()).optional(),
      limit: z.number().default(50),
      recategorize: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Get transactions to categorize
        let transactions;
        
        if (input.transactionIds && input.transactionIds.length > 0) {
          // Use specific transaction IDs if provided
          const conditions = input.transactionIds.map(id => eq(bankTransactions.id, id));
          transactions = await db
            .select()
            .from(bankTransactions)
            .where(sql`${bankTransactions.id} IN (${sql.join(input.transactionIds.map(id => sql`${id}`), sql`, `)})`);
        } else if (input.recategorize) {
          // Recategorize all pending transactions regardless of current category
          transactions = await db
            .select()
            .from(bankTransactions)
            .where(eq(bankTransactions.status, "pending"))
            .limit(input.limit);
        } else {
          // Only categorize uncategorized transactions (NULL or empty string)
          transactions = await db
            .select()
            .from(bankTransactions)
            .where(sql`(${bankTransactions.category} IS NULL OR ${bankTransactions.category} = '')`)
            .limit(input.limit);
        }

        console.log('[AI Categorization] Processing', transactions.length, 'transactions');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const categorized = [];

        // Process in batches of 10 for efficiency
        for (let i = 0; i < transactions.length; i += 10) {
          const batch = transactions.slice(i, i + 10);
          
          const prompt = `You are a financial categorization AI for a roofing company. Categorize these bank transactions.

Available Categories:
- materials (lumber, shingles, roofing supplies)
- labor (payroll, contractor payments)
- equipment (tools, machinery)
- vehicle (fuel, maintenance, insurance)
- insurance (business insurance, bonds)
- utilities (electric, water, internet)
- marketing (ads, website, SEO)
- office (supplies, software, rent)
- professional_services (legal, accounting, consulting)
- payroll (employee wages, benefits)
- taxes (income tax, sales tax, property tax)
- loan_payment (business loans, credit card payments)
- transfer (internal transfers between accounts)
- deposit (customer payments, revenue)
- revenue (sales, income)
- refund (returns, chargebacks)
- other (miscellaneous)
- uncategorized (unable to determine)

Transactions to categorize:
${batch.map((t, idx) => `${idx + 1}. Amount: $${t.amount}, Description: "${t.description}"`).join('\n')}

Return ONLY valid JSON array in this exact format:
[
  {
    "index": 1,
    "category": "materials",
    "confidence": 0.95,
    "reasoning": "Purchase from roofing supplier"
  },
  ...
]`;

          try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
              console.error('[AI Categorization] No JSON found in response');
              continue;
            }
            
            const categories = JSON.parse(jsonMatch[0]);
            
            // Update transactions with AI suggestions
            for (const cat of categories) {
              const transaction = batch[cat.index - 1];
              if (transaction) {
                await db
                  .update(bankTransactions)
                  .set({
                    category: cat.category,
                    aiSuggestedCategory: cat.category,
                    aiConfidence: cat.confidence,
                    aiReasoning: cat.reasoning,
                    status: "reconciled",
                  })
                  .where(eq(bankTransactions.id, transaction.id));
                
                categorized.push({
                  id: transaction.id,
                  category: cat.category,
                  confidence: cat.confidence,
                  reasoning: cat.reasoning,
                });
              }
            }
          } catch (error) {
            console.error('[AI Categorization] Error processing batch:', error);
          }
        }

        console.log('[AI Categorization] Successfully categorized', categorized.length, 'transactions');

        return {
          success: true,
          categorized: categorized.length,
          results: categorized,
        };
      } catch (error) {
        console.error('[AI Categorization] Error:', error);
        throw new Error('Failed to categorize transactions');
      }
    }),

  /**
   * Categorize a single transaction with AI
   */
  categorizeSingle: protectedProcedure
    .input(z.object({
      transactionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const [transaction] = await db
          .select()
          .from(bankTransactions)
          .where(eq(bankTransactions.id, input.transactionId))
          .limit(1);

        if (!transaction) {
          throw new Error('Transaction not found');
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = `Categorize this bank transaction for a roofing company.

Transaction:
Amount: $${transaction.amount}
Description: "${transaction.description}"
${transaction.bankAccount ? `Account: ${transaction.bankAccount}` : ''}

Available Categories: materials, labor, equipment, vehicle, insurance, utilities, marketing, office, professional_services, payroll, taxes, loan_payment, transfer, deposit, revenue, refund, other, uncategorized

Return ONLY valid JSON:
{
  "category": "materials",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid AI response');
        }
        
        const categorization = JSON.parse(jsonMatch[0]);
        
        // Update transaction
        await db
          .update(bankTransactions)
          .set({
            category: categorization.category,
            aiSuggestedCategory: categorization.category,
            aiConfidence: categorization.confidence,
            aiReasoning: categorization.reasoning,
            status: "reconciled",
          })
          .where(eq(bankTransactions.id, input.transactionId));

        return {
          success: true,
          category: categorization.category,
          confidence: categorization.confidence,
          reasoning: categorization.reasoning,
        };
      } catch (error) {
        console.error('[AI Categorization] Error:', error);
        throw new Error('Failed to categorize transaction');
      }
    }),

  // ============ EXISTING ENDPOINTS ============
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
          category: input.category,
          projectId: input.projectId,
          status: "reconciled",
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

  // Bulk delete transactions by year/month
  bulkDelete: protectedProcedure
    .input(z.object({
      year: z.number(),
      month: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      
      // Filter by year
      const startOfYear = new Date(input.year, 0, 1);
      const endOfYear = new Date(input.year, 11, 31, 23, 59, 59);
      
      if (input.month) {
        // Filter by specific month
        const startOfMonth = new Date(input.year, input.month - 1, 1);
        const endOfMonth = new Date(input.year, input.month, 0, 23, 59, 59);
        conditions.push(gte(bankTransactions.transactionDate, startOfMonth));
        conditions.push(lte(bankTransactions.transactionDate, endOfMonth));
      } else {
        // Delete entire year
        conditions.push(gte(bankTransactions.transactionDate, startOfYear));
        conditions.push(lte(bankTransactions.transactionDate, endOfYear));
      }

      const deleted = await db
        .delete(bankTransactions)
        .where(and(...conditions))
        .returning();

      return { count: deleted.length };
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
