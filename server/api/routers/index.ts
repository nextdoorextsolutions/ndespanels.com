/**
 * Main Router Assembly
 * 
 * This file re-exports the main router and provides individual router exports.
 * 
 * Refactored routers:
 * - auth -> server/api/routers/auth.ts
 * - solar -> server/api/routers/solar.ts
 * - report -> server/api/routers/report.ts
 * - proposals -> server/api/routers/proposals.ts
 * - materials -> server/api/routers/materials.ts
 * - users -> server/api/routers/users.ts
 * - activities -> server/api/routers/activities.ts
 * - documents -> server/api/routers/documents.ts
 * - jobs -> server/api/routers/jobs.ts (mapped as 'crm' for frontend compatibility)
 * - portal -> server/api/routers/portal.ts (customer-facing portal)
 * 
 * Note: The 'jobs' router is mapped to 'crm' key in appRouter for frontend backwards compatibility.
 * Frontend code uses trpc.crm.* but the internal router is named 'jobs' for semantic clarity.
 */

export { authRouter } from "./auth";
export { solarRouter } from "./solar";
export { reportRouter } from "./report";
export { proposalsRouter } from "./proposals";
export { materialsRouter } from "./materials";
export { usersRouter } from "./users";
export { activitiesRouter } from "./activities";
export { documentsRouter } from "./documents";
export { portalRouter } from "./portal";
export { productsRouter } from "./products";
export { aiRouter } from "./ai";
export { invoicesRouter } from "./invoices";
export { messagingRouter } from "./messaging";
export { analyticsRouter } from "./analytics";
export { commissionsRouter } from "./commissions";
export { reportsRouter } from "./reports";
export { bankingRouter } from "./banking";
export { bankAccountsRouter } from "./bankAccounts";
export { inventoryRouter } from "./inventory";
export { billsRouter } from "./bills";

// Re-export the main router (assembled in server/routers.ts)
// The 'jobs' router is exposed as 'crm' for frontend compatibility
export { appRouter, type AppRouter } from "../../routers";
