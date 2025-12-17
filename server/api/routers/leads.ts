/**
 * Leads Router
 * CSV Import and lead management
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { reportRequests } from "../../../drizzle/schema";

export const leadsRouter = router({
  /**
   * Import leads from CSV
   * Bulk insert leads with status = 'lead' and source = 'Imported'
   */
  importLeads: protectedProcedure
    .input(
      z.object({
        leads: z.array(
          z.object({
            name: z.string().min(1, "Name is required"),
            address: z.string().min(1, "Address is required"),
            phone: z.string().min(1, "Phone is required"),
            email: z.string().email().optional().or(z.literal("")),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const user = ctx.user;
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to import leads",
        });
      }

      // Validate input
      if (!input.leads || input.leads.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No leads provided for import",
        });
      }

      // Prepare leads for bulk insert
      const leadsToInsert = input.leads.map((lead) => ({
        fullName: lead.name,
        address: lead.address,
        phone: lead.phone,
        email: lead.email || null,
        status: "lead" as const,
        promoCode: "Imported",
        assignedTo: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Default values for required fields
        cityStateZip: "",
        latitude: null,
        longitude: null,
        roofAge: null,
        roofConcerns: null,
        dealType: "cash" as const,
        amountPaid: 0,
        totalPrice: null,
        needsFollowUp: false,
        scheduledDate: null,
        completedDate: null,
        lienRightsStatus: null,
        lienRightsDeadline: null,
        lienRightsNotifiedAt: null,
      }));

      try {
        // Bulk insert leads
        const insertedLeads = await db
          .insert(reportRequests)
          .values(leadsToInsert)
          .returning({ id: reportRequests.id, fullName: reportRequests.fullName });

        return {
          success: true,
          count: insertedLeads.length,
          leads: insertedLeads,
          message: `Successfully imported ${insertedLeads.length} lead(s)`,
        };
      } catch (error) {
        console.error("[importLeads] Error inserting leads:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to import leads. Please check your data and try again.",
        });
      }
    }),
});
