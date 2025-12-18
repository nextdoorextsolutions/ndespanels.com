/**
 * Jobs Router - Main Entry Point
 * Combines all job-related sub-routers into a unified API
 * 
 * Structure:
 * - analytics: Stats, reports, counts, dashboard data
 * - documents: File uploads, photos, field uploads
 * - lienRights: Lien tracking, alerts, pre-lien logic
 * - core: CRUD operations (imported from parent jobs.ts)
 */

import { router } from "./shared";
import { analyticsRouter } from "./analytics";
import { documentsRouter } from "./documents";
import { lienRightsRouter } from "./lien-rights";

export const jobsModularRouter = router({
  analytics: analyticsRouter,
  documents: documentsRouter,
  lienRights: lienRightsRouter,
});

// Export sub-routers for potential direct use
export { analyticsRouter, documentsRouter, lienRightsRouter };
