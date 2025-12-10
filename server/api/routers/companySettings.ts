import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { companySettings } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Helper function to check if user is owner
function isOwner(user: any): boolean {
  return user?.role === "owner" || user?.role === "OWNER";
}

export const companySettingsRouter = router({
  // Get company settings (any authenticated user can view)
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Get settings (should only be one row with id=1)
      const [settings] = await db
        .select()
        .from(companySettings)
        .where(eq(companySettings.id, 1))
        .limit(1);

      // If no settings exist, return defaults
      if (!settings) {
        return {
          id: 1,
          companyName: "NextDoor Exterior Solutions",
          legalEntityType: null,
          dbaName: null,
          logoUrl: null,
          companyEmail: null,
          companyPhone: null,
          websiteUrl: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          taxId: null,
          contractorLicenseNumber: null,
          additionalLicenses: null,
          insurancePolicyNumber: null,
          insuranceExpirationDate: null,
          insuranceProvider: null,
          bondingInfo: null,
          quoteExpirationDays: 30,
          laborWarrantyYears: 10,
          materialWarrantyYears: 25,
          defaultDepositPercent: "50.00",
          paymentTerms: null,
          termsAndConditions: null,
          cancellationPolicy: null,
          privacyPolicyUrl: null,
          beaconAccountNumber: null,
          beaconBranchCode: null,
          preferredSupplier: "Beacon",
          defaultShingleBrand: "GAF Timberline HDZ",
          updatedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return settings;
    }),

  // Update company settings (owner only)
  update: protectedProcedure
    .input(z.object({
      // Identity & Branding
      companyName: z.string().min(1).max(255),
      legalEntityType: z.enum(["LLC", "Inc", "Corp", "Sole Proprietor", "Partnership"]).optional().nullable(),
      dbaName: z.string().max(255).optional().nullable(),
      logoUrl: z.string().max(500).optional().nullable(),
      
      // Contact Information
      companyEmail: z.string().email().max(320).optional().nullable(),
      companyPhone: z.string().max(50).optional().nullable(),
      websiteUrl: z.string().url().max(500).optional().nullable(),
      
      // Physical Address
      address: z.string().optional().nullable(),
      city: z.string().max(100).optional().nullable(),
      state: z.string().length(2).optional().nullable(),
      zipCode: z.string().max(10).optional().nullable(),
      
      // Tax & Registration
      taxId: z.string().max(20).optional().nullable(),
      
      // Credentials
      contractorLicenseNumber: z.string().max(50).optional().nullable(),
      additionalLicenses: z.any().optional().nullable(),
      insurancePolicyNumber: z.string().max(100).optional().nullable(),
      insuranceExpirationDate: z.string().optional().nullable(),
      insuranceProvider: z.string().max(255).optional().nullable(),
      bondingInfo: z.string().optional().nullable(),
      
      // Business Defaults
      quoteExpirationDays: z.number().int().min(1).max(365).default(30),
      laborWarrantyYears: z.number().int().min(1).max(50).default(10),
      materialWarrantyYears: z.number().int().min(1).max(50).default(25),
      defaultDepositPercent: z.number().min(0).max(100).default(50),
      paymentTerms: z.string().optional().nullable(),
      
      // Legal & Compliance
      termsAndConditions: z.string().optional().nullable(),
      cancellationPolicy: z.string().optional().nullable(),
      privacyPolicyUrl: z.string().url().max(500).optional().nullable(),
      
      // Supplier Defaults
      beaconAccountNumber: z.string().max(100).optional().nullable(),
      beaconBranchCode: z.string().max(50).optional().nullable(),
      preferredSupplier: z.string().max(100).default("Beacon"),
      defaultShingleBrand: z.string().max(100).default("GAF Timberline HDZ"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Only owners can update company settings
      if (!isOwner(ctx.user)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can update company settings",
        });
      }

      // Convert insuranceExpirationDate string to Date if provided
      const insuranceExpDate = input.insuranceExpirationDate 
        ? new Date(input.insuranceExpirationDate) 
        : null;

      // Check if settings exist
      const [existing] = await db
        .select()
        .from(companySettings)
        .where(eq(companySettings.id, 1))
        .limit(1);

      if (existing) {
        // Update existing settings
        const [updated] = await db
          .update(companySettings)
          .set({
            ...input,
            insuranceExpirationDate: insuranceExpDate,
            defaultDepositPercent: input.defaultDepositPercent.toString(),
            updatedBy: ctx.user?.id,
            updatedAt: new Date(),
          })
          .where(eq(companySettings.id, 1))
          .returning();

        return { success: true, settings: updated };
      } else {
        // Insert new settings (first time setup)
        const [created] = await db
          .insert(companySettings)
          .values({
            ...input,
            insuranceExpirationDate: insuranceExpDate,
            defaultDepositPercent: input.defaultDepositPercent.toString(),
            updatedBy: ctx.user?.id,
          })
          .returning();

        return { success: true, settings: created };
      }
    }),

  // Upload logo (owner only)
  uploadLogo: protectedProcedure
    .input(z.object({
      logoUrl: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Only owners can upload logo
      if (!isOwner(ctx.user)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can upload company logo",
        });
      }

      // Update logo URL
      const [updated] = await db
        .update(companySettings)
        .set({
          logoUrl: input.logoUrl,
          updatedBy: ctx.user?.id,
          updatedAt: new Date(),
        })
        .where(eq(companySettings.id, 1))
        .returning();

      return { success: true, logoUrl: updated.logoUrl };
    }),
});
