/**
 * Jobs Lien Rights Router
 * Handles lien tracking, alerts, and pre-lien/lien release logic
 */

import {
  protectedProcedure,
  router,
  getDb,
  reportRequests,
  eq,
  and,
  or,
  isNotNull,
  filterLeadsByRole,
  getLienRightsAlertJobs,
  sendLienRightsAlertNotification,
  isOwner,
  isAdmin,
  z,
} from "./shared";

export const lienRightsRouter = router({
  // Get lien rights jobs with urgency tracking
  getLienRightsJobs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get all jobs with lien rights tracking (completed or invoiced status)
    let leads = await db.select().from(reportRequests)
      .where(
        and(
          or(
            eq(reportRequests.status, "completed"),
            eq(reportRequests.status, "invoiced")
          ),
          isNotNull(reportRequests.projectCompletedAt)
        )
      )
      .orderBy(reportRequests.lienRightsExpiresAt);

    // Filter by role
    leads = await filterLeadsByRole(db, ctx.user, leads);

    // Calculate days remaining and update status if needed
    const now = new Date();
    const jobsWithLienInfo = leads.map(lead => {
      const expiresAt = lead.lienRightsExpiresAt ? new Date(lead.lienRightsExpiresAt) : null;
      const completedAt = lead.projectCompletedAt ? new Date(lead.projectCompletedAt) : null;
      
      if (!expiresAt || !completedAt) {
        return { ...lead, daysRemaining: null, urgencyLevel: "not_applicable" };
      }
      
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceCompletion = Math.ceil((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      let urgencyLevel: string;
      if (daysRemaining <= 0) {
        urgencyLevel = "expired";
      } else if (daysRemaining <= 14) {
        urgencyLevel = "critical";
      } else if (daysRemaining <= 30) {
        urgencyLevel = "warning";
      } else {
        urgencyLevel = "active";
      }
      
      return {
        ...lead,
        daysRemaining,
        daysSinceCompletion,
        urgencyLevel,
      };
    });

    return jobsWithLienInfo;
  }),

  // Get lien rights alert summary (for dashboard widget)
  getLienRightsAlertSummary: protectedProcedure.query(async () => {
    const { warningJobs, criticalJobs } = await getLienRightsAlertJobs();
    
    return {
      warningCount: warningJobs.length,
      criticalCount: criticalJobs.length,
      warningJobs: warningJobs.slice(0, 5), // Top 5 most urgent
      criticalJobs: criticalJobs.slice(0, 5),
    };
  }),

  // Send lien rights alert notification (Owner/Admin only)
  sendLienRightsAlert: protectedProcedure
    .input(z.object({
      crmUrl: z.string().optional(),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      // Only owners and admins can trigger alerts
      if (!isOwner(ctx.user) && !isAdmin(ctx.user)) {
        throw new Error("Only owners and admins can send lien rights alerts");
      }

      const crmUrl = input?.crmUrl || "https://nextdoor-landing.manus.space";
      const result = await sendLienRightsAlertNotification(crmUrl);
      
      return result;
    }),
});
