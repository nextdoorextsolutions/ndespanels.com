/**
 * App Router - Main tRPC Router Assembly
 * 
 * This file imports and mounts all domain-specific routers.
 * All business logic has been extracted to server/api/routers/
 * 
 * Router Organization:
 * - Core System: system, auth
 * - CRM & Jobs: crm (jobs), leads, activities, documents
 * - Customer-Facing: portal, proposals, estimates, report
 * - Finance: invoices, commissions, materials, products
 * - Team: users, messaging, events, analytics
 * - Integrations: ai, solar
 * - Infrastructure: utility
 */

import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";

// Domain-specific routers
import { authRouter } from "./api/routers/auth";
import { solarRouter } from "./api/routers/solar";
import { reportRouter } from "./api/routers/report";
import { proposalsRouter } from "./api/routers/proposals";
import { materialsRouter } from "./api/routers/materials";
import { usersRouter } from "./api/routers/users";
import { activitiesRouter } from "./api/routers/activities";
import { documentsRouter } from "./api/routers/documents";
import { jobsRouter } from "./api/routers/jobs";
import { portalRouter } from "./api/routers/portal";
import { productsRouter } from "./api/routers/products";
import { aiRouter } from "./api/routers/ai";
import { invoicesRouter } from "./api/routers/invoices";
import { messagingRouter } from "./api/routers/messaging";
import { estimatesRouter } from "./api/routers/estimates";
import { utilityRouter } from "./api/routers/utility";
import { analyticsRouter } from "./api/routers/analytics";
import { commissionsRouter } from "./api/routers/commissions";
import { leadsRouter } from "./api/routers/leads";
import { eventsRouter } from "./api/routers/events";
import { paymentsRouter } from "./api/routers/payments";

export const appRouter = router({
  // Core System
  system: systemRouter,
  auth: authRouter,
  
  // CRM & Jobs
  crm: jobsRouter, // Main jobs/leads router (kept as 'crm' for frontend compatibility)
  leads: leadsRouter,
  activities: activitiesRouter,
  documents: documentsRouter,
  
  // Customer-Facing
  portal: portalRouter,
  proposals: proposalsRouter,
  estimates: estimatesRouter,
  report: reportRouter,
  
  // Finance & Operations
  invoices: invoicesRouter,
  commissions: commissionsRouter,
  payments: paymentsRouter,
  materials: materialsRouter,
  products: productsRouter,
  
  // Team Collaboration
  users: usersRouter,
  messaging: messagingRouter,
  events: eventsRouter,
  analytics: analyticsRouter,
  
  // Integrations
  ai: aiRouter,
  solar: solarRouter,
  
  // Infrastructure
  utility: utilityRouter,
});

export type AppRouter = typeof appRouter;
