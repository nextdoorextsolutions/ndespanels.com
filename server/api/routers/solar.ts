import { protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { reportRequests, documents } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import * as solarApi from "../../lib/solarApi";

/**
 * Solar API Router
 * Handles Google Solar API integration and roof measurement data
 * 
 * IMPORTANT: roofAreaSqMeters is returned in SQUARE METERS from the Solar API
 * Convert to square feet using: sqFt = roofAreaSqMeters * 10.764
 */

// Zod schemas for Solar API data validation
const solarPanelSchema = z.object({
  center: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  orientation: z.string(),
  yearlyEnergyDcKwh: z.number(),
  segmentIndex: z.number(),
});

const roofSegmentStatsSchema = z.object({
  pitchDegrees: z.number(),
  azimuthDegrees: z.number(),
  stats: z.object({
    areaMeters2: z.number(),
    sunshineQuantiles: z.array(z.number()),
    groundAreaMeters2: z.number(),
  }),
  center: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  boundingBox: z.object({
    sw: z.object({ latitude: z.number(), longitude: z.number() }),
    ne: z.object({ latitude: z.number(), longitude: z.number() }),
  }),
  planeHeightAtCenterMeters: z.number(),
});

const solarPotentialSchema = z.object({
  wholeRoofStats: z.object({
    areaMeters2: z.number(),
    sunshineQuantiles: z.array(z.number()),
    groundAreaMeters2: z.number(),
  }).optional(),
  roofSegmentStats: z.array(roofSegmentStatsSchema).optional(),
  solarPanels: z.array(solarPanelSchema).optional(),
  maxArrayPanelsCount: z.number().optional(),
  maxArrayAreaMeters2: z.number().optional(),
  maxSunshineHoursPerYear: z.number().optional(),
  carbonOffsetFactorKgPerMwh: z.number().optional(),
}).optional();

const solarApiDataSchema = z.object({
  // Roof measurements (optional when no solar coverage)
  roofAreaSqMeters: z.number().positive().optional(),
  totalArea: z.number().positive().optional(),
  
  // Optional linear measurements
  perimeter: z.number().optional(),
  ridgeLength: z.number().optional(),
  valleyLength: z.number().optional(),
  hipLength: z.number().optional(),
  eaveLength: z.number().optional(),
  rakeLength: z.number().optional(),
  
  // Solar coverage flag
  solarCoverage: z.boolean().optional(),
  
  // Additional metadata
  shingleColor: z.string().optional(),
  roofComplexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  
  // Raw Google Solar API response
  solarPotential: solarPotentialSchema,
  
  // Legacy fields for backward compatibility
  coverage: z.boolean().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export const solarRouter = router({
  // Generate solar report for a job
  generateReport: protectedProcedure
    .input(z.object({ 
      jobId: z.number() 
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const user = ctx.user;
      if (!user) throw new Error("Not authenticated");

      // Get the job
      const [job] = await db.select()
        .from(reportRequests)
        .where(eq(reportRequests.id, input.jobId))
        .limit(1);

      if (!job) {
        throw new Error("Job not found");
      }

      // Fetch solar data using coordinates
      if (!job.latitude || !job.longitude) {
        throw new Error("Job coordinates not available");
      }

      console.log(`[Solar] Fetching solar data for job ${input.jobId} at ${job.latitude}, ${job.longitude}`);
      
      const solarData = await solarApi.fetchSolarApiData(
        job.latitude,
        job.longitude
      );

      console.log(`[Solar] Solar coverage: ${solarData.solarCoverage}`);
      console.log(`[Solar] Roof area (sq meters): ${solarData.roofAreaSqMeters}`);

      // Calculate totalArea in square feet from roofAreaSqMeters
      // 1 square meter = 10.764 square feet
      const totalArea = solarData.roofAreaSqMeters 
        ? solarData.roofAreaSqMeters * 10.764 
        : undefined;

      // Prepare solar data object
      const solarDataToStore = {
        ...solarData,
        totalArea, // Add calculated square feet
        coverage: solarData.solarCoverage,
        lat: solarData.latitude,
        lng: solarData.longitude,
      };

      // Validate solar data with Zod schema
      const validatedData = solarApiDataSchema.parse(solarDataToStore);

      // Store validated solar data in the job
      await db.update(reportRequests)
        .set({
          solarApiData: validatedData,
        })
        .where(eq(reportRequests.id, input.jobId));

      // Create a document record for the solar report
      const reportFileName = `Solar_Report_${job.fullName?.replace(/\s+/g, '_') || 'Job'}_${new Date().toISOString().split('T')[0]}.json`;
      const reportUrl = `data:application/json;base64,${Buffer.from(JSON.stringify(validatedData, null, 2)).toString('base64')}`;
      
      await db.insert(documents).values({
        reportRequestId: input.jobId,
        uploadedBy: user.id,
        fileName: reportFileName,
        fileUrl: reportUrl,
        fileType: 'application/json',
        fileSize: JSON.stringify(validatedData).length,
        category: 'report',
      });

      console.log(`[Solar] Created document record: ${reportFileName}`);

      return {
        success: true,
        solarData: validatedData,
        documentCreated: true,
      };
    }),
});
