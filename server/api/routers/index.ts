// @ts-nocheck
/**
 * Main Router Assembly (OPTIONAL ENTRY POINT)
 * 
 * This file can be used as an alternative entry point for the router.
 * Currently, the main router is still assembled in server/routers.ts
 * 
 * Refactored routers:
 * - auth -> server/api/routers/auth.ts
 * - solar -> server/api/routers/solar.ts
 * - report -> server/api/routers/report.ts
 * - proposals -> server/api/routers/proposals.ts
 * - materials -> server/api/routers/materials.ts
 * 
 * TODO: Rename remaining CRM router to jobs.ts
 */

export { authRouter } from "./auth";
export { solarRouter } from "./solar";
export { reportRouter } from "./report";
export { proposalsRouter } from "./proposals";
export { materialsRouter } from "./materials";

// Re-export the main router from the legacy file for now
export { appRouter, type AppRouter } from "../../routers";
