import { protectedProcedure, ownerOfficeProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { reportRequests, materialOrders } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { storagePut, storageGet } from "../../storage";
import { calculateMaterialOrder, generateBeaconCSV, generateOrderNumber } from "../../lib/materialCalculator";
import { MATERIAL_DEFAULTS } from "../../lib/materialConstants";
import { generateMaterialOrderPDF } from "../../lib/materialOrderPDF";
import { canViewJob } from "../../lib/rbac";

/**
 * Materials Router
 * Handles material orders, Beacon CSV generation, and material kit management
 */
export const materialsRouter = router({
  // Generate Beacon PRO+ order
  generateBeaconOrder: ownerOfficeProcedure
    .input(z.object({
      jobId: z.number(),
      shingleColor: z.string().optional(),
      materialSystem: z.string().optional(),
      roofComplexity: z.enum(["simple", "moderate", "complex"]).default("moderate"),
      accessories: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get job data
      const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
      if (!job) throw new Error("Job not found");

      // Check permissions
      if (!canViewJob(ctx.user, job)) {
        throw new Error("You don't have permission to access this job");
      }

      console.log(`[GenerateBeaconOrder] Generating material order for job ${input.jobId}`);

      // Extract roof measurements from solarApiData or manual measurements
      const solarData = job.solarApiData as any;
      
      if (!solarData) {
        throw new Error("No roof measurements available. Please generate a roof report first.");
      }

      // Calculate roof metrics
      const measurements = {
        totalArea: solarData.totalArea || (solarData.roofAreaSqMeters 
          ? solarData.roofAreaSqMeters * 10.764 
          : 0),
        perimeter: 0, // Will be calculated from segments
        eaves: 0,
        rakes: 0,
        ridges: 0,
        valleys: 0,
        hips: 0,
      };

      // If we have segment stats, calculate linear measurements
      if (solarData.solarPotential?.roofSegmentStats) {
        // Simplified calculation - in production, use proper geometry
        const estimatedPerimeter = Math.sqrt(measurements.totalArea) * 4;
        measurements.perimeter = estimatedPerimeter;
        measurements.eaves = estimatedPerimeter * 0.5;
        measurements.rakes = estimatedPerimeter * 0.3;
        measurements.ridges = estimatedPerimeter * 0.2;
        measurements.valleys = 0; // Would need valley detection
        measurements.hips = 0;
      }

      // Calculate material order
      const materialOrder = calculateMaterialOrder(
        measurements,
        { roofComplexity: input.roofComplexity },
        input.accessories
      );

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Generate CSV for Beacon PRO+
      const csvContent = generateBeaconCSV(materialOrder.lineItems);
      const csvBlob = Buffer.from(csvContent);
      const csvFilename = `beacon-order-${orderNumber}.csv`;

      // Upload CSV to storage
      let csvUrl = null;
      try {
        const csvPath = `material-orders/${job.id}/${csvFilename}`;
        await storagePut(csvPath, csvBlob, "text/csv");
        csvUrl = await storageGet(csvPath);
      } catch (error) {
        console.error("[GenerateBeaconOrder] Error uploading CSV:", error);
      }

      // Save material order to database
      const [savedOrder] = await db.insert(materialOrders).values({
        reportRequestId: input.jobId,
        orderNumber,
        status: "draft",
        shingleColor: input.shingleColor,
        materialSystem: input.materialSystem,
        lineItems: materialOrder.lineItems,
        accessories: input.accessories || [],
        totalSquares: materialOrder.totalSquares,
        csvUrl: csvUrl?.url || null,
        createdBy: ctx.user?.id,
      }).returning();

      console.log(`[GenerateBeaconOrder] Order created: ${orderNumber}`);

      return {
        success: true,
        order: savedOrder,
        materialOrder,
        csvUrl,
      };
    }),

  // Get material orders for a job
  getMaterialOrders: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get job to check permissions
      const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
      if (!job) throw new Error("Job not found");

      if (!canViewJob(ctx.user, job)) {
        throw new Error("You don't have permission to access this job");
      }

      const orders = await db.select()
        .from(materialOrders)
        .where(eq(materialOrders.reportRequestId, input.jobId))
        .orderBy(desc(materialOrders.createdAt));

      return orders;
    }),

  // Get material kit defaults
  getMaterialKits: protectedProcedure
    .query(async ({ ctx }) => {
      // Return the material constants for now
      // In the future, this could query the materialKits table
      return Object.entries(MATERIAL_DEFAULTS).map(([key, value]) => ({
        id: key,
        ...value,
      }));
    }),

  // Generate Material Order PDF (Owner/Office only)
  generateMaterialOrderPDF: ownerOfficeProcedure
    .input(z.object({
      jobId: z.number(),
      jobAddress: z.string(),
      shingleSystem: z.string(),
      shingleColor: z.string(),
      wastePercent: z.number(),
      calculatedItems: z.object({
        shingleBundles: z.number(),
        starterBundles: z.number(),
        hipRidgeBundles: z.number(),
        underlaymentRolls: z.number(),
        iceWaterRolls: z.number(),
        nailBoxes: z.number(),
      }),
      accessories: z.object({
        dripEdge: z.number(),
        pipeBoots: z.number(),
        gooseNecks: z.number(),
        sprayPaint: z.number(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get job to check permissions
      const [job] = await db.select().from(reportRequests).where(eq(reportRequests.id, input.jobId));
      if (!job) throw new Error("Job not found");

      if (!canViewJob(ctx.user, job)) {
        throw new Error("You don't have permission to access this job");
      }

      console.log(`[GenerateMaterialOrderPDF] Generating PDF for job ${input.jobId}`);

      // Generate PDF
      const pdfBuffer = await generateMaterialOrderPDF({
        jobAddress: input.jobAddress,
        orderDate: new Date().toLocaleDateString(),
        orderedBy: ctx.user?.name || ctx.user?.email || 'Unknown',
        shingleSystem: input.shingleSystem,
        shingleColor: input.shingleColor,
        wastePercent: input.wastePercent,
        calculatedItems: input.calculatedItems,
        accessories: input.accessories,
      });

      // Upload PDF to storage
      const timestamp = Date.now();
      const pdfPath = `material-orders/${input.jobId}/order-${timestamp}.pdf`;
      
      try {
        await storagePut(pdfPath, pdfBuffer, "application/pdf");
        const pdfUrl = await storageGet(pdfPath);

        console.log(`[GenerateMaterialOrderPDF] PDF uploaded: ${pdfPath}`);

        return {
          success: true,
          pdfUrl,
        };
      } catch (error) {
        console.error("[GenerateMaterialOrderPDF] Error uploading PDF:", error);
        throw new Error("Failed to upload PDF");
      }
    }),
});
