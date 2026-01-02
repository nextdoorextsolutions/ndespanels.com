import { z } from "zod";
import { eq, desc, and, sql, inArray, notInArray } from "drizzle-orm";
import { getDb } from "../../db";
import { invoices, reportRequests, activities, changeOrders, invoiceItems, documents } from "../../../drizzle/schema";
import { protectedProcedure, router } from "../../_core/trpc";
import { sendInvoiceEmail } from "../../mail";
import { generateInvoicePDF } from "../../lib/invoicePDFGenerator";
import { storagePut } from "../../storage";
import { logEditHistory } from "../../lib/editHistory";
import { TRPCError } from "@trpc/server";

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
          notes: invoices.notes,
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

  // Send invoice email via Zoho SMTP
  sendEmail: protectedProcedure
    .input(z.object({
      invoiceId: z.union([z.number(), z.string()]).transform((v) => typeof v === "string" ? Number(v) : v),
      to: z.string().email(),
      subject: z.string().min(1),
      message: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.invoiceId));

      if (!invoice) throw new Error("Invoice not found");

      const safe = (s: string) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;");

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <p>${safe(input.message).replace(/\n/g, "<br/>")}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="margin: 0;"><strong>Invoice:</strong> ${safe(invoice.invoiceNumber)}</p>
          <p style="margin: 0;"><strong>Client:</strong> ${safe(invoice.clientName)}</p>
          <p style="margin: 0;"><strong>Total:</strong> $${safe(String(invoice.totalAmount))}</p>
        </div>
      `.trim();

      await sendInvoiceEmail({
        to: input.to,
        subject: input.subject,
        html,
      });

      // Log activity to job timeline when invoice is associated with a job
      if (invoice.reportRequestId) {
        await db.insert(activities).values({
          reportRequestId: invoice.reportRequestId,
          userId: ctx.user?.id,
          activityType: "email_sent",
          description: `Invoice ${invoice.invoiceNumber} emailed to ${input.to}`,
          metadata: JSON.stringify({ invoiceId: invoice.id, to: input.to, subject: input.subject }),
        });
      }

      // Mark invoice as sent if it was still a draft
      if (invoice.status === "draft") {
        await db.update(invoices)
          .set({ status: "sent", updatedAt: new Date() })
          .where(eq(invoices.id, invoice.id));
      }

      return { success: true };
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

  // ============================================================================
  // FINANCIAL CORE - Phase 2: Convert to Invoice
  // ============================================================================

  /**
   * Convert a job's proposal/change orders into an invoice
   * Implements job-linked invoice numbering (INV-{JobId}-{Sequence})
   * Supports: deposit, progress, supplement, final invoice types
   */
  convertToInvoice: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      invoiceType: z.enum(["deposit", "progress", "supplement", "final"]),
      customAmount: z.number().optional(), // Required for deposit/progress, override amount
      dueDate: z.string().optional(), // ISO date string, defaults to 30 days from now
      notes: z.string().optional(),
      // For supplement invoices: which change orders to bill
      changeOrderIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!ctx.user?.id) throw new Error("User not authenticated");

      // STEP 1: Fetch job details
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

      // STEP 2: Calculate invoice amount based on type
      let invoiceAmount = 0;
      let taxAmount = 0;
      let lineItemsToCreate: Array<{
        description: string;
        quantity: string;
        unitPrice: number;
        totalPrice: number;
        changeOrderId?: number;
      }> = [];

      // Get all existing invoices for this job (excluding cancelled)
      const existingInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.reportRequestId, input.jobId),
            notInArray(invoices.status, ["cancelled"])
          )
        );

      const totalPreviouslyInvoiced = existingInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.totalAmount.toString()),
        0
      );

      // Base contract value (from proposal)
      const baseContractValue = job.totalPrice ? parseFloat(job.totalPrice.toString()) : 0;

      // Get all approved change orders
      const approvedChangeOrders = await db
        .select()
        .from(changeOrders)
        .where(
          and(
            eq(changeOrders.jobId, input.jobId),
            eq(changeOrders.status, "approved")
          )
        );

      const totalApprovedChanges = approvedChangeOrders.reduce(
        (sum, co) => sum + (co.amount / 100), // Convert cents to dollars
        0
      );

      // Total contract value = Base + Approved Changes
      const totalContractValue = baseContractValue + totalApprovedChanges;

      switch (input.invoiceType) {
        case "deposit":
          // Deposit: Use customAmount (required)
          if (!input.customAmount) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "customAmount is required for deposit invoices",
            });
          }
          invoiceAmount = input.customAmount;
          
          // Create line item for deposit
          lineItemsToCreate.push({
            description: job.dealType === "insurance" 
              ? "ACV Deposit (Insurance)" 
              : "Materials Deposit (50% of contract)",
            quantity: "1",
            unitPrice: Math.round(invoiceAmount * 100), // Convert to cents
            totalPrice: Math.round(invoiceAmount * 100),
          });
          break;

        case "progress":
          // Progress: Use customAmount (required)
          if (!input.customAmount) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "customAmount is required for progress invoices",
            });
          }
          invoiceAmount = input.customAmount;
          
          lineItemsToCreate.push({
            description: "Progress Payment",
            quantity: "1",
            unitPrice: Math.round(invoiceAmount * 100),
            totalPrice: Math.round(invoiceAmount * 100),
          });
          break;

        case "supplement":
          // Supplement: Bill specific change orders
          if (!input.changeOrderIds || input.changeOrderIds.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "changeOrderIds is required for supplement invoices",
            });
          }

          // Get the specified change orders
          const changeOrdersToBill = approvedChangeOrders.filter(co => 
            input.changeOrderIds!.includes(co.id)
          );

          if (changeOrdersToBill.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No approved change orders found with the specified IDs",
            });
          }

          // Check if any are already billed
          const alreadyBilled = changeOrdersToBill.filter(co => co.invoiceId !== null);
          if (alreadyBilled.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Change order(s) ${alreadyBilled.map(co => co.id).join(", ")} have already been billed`,
            });
          }

          // Create line items for each change order
          changeOrdersToBill.forEach(co => {
            const amount = co.amount / 100; // Convert cents to dollars
            invoiceAmount += amount;
            lineItemsToCreate.push({
              description: co.description,
              quantity: "1",
              unitPrice: co.amount, // Already in cents
              totalPrice: co.amount,
              changeOrderId: co.id,
            });
          });
          break;

        case "final":
          // Final: (Total Contract + Approved Changes) - Previous Invoices
          const remainingBalance = totalContractValue - totalPreviouslyInvoiced;
          
          if (remainingBalance <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `No remaining balance. Total contract: $${totalContractValue.toFixed(2)}, Already invoiced: $${totalPreviouslyInvoiced.toFixed(2)}`,
            });
          }

          invoiceAmount = remainingBalance;
          
          lineItemsToCreate.push({
            description: "Final Payment (Balance Due)",
            quantity: "1",
            unitPrice: Math.round(invoiceAmount * 100),
            totalPrice: Math.round(invoiceAmount * 100),
          });
          break;
      }

      // STEP 3: Calculate tax (inherit from proposal if available)
      // For now, manual entry - tax logic is complex per state
      if (job.pricePerSq && job.totalPrice) {
        // If proposal had tax calculation, we could inherit it here
        // For now, tax is 0 and must be manually added
        taxAmount = 0;
      }

      const totalAmount = invoiceAmount + taxAmount;

      // STEP 4: Generate invoice number (INV-{JobId}-{Sequence})
      const jobInvoiceCount = existingInvoices.length;
      const sequence = String(jobInvoiceCount + 1).padStart(2, "0");
      const invoiceNumber = `INV-${input.jobId}-${sequence}`;

      // STEP 5: Set due date (default 30 days from now)
      const invoiceDate = new Date();
      const dueDate = input.dueDate 
        ? new Date(input.dueDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // STEP 6: Create invoice record
      const [newInvoice] = await db.insert(invoices).values({
        invoiceNumber,
        reportRequestId: input.jobId,
        invoiceType: input.invoiceType,
        clientName: job.fullName,
        clientEmail: job.email || undefined,
        clientPhone: job.phone || undefined,
        address: job.address || undefined,
        amount: invoiceAmount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        status: "draft",
        invoiceDate,
        dueDate,
        notes: input.notes,
        createdBy: ctx.user.id,
      }).returning();

      // STEP 7: Create invoice line items
      if (lineItemsToCreate.length > 0) {
        await db.insert(invoiceItems).values(
          lineItemsToCreate.map((item, index) => ({
            invoiceId: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            changeOrderId: item.changeOrderId,
            sortOrder: index,
          }))
        );
      }

      // STEP 8: Link change orders to invoice (for supplement invoices)
      if (input.invoiceType === "supplement" && input.changeOrderIds) {
        await db
          .update(changeOrders)
          .set({ 
            invoiceId: newInvoice.id,
            updatedAt: new Date(),
          })
          .where(inArray(changeOrders.id, input.changeOrderIds));
      }

      // STEP 9: Log activity
      await db.insert(activities).values({
        reportRequestId: input.jobId,
        userId: ctx.user.id,
        activityType: "note_added",
        description: `Created ${input.invoiceType} invoice ${invoiceNumber} for $${totalAmount.toFixed(2)}`,
        metadata: JSON.stringify({ 
          invoiceId: newInvoice.id, 
          invoiceType: input.invoiceType,
          amount: totalAmount,
        }),
      });

      return {
        success: true,
        invoice: newInvoice,
        invoiceNumber,
        totalAmount,
      };
    }),

  // Get invoices for a specific job
  getJobInvoices: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const jobInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.reportRequestId, input.jobId))
        .orderBy(desc(invoices.createdAt));

      return jobInvoices;
    }),

  /**
   * Generate Balance Invoice with PDF
   * Calculates: (Base Contract + Approved Changes) - Total Invoiced
   * Creates invoice, generates PDF, and uploads to documents
   */
  generateBalanceInvoice: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!ctx.user?.id) throw new Error("User not authenticated");

      // STEP 1: Fetch job details
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

      // STEP 2: Get all existing invoices (excluding cancelled)
      const existingInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.reportRequestId, input.jobId),
            notInArray(invoices.status, ["cancelled"])
          )
        );

      const totalPreviouslyInvoiced = existingInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.totalAmount.toString()),
        0
      );

      // Get all approved change orders
      const approvedChangeOrders = await db
        .select()
        .from(changeOrders)
        .where(
          and(
            eq(changeOrders.jobId, input.jobId),
            eq(changeOrders.status, "approved")
          )
        );

      const totalApprovedChanges = approvedChangeOrders.reduce(
        (sum, co) => sum + (co.amount / 100),
        0
      );

      // Calculate base contract value
      // If totalPrice is set, use it. Otherwise, use total invoiced as the base contract (for legacy jobs)
      let baseContractValue = job.totalPrice ? parseFloat(job.totalPrice.toString()) : 0;
      
      if (baseContractValue === 0 && totalPreviouslyInvoiced > 0) {
        // Legacy job: Use invoiced amount as base contract
        baseContractValue = totalPreviouslyInvoiced;
      }

      // Total contract value = Base + Approved Changes
      const totalContractValue = baseContractValue + totalApprovedChanges;

      // Calculate balance due
      const balanceDue = totalContractValue - totalPreviouslyInvoiced;

      if (balanceDue <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No balance due. Total contract: $${totalContractValue.toFixed(2)}, Already invoiced: $${totalPreviouslyInvoiced.toFixed(2)}`,
        });
      }

      // STEP 3: Generate invoice number
      const jobInvoiceCount = existingInvoices.length;
      const sequence = String(jobInvoiceCount + 1).padStart(2, "0");
      const invoiceNumber = `INV-${input.jobId}-${sequence}`;

      // STEP 4: Set dates
      const invoiceDate = new Date();
      const dueDate = input.dueDate 
        ? new Date(input.dueDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // STEP 5: Create invoice record
      const [newInvoice] = await db.insert(invoices).values({
        invoiceNumber,
        reportRequestId: input.jobId,
        invoiceType: "final",
        clientName: job.fullName,
        clientEmail: job.email || undefined,
        clientPhone: job.phone || undefined,
        address: job.address || undefined,
        amount: balanceDue.toFixed(2),
        taxAmount: "0.00",
        totalAmount: balanceDue.toFixed(2),
        status: "draft",
        invoiceDate,
        dueDate,
        notes: input.notes,
        createdBy: ctx.user.id,
      }).returning();

      // STEP 6: Create line items
      const lineItemsData = [
        {
          description: "Balance Due (Total Contract - Payments Received)",
          quantity: "1",
          unitPrice: Math.round(balanceDue * 100),
          totalPrice: Math.round(balanceDue * 100),
        }
      ];

      await db.insert(invoiceItems).values(
        lineItemsData.map((item, index) => ({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          sortOrder: index,
        }))
      );

      // STEP 7: Generate PDF
      const pdfData = {
        invoiceNumber,
        invoiceDate: invoiceDate.toLocaleDateString(),
        dueDate: dueDate.toLocaleDateString(),
        clientName: job.fullName,
        clientAddress: job.address || undefined,
        clientEmail: job.email || undefined,
        clientPhone: job.phone || undefined,
        lineItems: lineItemsData,
        subtotal: balanceDue,
        taxAmount: 0,
        totalAmount: balanceDue,
        notes: input.notes,
      };

      const pdfBuffer = await generateInvoicePDF(pdfData);

      // STEP 8: Upload PDF to documents
      const timestamp = Date.now();
      const safeCustomerName = job.fullName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
      const fileName = `Invoice_${invoiceNumber}_${safeCustomerName}.pdf`;
      const filePath = `job-${input.jobId}/${timestamp}_${fileName}`;

      const { url } = await storagePut(filePath, pdfBuffer, "application/pdf", 'documents');

      // STEP 9: Save document record
      await db.insert(documents).values({
        reportRequestId: input.jobId,
        uploadedBy: ctx.user.id,
        fileName: fileName,
        fileUrl: url,
        fileType: "application/pdf",
        fileSize: pdfBuffer.length,
        category: "invoice",
      });

      // STEP 10: Log activity
      await db.insert(activities).values({
        reportRequestId: input.jobId,
        userId: ctx.user.id,
        activityType: "document_uploaded",
        description: `Generated balance invoice ${invoiceNumber} - $${balanceDue.toFixed(2)}`,
      });

      // Log to edit history
      await logEditHistory(
        db,
        input.jobId,
        ctx.user.id,
        "invoice",
        null,
        `Generated balance invoice ${invoiceNumber} for $${balanceDue.toFixed(2)}`,
        "create",
        ctx
      );

      return {
        success: true,
        invoice: newInvoice,
        pdfUrl: url,
        balanceDue,
      };
    }),
});
