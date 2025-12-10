// @ts-nocheck
import { protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { reportRequests } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import * as solarApi from "../../lib/solarApi";

/**
 * Solar API Router
 * Handles Google Solar API integration and roof measurement data
 * 
 * IMPORTANT: roofAreaSqMeters is returned in SQUARE METERS from the Solar API
 * Convert to square feet using: sqFt = roofAreaSqMeters * 10.764
 */
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

      // Store solar data in the job
      await db.update(reportRequests)
        .set({
          solarApiData: {
            ...solarData,
            totalArea, // Add calculated square feet
            coverage: solarData.solarCoverage,
            lat: solarData.latitude,
            lng: solarData.longitude,
          } as any,
        })
        .where(eq(reportRequests.id, input.jobId));

      return {
        success: true,
        solarData: {
          ...solarData,
          totalArea,
        },
      };
    }),
});
