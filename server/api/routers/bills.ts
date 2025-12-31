import { z } from "zod";
import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { billsPayable, reportRequests, bankTransactions } from "../../../drizzle/schema";

export const billsRouter = router({
  // Get all bills with optional filters
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "paid", "overdue", "cancelled", "all"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      vendorName: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      
      if (input?.status && input.status !== "all") {
        conditions.push(eq(billsPayable.status, input.status));
      }
      
      if (input?.startDate) {
        conditions.push(gte(billsPayable.billDate, new Date(input.startDate)));
      }
      
      if (input?.endDate) {
        conditions.push(lte(billsPayable.billDate, new Date(input.endDate)));
      }
      
      if (input?.vendorName) {
        conditions.push(sql`${billsPayable.vendorName} ILIKE ${`%${input.vendorName}%`}`);
      }

      const bills = await db
        .select({
          bill: billsPayable,
          project: {
            id: reportRequests.id,
            fullName: reportRequests.fullName,
          },
        })
        .from(billsPayable)
        .leftJoin(reportRequests, eq(billsPayable.projectId, reportRequests.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(billsPayable.dueDate));

      return bills;
    }),

  // Get bill by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [bill] = await db
        .select()
        .from(billsPayable)
        .where(eq(billsPayable.id, input.id))
        .limit(1);

      return bill;
    }),

  // Create new bill
  create: protectedProcedure
    .input(z.object({
      billNumber: z.string().optional(),
      vendorName: z.string(),
      vendorEmail: z.string().optional(),
      vendorPhone: z.string().optional(),
      billDate: z.string(),
      dueDate: z.string(),
      amount: z.number(),
      taxAmount: z.number().default(0),
      category: z.string().optional(),
      projectId: z.number().optional(),
      lineItems: z.any().optional(),
      notes: z.string().optional(),
      attachmentUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Generate bill number if not provided
      let billNumber = input.billNumber;
      if (!billNumber) {
        const [lastBill] = await db
          .select({ billNumber: billsPayable.billNumber })
          .from(billsPayable)
          .orderBy(desc(billsPayable.id))
          .limit(1);
        
        const lastNum = lastBill?.billNumber ? parseInt(lastBill.billNumber.replace(/\D/g, '')) : 0;
        billNumber = `BILL-${String(lastNum + 1).padStart(4, '0')}`;
      }

      const totalAmount = input.amount + input.taxAmount;

      const [bill] = await db
        .insert(billsPayable)
        .values({
          billNumber,
          vendorName: input.vendorName,
          vendorEmail: input.vendorEmail,
          vendorPhone: input.vendorPhone,
          billDate: new Date(input.billDate),
          dueDate: new Date(input.dueDate),
          amount: input.amount.toString(),
          taxAmount: input.taxAmount.toString(),
          totalAmount: totalAmount.toString(),
          category: input.category,
          projectId: input.projectId,
          lineItems: input.lineItems,
          notes: input.notes,
          attachmentUrl: input.attachmentUrl,
          status: "pending",
          createdBy: ctx.user.id,
        })
        .returning();

      return bill;
    }),

  // Update bill
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      vendorName: z.string().optional(),
      vendorEmail: z.string().optional(),
      vendorPhone: z.string().optional(),
      billDate: z.string().optional(),
      dueDate: z.string().optional(),
      amount: z.number().optional(),
      taxAmount: z.number().optional(),
      status: z.enum(["pending", "approved", "paid", "overdue", "cancelled"]).optional(),
      category: z.string().optional(),
      projectId: z.number().optional(),
      lineItems: z.any().optional(),
      notes: z.string().optional(),
      attachmentUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {};
      
      if (input.vendorName) updateData.vendorName = input.vendorName;
      if (input.vendorEmail !== undefined) updateData.vendorEmail = input.vendorEmail;
      if (input.vendorPhone !== undefined) updateData.vendorPhone = input.vendorPhone;
      if (input.billDate) updateData.billDate = new Date(input.billDate);
      if (input.dueDate) updateData.dueDate = new Date(input.dueDate);
      if (input.amount !== undefined) {
        updateData.amount = input.amount.toString();
        // Recalculate total if amount changes
        const [current] = await db.select().from(billsPayable).where(eq(billsPayable.id, input.id)).limit(1);
        const taxAmount = input.taxAmount !== undefined ? input.taxAmount : Number(current.taxAmount);
        updateData.totalAmount = (input.amount + taxAmount).toString();
      }
      if (input.taxAmount !== undefined) {
        updateData.taxAmount = input.taxAmount.toString();
        // Recalculate total if tax changes
        const [current] = await db.select().from(billsPayable).where(eq(billsPayable.id, input.id)).limit(1);
        const amount = input.amount !== undefined ? input.amount : Number(current.amount);
        updateData.totalAmount = (amount + input.taxAmount).toString();
      }
      if (input.status) updateData.status = input.status;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.projectId !== undefined) updateData.projectId = input.projectId;
      if (input.lineItems !== undefined) updateData.lineItems = input.lineItems;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.attachmentUrl !== undefined) updateData.attachmentUrl = input.attachmentUrl;

      const [bill] = await db
        .update(billsPayable)
        .set(updateData)
        .where(eq(billsPayable.id, input.id))
        .returning();

      return bill;
    }),

  // Mark bill as paid
  markAsPaid: protectedProcedure
    .input(z.object({
      id: z.number(),
      paymentMethod: z.string(),
      paymentDate: z.string(),
      paymentReference: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [bill] = await db
        .update(billsPayable)
        .set({
          status: "paid",
          paymentMethod: input.paymentMethod,
          paymentDate: new Date(input.paymentDate),
          paymentReference: input.paymentReference,
        })
        .where(eq(billsPayable.id, input.id))
        .returning();

      return bill;
    }),

  // Delete a bill
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(billsPayable)
        .where(eq(billsPayable.id, input.id));

      return { success: true };
    }),

  // Bulk delete bills
  bulkDelete: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (input.ids.length === 0) {
        throw new Error("No bills selected");
      }

      await db
        .delete(billsPayable)
        .where(inArray(billsPayable.id, input.ids));

      return { 
        success: true,
        deleted: input.ids.length,
      };
    }),

  // Get vendors (distinct)
  getVendors: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const vendors = await db
      .selectDistinct({ 
        vendorName: billsPayable.vendorName,
        vendorEmail: billsPayable.vendorEmail,
        vendorPhone: billsPayable.vendorPhone,
      })
      .from(billsPayable)
      .orderBy(billsPayable.vendorName);

    return vendors;
  }),

  // Get overdue bills
  getOverdue: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();
    
    const bills = await db
      .select()
      .from(billsPayable)
      .where(
        and(
          sql`${billsPayable.dueDate} < ${today}`,
          sql`${billsPayable.status} IN ('pending', 'approved')`
        )
      )
      .orderBy(billsPayable.dueDate);

    return bills;
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
        conditions.push(gte(billsPayable.billDate, new Date(input.startDate)));
      }
      
      if (input?.endDate) {
        conditions.push(lte(billsPayable.billDate, new Date(input.endDate)));
      }

      const [stats] = await db
        .select({
          totalPending: sql<number>`SUM(CASE WHEN ${billsPayable.status} = 'pending' THEN ${billsPayable.totalAmount} ELSE 0 END)`,
          totalApproved: sql<number>`SUM(CASE WHEN ${billsPayable.status} = 'approved' THEN ${billsPayable.totalAmount} ELSE 0 END)`,
          totalPaid: sql<number>`SUM(CASE WHEN ${billsPayable.status} = 'paid' THEN ${billsPayable.totalAmount} ELSE 0 END)`,
          totalOverdue: sql<number>`SUM(CASE WHEN ${billsPayable.status} = 'overdue' THEN ${billsPayable.totalAmount} ELSE 0 END)`,
          pendingCount: sql<number>`COUNT(CASE WHEN ${billsPayable.status} = 'pending' THEN 1 END)`,
          overdueCount: sql<number>`COUNT(CASE WHEN ${billsPayable.status} = 'overdue' THEN 1 END)`,
          totalCount: sql<number>`COUNT(*)`,
        })
        .from(billsPayable)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        totalPending: Number(stats.totalPending) || 0,
        totalApproved: Number(stats.totalApproved) || 0,
        totalPaid: Number(stats.totalPaid) || 0,
        totalOverdue: Number(stats.totalOverdue) || 0,
        pendingCount: Number(stats.pendingCount) || 0,
        overdueCount: Number(stats.overdueCount) || 0,
        totalCount: Number(stats.totalCount) || 0,
      };
    }),

  // Bulk import bills from CSV
  bulkImport: protectedProcedure
    .input(z.object({
      bills: z.array(z.object({
        billNumber: z.string(),
        vendorName: z.string(),
        billDate: z.string(),
        dueDate: z.string(),
        amount: z.string(),
        taxAmount: z.string(),
        totalAmount: z.string(),
        category: z.string(),
        status: z.string(),
        lineItems: z.array(z.any()).optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const imported = [];

      for (const bill of input.bills) {
        // Check if bill already exists
        const existing = await db
          .select()
          .from(billsPayable)
          .where(eq(billsPayable.billNumber, bill.billNumber))
          .limit(1);

        if (existing.length > 0) {
          console.log(`[Bill Import] Skipping duplicate bill: ${bill.billNumber}`);
          continue;
        }

        const [newBill] = await db
          .insert(billsPayable)
          .values({
            billNumber: bill.billNumber,
            vendorName: bill.vendorName,
            billDate: new Date(bill.billDate),
            dueDate: new Date(bill.dueDate),
            amount: bill.amount,
            taxAmount: bill.taxAmount,
            totalAmount: bill.totalAmount,
            category: bill.category,
            status: bill.status as any,
            lineItems: bill.lineItems ? JSON.stringify(bill.lineItems) : null,
            notes: bill.notes,
            createdBy: ctx.user.id,
          })
          .returning();

        imported.push(newBill);
      }

      console.log(`[Bill Import] Successfully imported ${imported.length} bills`);

      return {
        success: true,
        imported: imported.length,
        skipped: input.bills.length - imported.length,
      };
    }),

  // Match bills with bank transactions using AI
  matchWithTransactions: protectedProcedure
    .input(z.object({
      bills: z.array(z.object({
        billNumber: z.string(),
        vendorName: z.string(),
        totalAmount: z.string(),
        billDate: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const matched = [];

      // Get all reconciled bank transactions
      const transactions = await db
        .select()
        .from(bankTransactions)
        .where(eq(bankTransactions.status, 'reconciled'));

      for (const bill of input.bills) {
        const billAmount = parseFloat(bill.totalAmount);
        const billDate = new Date(bill.billDate);

        // Find matching transaction (negative amount, similar date, similar amount)
        const matchingTx = transactions.find(tx => {
          const txAmount = Math.abs(parseFloat(tx.amount));
          const txDate = new Date(tx.transactionDate);
          const amountMatch = Math.abs(txAmount - billAmount) < 0.05;
          const dateDiff = Math.abs(txDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24);
          const dateMatch = dateDiff <= 30; // Within 30 days
          const vendorMatch = tx.description.toLowerCase().includes(bill.vendorName.toLowerCase().substring(0, 5));

          return amountMatch && dateMatch && vendorMatch;
        });

        if (matchingTx) {
          matched.push({
            billNumber: bill.billNumber,
            transactionId: matchingTx.id,
            transactionDescription: matchingTx.description,
            confidence: 0.9,
          });

          console.log(`[Bill Matching] Matched bill ${bill.billNumber} with transaction #${matchingTx.id}`);
        }
      }

      return {
        success: true,
        matchedCount: matched.length,
        matched,
      };
    }),
});
