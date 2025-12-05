import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { reportRequests, users, activities, documents } from "../drizzle/schema";
import { PRODUCTS, validatePromoCode } from "./products";
import { notifyOwner } from "./_core/notification";
import { sendSMSNotification } from "./sms";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { eq, desc, and, or, like, sql, gte, lte, between } from "drizzle-orm";
import { storagePut, storageGet } from "./storage";

// Initialize Stripe
const stripe = new Stripe(ENV.stripeSecretKey || "", {
  apiVersion: "2025-11-17.clover",
});

// CRM Role check helper
const CRM_ROLES = ["owner", "admin", "office", "sales_rep", "project_manager"];

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Report request procedures (public landing page)
  report: router({
    validatePromo: publicProcedure
      .input(z.object({ code: z.string() }))
      .mutation(({ input }) => {
        const result = validatePromoCode(input.code);
        return result;
      }),

    submit: publicProcedure
      .input(z.object({
        fullName: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(10),
        address: z.string().min(5),
        cityStateZip: z.string().min(5),
        roofAge: z.string().optional(),
        roofConcerns: z.string().optional(),
        handsOnInspection: z.boolean().optional(),
        promoCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const promoResult = input.promoCode ? validatePromoCode(input.promoCode) : { valid: false, discountPercent: 0, salesRep: undefined };
        const isFree = promoResult.valid && promoResult.discountPercent === 100;
        const salesRepAttribution = promoResult.salesRep || "Direct/No Code";
        const handsOnText = input.handsOnInspection ? "✅ YES - Requested" : "No";
        const concernsText = input.roofConcerns?.trim() || "None specified";

        if (isFree) {
          const [result] = await db.insert(reportRequests).values({
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            address: input.address,
            cityStateZip: input.cityStateZip,
            roofAge: input.roofAge || null,
            roofConcerns: input.roofConcerns || null,
            handsOnInspection: input.handsOnInspection || false,
            promoCode: input.promoCode?.toUpperCase() || null,
            promoApplied: true,
            amountPaid: 0,
            status: "new_lead",
            salesRepCode: promoResult.salesRep || null,
            leadSource: "website",
          });

          await notifyOwner({
            title: input.handsOnInspection 
              ? "🏠🔧 New Storm Report Request (FREE + HANDS-ON)" 
              : "🏠 New Storm Report Request (FREE - Promo Code)",
            content: `**New Report Request Received**\n\n**Customer Details:**\n- Name: ${input.fullName}\n- Email: ${input.email}\n- Phone: ${input.phone}\n\n**Property:**\n- Address: ${input.address}\n- City/State/ZIP: ${input.cityStateZip}\n- Roof Age: ${input.roofAge || "Not specified"}\n\n**Roof Concerns:**\n${concernsText}\n\n**Hands-On Inspection:** ${handsOnText}\n\n**Payment:**\n- Promo Code: ${input.promoCode?.toUpperCase()}\n- Amount: $0.00 (Fee Waived)\n\n**📋 Sales Rep Attribution:** ${salesRepAttribution}\n\n**Status:** Pending Scheduling`.trim(),
          });

          await sendSMSNotification({
            customerName: input.fullName,
            customerPhone: input.phone,
            address: `${input.address}, ${input.cityStateZip}`,
            isPaid: false,
            promoCode: input.promoCode?.toUpperCase(),
            salesRep: salesRepAttribution,
          });

          return { success: true, requiresPayment: false, requestId: result.insertId };
        } else {
          const origin = ctx.req.headers.origin || "http://localhost:3000";
          
          const [result] = await db.insert(reportRequests).values({
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            address: input.address,
            cityStateZip: input.cityStateZip,
            roofAge: input.roofAge || null,
            roofConcerns: input.roofConcerns || null,
            handsOnInspection: input.handsOnInspection || false,
            promoCode: input.promoCode?.toUpperCase() || null,
            promoApplied: false,
            amountPaid: 0,
            status: "new_lead",
            leadSource: "website",
          });

          const requestId = result.insertId;

          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
              price_data: {
                currency: PRODUCTS.STORM_REPORT.currency,
                product_data: {
                  name: PRODUCTS.STORM_REPORT.name,
                  description: PRODUCTS.STORM_REPORT.description,
                },
                unit_amount: PRODUCTS.STORM_REPORT.priceInCents,
              },
              quantity: 1,
            }],
            mode: "payment",
            success_url: `${origin}/thank-you?success=true&request_id=${requestId}`,
            cancel_url: `${origin}/?cancelled=true`,
            customer_email: input.email,
            client_reference_id: requestId.toString(),
            metadata: {
              request_id: requestId.toString(),
              customer_name: input.fullName,
              customer_email: input.email,
              customer_phone: input.phone,
              address: input.address,
              city_state_zip: input.cityStateZip,
              hands_on_inspection: input.handsOnInspection ? "yes" : "no",
            },
          });

          await db.update(reportRequests)
            .set({ stripeCheckoutSessionId: session.id })
            .where(eq(reportRequests.id, requestId));

          return { success: true, requiresPayment: true, checkoutUrl: session.url, requestId };
        }
      }),
  }),

  // CRM procedures (protected - requires login)
  crm: router({
    // Dashboard stats
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [totalLeads] = await db.select({ count: sql<number>`COUNT(*)` }).from(reportRequests);
      const [newLeads] = await db.select({ count: sql<number>`COUNT(*)` }).from(reportRequests).where(eq(reportRequests.status, "new_lead"));
      const [scheduledLeads] = await db.select({ count: sql<number>`COUNT(*)` }).from(reportRequests).where(or(eq(reportRequests.status, "appointment_set"), eq(reportRequests.status, "inspection_scheduled")));
      const [completedLeads] = await db.select({ count: sql<number>`COUNT(*)` }).from(reportRequests).where(eq(reportRequests.status, "closed_won"));
      const [totalRevenue] = await db.select({ sum: sql<number>`COALESCE(SUM(amountPaid), 0)` }).from(reportRequests);

      return {
        totalLeads: totalLeads?.count || 0,
        newLeads: newLeads?.count || 0,
        scheduledLeads: scheduledLeads?.count || 0,
        completedLeads: completedLeads?.count || 0,
        totalRevenue: (totalRevenue?.sum || 0) / 100,
      };
    }),

    // Get all leads with filtering
    getLeads: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        assignedTo: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let query = db.select().from(reportRequests).orderBy(desc(reportRequests.createdAt));

        const leads = await query.limit(input?.limit || 50).offset(input?.offset || 0);
        return leads;
      }),

    // Get single lead by ID
    getLead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [lead] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.id));
        if (!lead) throw new Error("Lead not found");

        const leadActivities = await db.select().from(activities)
          .where(eq(activities.reportRequestId, input.id))
          .orderBy(desc(activities.createdAt));

        const leadDocuments = await db.select().from(documents)
          .where(eq(documents.reportRequestId, input.id))
          .orderBy(desc(documents.createdAt));

        return { ...lead, activities: leadActivities, documents: leadDocuments };
      }),

    // Update lead
    updateLead: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assignedTo: z.number().optional(),
        internalNotes: z.string().optional(),
        scheduledDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const updateData: Record<string, unknown> = {};
        if (input.status) updateData.status = input.status;
        if (input.priority) updateData.priority = input.priority;
        if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
        if (input.internalNotes !== undefined) updateData.internalNotes = input.internalNotes;
        if (input.scheduledDate) updateData.scheduledDate = new Date(input.scheduledDate);

        await db.update(reportRequests).set(updateData).where(eq(reportRequests.id, input.id));

        // Log activity
        if (input.status) {
          await db.insert(activities).values({
            reportRequestId: input.id,
            userId: ctx.user?.id,
            activityType: "status_change",
            description: `Status changed to ${input.status}`,
          });
        }

        return { success: true };
      }),

    // Add note to lead
    addNote: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        note: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.insert(activities).values({
          reportRequestId: input.leadId,
          userId: ctx.user?.id,
          activityType: "note_added",
          description: input.note,
        });

        return { success: true };
      }),

    // Get pipeline data (leads grouped by status)
    getPipeline: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const leads = await db.select().from(reportRequests).orderBy(desc(reportRequests.createdAt));

      const pipeline = {
        new_lead: leads.filter(l => l.status === "new_lead"),
        contacted: leads.filter(l => l.status === "contacted"),
        appointment_set: leads.filter(l => l.status === "appointment_set"),
        inspection_scheduled: leads.filter(l => l.status === "inspection_scheduled"),
        inspection_complete: leads.filter(l => l.status === "inspection_complete"),
        report_sent: leads.filter(l => l.status === "report_sent"),
        follow_up: leads.filter(l => l.status === "follow_up"),
        closed_won: leads.filter(l => l.status === "closed_won"),
        closed_lost: leads.filter(l => l.status === "closed_lost"),
      };

      return pipeline;
    }),

    // Get team members
    getTeam: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const team = await db.select().from(users).orderBy(users.name);
      return team;
    }),

    // Update team member role
    updateTeamMember: protectedProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "owner", "office", "sales_rep", "project_manager"]),
        repCode: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only owners/admins can update roles
        if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }

        const updateData: Record<string, unknown> = { role: input.role };
        if (input.repCode !== undefined) updateData.repCode = input.repCode;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        await db.update(users).set(updateData).where(eq(users.id, input.userId));
        return { success: true };
      }),

    // ============ DOCUMENT UPLOAD ============
    
    // Upload document to a lead
    uploadDocument: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file data
        fileType: z.string(),
        category: z.enum(["drone_photo", "inspection_photo", "report", "contract", "invoice", "other"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Decode base64 file data
        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;

        // Generate unique file path
        const timestamp = Date.now();
        const safeName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `leads/${input.leadId}/${timestamp}_${safeName}`;

        // Upload to S3
        const { url } = await storagePut(filePath, buffer, input.fileType);

        // Save document record
        const [result] = await db.insert(documents).values({
          reportRequestId: input.leadId,
          uploadedBy: ctx.user?.id,
          fileName: input.fileName,
          fileUrl: url,
          fileType: input.fileType,
          fileSize: fileSize,
          category: input.category,
        });

        // Log activity
        await db.insert(activities).values({
          reportRequestId: input.leadId,
          userId: ctx.user?.id,
          activityType: "document_uploaded",
          description: `Uploaded ${input.category.replace("_", " ")}: ${input.fileName}`,
        });

        return { success: true, documentId: result.insertId, url };
      }),

    // Get documents for a lead
    getDocuments: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const docs = await db.select().from(documents)
          .where(eq(documents.reportRequestId, input.leadId))
          .orderBy(desc(documents.createdAt));

        return docs;
      }),

    // Delete document
    deleteDocument: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only owners/admins can delete
        if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }

        await db.delete(documents).where(eq(documents.id, input.documentId));
        return { success: true };
      }),

    // ============ SCHEDULING / CALENDAR ============

    // Get appointments for calendar view
    getAppointments: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        assignedTo: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const start = new Date(input.startDate);
        const end = new Date(input.endDate);

        let query = db.select({
          id: reportRequests.id,
          fullName: reportRequests.fullName,
          phone: reportRequests.phone,
          address: reportRequests.address,
          cityStateZip: reportRequests.cityStateZip,
          scheduledDate: reportRequests.scheduledDate,
          status: reportRequests.status,
          priority: reportRequests.priority,
          assignedTo: reportRequests.assignedTo,
          handsOnInspection: reportRequests.handsOnInspection,
        })
        .from(reportRequests)
        .where(
          and(
            sql`${reportRequests.scheduledDate} IS NOT NULL`,
            gte(reportRequests.scheduledDate, start),
            lte(reportRequests.scheduledDate, end)
          )
        );

        const appointments = await query;
        return appointments;
      }),

    // Schedule appointment
    scheduleAppointment: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        scheduledDate: z.string(),
        assignedTo: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const updateData: Record<string, unknown> = {
          scheduledDate: new Date(input.scheduledDate),
          status: "inspection_scheduled",
        };
        if (input.assignedTo !== undefined) {
          updateData.assignedTo = input.assignedTo;
        }

        await db.update(reportRequests).set(updateData).where(eq(reportRequests.id, input.leadId));

        // Log activity
        await db.insert(activities).values({
          reportRequestId: input.leadId,
          userId: ctx.user?.id,
          activityType: "appointment_scheduled",
          description: `Inspection scheduled for ${new Date(input.scheduledDate).toLocaleString()}`,
        });

        return { success: true };
      }),

    // ============ REPORTS / EXPORT ============

    // Get leads for export with filters
    getLeadsForExport: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.string().optional(),
        salesRep: z.string().optional(),
        assignedTo: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let conditions = [];
        
        if (input.startDate) {
          conditions.push(gte(reportRequests.createdAt, new Date(input.startDate)));
        }
        if (input.endDate) {
          conditions.push(lte(reportRequests.createdAt, new Date(input.endDate)));
        }
        if (input.status && input.status !== "all") {
          conditions.push(eq(reportRequests.status, input.status as any));
        }
        if (input.salesRep) {
          conditions.push(eq(reportRequests.salesRepCode, input.salesRep));
        }
        if (input.assignedTo) {
          conditions.push(eq(reportRequests.assignedTo, input.assignedTo));
        }

        const query = conditions.length > 0
          ? db.select().from(reportRequests).where(and(...conditions)).orderBy(desc(reportRequests.createdAt))
          : db.select().from(reportRequests).orderBy(desc(reportRequests.createdAt));

        const leads = await query;
        return leads;
      }),

    // Get report summary stats
    getReportStats: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let conditions = [];
        if (input.startDate) {
          conditions.push(gte(reportRequests.createdAt, new Date(input.startDate)));
        }
        if (input.endDate) {
          conditions.push(lte(reportRequests.createdAt, new Date(input.endDate)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Total leads
        const [totalResult] = await db.select({ count: sql<number>`COUNT(*)` })
          .from(reportRequests)
          .where(whereClause);

        // By status
        const statusCounts = await db.select({
          status: reportRequests.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(reportRequests)
        .where(whereClause)
        .groupBy(reportRequests.status);

        // By sales rep
        const repCounts = await db.select({
          salesRepCode: reportRequests.salesRepCode,
          count: sql<number>`COUNT(*)`,
        })
        .from(reportRequests)
        .where(whereClause)
        .groupBy(reportRequests.salesRepCode);

        // Revenue
        const [revenueResult] = await db.select({
          total: sql<number>`COALESCE(SUM(amountPaid), 0)`,
        })
        .from(reportRequests)
        .where(whereClause);

        // Conversion rate (closed_won / total)
        const [closedWonResult] = await db.select({ count: sql<number>`COUNT(*)` })
          .from(reportRequests)
          .where(conditions.length > 0 
            ? and(...conditions, eq(reportRequests.status, "closed_won"))
            : eq(reportRequests.status, "closed_won")
          );

        const total = totalResult?.count || 0;
        const closedWon = closedWonResult?.count || 0;
        const conversionRate = total > 0 ? ((closedWon / total) * 100).toFixed(1) : "0";

        return {
          totalLeads: total,
          byStatus: statusCounts,
          byRep: repCounts,
          totalRevenue: (revenueResult?.total || 0) / 100,
          conversionRate: `${conversionRate}%`,
        };
      }),

    // ============ DASHBOARD ANALYTICS ============

    // Get monthly lead trends for charts
    getMonthlyTrends: protectedProcedure
      .input(z.object({
        months: z.number().default(6),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const monthsBack = input?.months || 6;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);

        const leads = await db.select({
          id: reportRequests.id,
          status: reportRequests.status,
          amountPaid: reportRequests.amountPaid,
          createdAt: reportRequests.createdAt,
        })
        .from(reportRequests)
        .where(gte(reportRequests.createdAt, startDate))
        .orderBy(reportRequests.createdAt);

        // Group by month
        const monthlyData: Record<string, { leads: number; closed: number; revenue: number }> = {};
        
        leads.forEach(lead => {
          const monthKey = lead.createdAt.toISOString().slice(0, 7); // YYYY-MM
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { leads: 0, closed: 0, revenue: 0 };
          }
          monthlyData[monthKey].leads++;
          if (lead.status === "closed_won") {
            monthlyData[monthKey].closed++;
            monthlyData[monthKey].revenue += (lead.amountPaid || 0) / 100;
          }
        });

        return Object.entries(monthlyData).map(([month, data]) => ({
          month,
          ...data,
          conversionRate: data.leads > 0 ? ((data.closed / data.leads) * 100).toFixed(1) : "0",
        }));
      }),

    // Get leads by category tabs (Prospect, Completed, Invoiced, etc.)
    getLeadsByCategory: protectedProcedure
      .input(z.object({
        category: z.enum(["prospect", "in_progress", "completed", "invoiced", "closed_lost"]),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let statusFilter: string[] = [];
        switch (input.category) {
          case "prospect":
            statusFilter = ["new_lead", "contacted"];
            break;
          case "in_progress":
            statusFilter = ["appointment_set", "inspection_scheduled", "inspection_complete"];
            break;
          case "completed":
            statusFilter = ["report_sent", "follow_up"];
            break;
          case "invoiced":
            statusFilter = ["closed_won"];
            break;
          case "closed_lost":
            statusFilter = ["closed_lost", "cancelled"];
            break;
        }

        const leads = await db.select().from(reportRequests)
          .where(sql`${reportRequests.status} IN (${sql.raw(statusFilter.map(s => `'${s}'`).join(","))})`)
          .orderBy(desc(reportRequests.createdAt));

        return leads;
      }),

    // Get category counts for tabs
    getCategoryCounts: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const counts = await db.select({
        status: reportRequests.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(reportRequests)
      .groupBy(reportRequests.status);

      const statusMap = counts.reduce((acc, { status, count }) => {
        acc[status] = count;
        return acc;
      }, {} as Record<string, number>);

      return {
        prospect: (statusMap["new_lead"] || 0) + (statusMap["contacted"] || 0),
        in_progress: (statusMap["appointment_set"] || 0) + (statusMap["inspection_scheduled"] || 0) + (statusMap["inspection_complete"] || 0),
        completed: (statusMap["report_sent"] || 0) + (statusMap["follow_up"] || 0),
        invoiced: statusMap["closed_won"] || 0,
        closed_lost: (statusMap["closed_lost"] || 0) + (statusMap["cancelled"] || 0),
      };
    }),

    // ============ JOB DETAIL PAGE ============

    // Get comprehensive job detail with all related data
    getJobDetail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.id));
        if (!job) throw new Error("Job not found");

        // Get assigned user info
        let assignedUser = null;
        if (job.assignedTo) {
          const [user] = await db.select().from(users).where(eq(users.id, job.assignedTo));
          assignedUser = user;
        }

        // Get all activities (timeline)
        const jobActivities = await db.select({
          id: activities.id,
          activityType: activities.activityType,
          description: activities.description,
          metadata: activities.metadata,
          createdAt: activities.createdAt,
          userId: activities.userId,
        })
        .from(activities)
        .where(eq(activities.reportRequestId, input.id))
        .orderBy(desc(activities.createdAt));

        // Enrich activities with user names
        const userIds = Array.from(new Set(jobActivities.map(a => a.userId).filter((id): id is number => id !== null && id !== undefined)));
        const activityUsers = userIds.length > 0
          ? await db.select({ id: users.id, name: users.name, email: users.email })
              .from(users)
              .where(sql`${users.id} IN (${sql.raw(userIds.join(","))})`)
          : [];
        const userMap = activityUsers.reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<number, any>);

        const enrichedActivities = jobActivities.map(a => ({
          ...a,
          user: a.userId ? userMap[a.userId] : null,
        }));

        // Get all documents
        const jobDocuments = await db.select().from(documents)
          .where(eq(documents.reportRequestId, input.id))
          .orderBy(desc(documents.createdAt));

        // Separate photos from other documents
        const photos = jobDocuments.filter(d => 
          d.category === "drone_photo" || 
          d.category === "inspection_photo" ||
          d.fileType?.startsWith("image/")
        );
        const docs = jobDocuments.filter(d => 
          d.category !== "drone_photo" && 
          d.category !== "inspection_photo" &&
          !d.fileType?.startsWith("image/")
        );

        // Get messages (notes with type 'message')
        const messages = enrichedActivities.filter(a => 
          a.activityType === "message" || a.activityType === "note_added"
        );

        return {
          job,
          assignedUser,
          activities: enrichedActivities,
          documents: docs,
          photos,
          messages,
          timeline: enrichedActivities,
        };
      }),

    // Add message to job
    addMessage: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        message: z.string().min(1),
        isInternal: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.insert(activities).values({
          reportRequestId: input.jobId,
          userId: ctx.user?.id,
          activityType: "message",
          description: input.message,
          metadata: JSON.stringify({ isInternal: input.isInternal }),
        });

        return { success: true };
      }),

    // Upload photo to job
    uploadPhoto: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64
        fileType: z.string(),
        category: z.enum(["drone_photo", "inspection_photo"]).default("inspection_photo"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const buffer = Buffer.from(input.fileData, "base64");
        const fileSize = buffer.length;

        const timestamp = Date.now();
        const safeName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `jobs/${input.jobId}/photos/${timestamp}_${safeName}`;

        const { url } = await storagePut(filePath, buffer, input.fileType);

        const [result] = await db.insert(documents).values({
          reportRequestId: input.jobId,
          uploadedBy: ctx.user?.id,
          fileName: input.fileName,
          fileUrl: url,
          fileType: input.fileType,
          fileSize: fileSize,
          category: input.category,
        });

        await db.insert(activities).values({
          reportRequestId: input.jobId,
          userId: ctx.user?.id,
          activityType: "photo_uploaded",
          description: `Uploaded photo: ${input.fileName}`,
        });

        return { success: true, documentId: result.insertId, url };
      }),

    // Search within job (documents, notes, messages)
    searchJob: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        query: z.string().min(1),
        type: z.enum(["all", "documents", "notes", "photos"]).default("all"),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const searchTerm = `%${input.query}%`;
        const results: { documents: any[]; activities: any[] } = { documents: [], activities: [] };

        if (input.type === "all" || input.type === "documents" || input.type === "photos") {
          const docs = await db.select().from(documents)
            .where(and(
              eq(documents.reportRequestId, input.jobId),
              like(documents.fileName, searchTerm)
            ));
          results.documents = docs;
        }

        if (input.type === "all" || input.type === "notes") {
          const acts = await db.select().from(activities)
            .where(and(
              eq(activities.reportRequestId, input.jobId),
              like(activities.description, searchTerm)
            ))
            .orderBy(desc(activities.createdAt));
          results.activities = acts;
        }

        return results;
      }),
  }),
});

export type AppRouter = typeof appRouter;
