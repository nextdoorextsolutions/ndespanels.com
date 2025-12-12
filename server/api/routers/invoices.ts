import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { invoices, reportRequests } from "../../../drizzle/schema";
import { protectedProcedure, router } from "../../_core/trpc";

export const invoicesRouter = router({
  // Get all invoices with optional filtering
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          reportRequestId: invoices.reportRequestId,
          clientName: invoices.clientName,
          clientEmail: invoices.clientEmail,
          jobAddress: reportRequests.address,
          amount: invoices.amount,
          taxAmount: invoices.taxAmount,
          totalAmount: invoices.totalAmount,
          status: invoices.status,
          invoiceDate: invoices.invoiceDate,
          dueDate: invoices.dueDate,
          paidDate: invoices.paidDate,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .leftJoin(reportRequests, eq(invoices.reportRequestId, reportRequests.id))
        .orderBy(desc(invoices.createdAt));

      const results = await query;

      // Apply filters
      let filtered = results;
      
      if (input?.status) {
        filtered = filtered.filter(inv => inv.status === input.status);
      }

      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.invoiceNumber.toLowerCase().includes(searchLower) ||
          inv.clientName?.toLowerCase().includes(searchLower) ||
          inv.jobAddress?.toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    }),

  // Get invoice by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id));

      if (!invoice) throw new Error("Invoice not found");
      return invoice;
    }),

  // Create new invoice
  create: protectedProcedure
    .input(z.object({
      invoiceNumber: z.string(),
      reportRequestId: z.number().optional(),
      clientName: z.string(),
      clientEmail: z.string().email().optional(),
      amount: z.string(),
      taxAmount: z.string().optional(),
      totalAmount: z.string(),
      invoiceDate: z.string(),
      dueDate: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [newInvoice] = await db.insert(invoices).values({
        invoiceNumber: input.invoiceNumber,
        reportRequestId: input.reportRequestId,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        amount: input.amount,
        taxAmount: input.taxAmount || "0.00",
        totalAmount: input.totalAmount,
        status: "draft",
        invoiceDate: new Date(input.invoiceDate),
        dueDate: new Date(input.dueDate),
        notes: input.notes,
      }).returning();

      return { success: true, invoice: newInvoice };
    }),

  // Update invoice
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
      paidDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.status) updateData.status = input.status;
      if (input.paidDate) updateData.paidDate = new Date(input.paidDate);
      if (input.notes !== undefined) updateData.notes = input.notes;

      await db
        .update(invoices)
        .set(updateData)
        .where(eq(invoices.id, input.id));

      return { success: true };
    }),

  // Delete invoice
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(invoices).where(eq(invoices.id, input.id));

      return { success: true };
    }),

  // Get invoice statistics
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [stats] = await db
      .select({
        totalOverdue: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'overdue' THEN ${invoices.totalAmount} ELSE 0 END), 0)`,
        totalDrafts: sql<number>`COUNT(CASE WHEN ${invoices.status} = 'draft' THEN 1 END)`,
        avgTicketSize: sql<number>`COALESCE(AVG(${invoices.totalAmount}), 0)`,
        activeCount: sql<number>`COUNT(CASE WHEN ${invoices.status} IN ('sent', 'overdue') THEN 1 END)`,
      })
      .from(invoices);

    return {
      totalOverdue: parseFloat(stats?.totalOverdue?.toString() || "0"),
      totalDrafts: Number(stats?.totalDrafts || 0),
      avgTicketSize: parseFloat(stats?.avgTicketSize?.toString() || "0"),
      activeCount: Number(stats?.activeCount || 0),
    };
  }),
});
