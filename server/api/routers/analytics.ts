/**
 * Analytics Router
 * Team Performance & Production Dashboard metrics
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { reportRequests, users, editHistory } from "../../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, inArray } from "drizzle-orm";

export const analyticsRouter = router({
  /**
   * Get sales metrics per user with leaderboard
   * Returns revenue, leads assigned, and conversion rates
   */
  getSalesMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.string(), // ISO date string
        endDate: z.string(),   // ISO date string
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Get all active sales users (sales_rep, team_lead, admin, owner)
      const salesUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          image: users.image,
        })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            inArray(users.role, ['sales_rep', 'team_lead', 'admin', 'owner'])
          )
        );

      // Calculate metrics for each user
      const userMetrics = await Promise.all(
        salesUsers.map(async (user) => {
          // Count leads assigned to this user in date range
          const leadsAssigned = await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(reportRequests)
            .where(
              and(
                eq(reportRequests.assignedTo, user.id),
                gte(reportRequests.createdAt, startDate),
                lte(reportRequests.createdAt, endDate)
              )
            );

          // Count closed deals (status = 'closed_deal')
          const closedDeals = await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(reportRequests)
            .where(
              and(
                eq(reportRequests.assignedTo, user.id),
                eq(reportRequests.status, 'closed_deal'),
                gte(reportRequests.createdAt, startDate),
                lte(reportRequests.createdAt, endDate)
              )
            );

          // Calculate total revenue from closed deals
          const revenueResult = await db
            .select({ 
              total: sql<number>`COALESCE(SUM(CAST(${reportRequests.totalPrice} AS DECIMAL)), 0)::float` 
            })
            .from(reportRequests)
            .where(
              and(
                eq(reportRequests.assignedTo, user.id),
                eq(reportRequests.status, 'closed_deal'),
                gte(reportRequests.createdAt, startDate),
                lte(reportRequests.createdAt, endDate)
              )
            );

          const leadsCount = leadsAssigned[0]?.count || 0;
          const dealsCount = closedDeals[0]?.count || 0;
          const revenue = revenueResult[0]?.total || 0;
          const conversionRate = leadsCount > 0 ? (dealsCount / leadsCount) * 100 : 0;

          return {
            userId: user.id,
            userName: user.name || user.email || 'Unknown',
            userEmail: user.email,
            userRole: user.role,
            userImage: user.image,
            leadsAssigned: leadsCount,
            closedDeals: dealsCount,
            revenue: revenue,
            conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal
          };
        })
      );

      // Sort by revenue for leaderboard
      const sortedByRevenue = [...userMetrics].sort((a, b) => b.revenue - a.revenue);
      const leaderboard = sortedByRevenue.slice(0, 3);

      return {
        metrics: userMetrics,
        leaderboard: leaderboard,
        dateRange: {
          start: input.startDate,
          end: input.endDate,
        },
      };
    }),

  /**
   * Get production velocity time-series data
   * Returns jobs scheduled, completed, and revenue collected per interval
   */
  getProductionVelocity: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        interval: z.enum(['daily', 'weekly']),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Generate time intervals
      const intervals: Array<{ start: Date; end: Date; label: string }> = [];
      
      if (input.interval === 'daily') {
        // Generate daily intervals
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          intervals.push({
            start: dayStart,
            end: dayEnd,
            label: currentDate.toISOString().split('T')[0], // YYYY-MM-DD
          });
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // Generate weekly intervals
        const currentDate = new Date(startDate);
        // Start from beginning of week (Sunday)
        currentDate.setDate(currentDate.getDate() - currentDate.getDay());
        
        while (currentDate <= endDate) {
          const weekStart = new Date(currentDate);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(currentDate);
          weekEnd.setDate(weekEnd.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          
          // Get week number
          const weekNum = getWeekNumber(weekStart);
          
          intervals.push({
            start: weekStart,
            end: weekEnd,
            label: `Week ${weekNum}`,
          });
          
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }

      // Calculate metrics for each interval
      const velocityData = await Promise.all(
        intervals.map(async (interval) => {
          // Jobs scheduled in this interval
          const scheduledJobs = await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(reportRequests)
            .where(
              and(
                gte(reportRequests.scheduledDate, interval.start),
                lte(reportRequests.scheduledDate, interval.end)
              )
            );

          // Jobs completed in this interval (status changed to 'completed')
          // Check edit_history for status changes to 'completed'
          const completedJobs = await db
            .select({ 
              count: sql<number>`COUNT(DISTINCT ${editHistory.reportRequestId})::int` 
            })
            .from(editHistory)
            .where(
              and(
                eq(editHistory.fieldName, 'status'),
                eq(editHistory.newValue, 'completed'),
                gte(editHistory.createdAt, interval.start),
                lte(editHistory.createdAt, interval.end)
              )
            );

          // Revenue collected (jobs with status 'invoiced' or 'closed_deal' in this interval)
          const revenueCollected = await db
            .select({ 
              total: sql<number>`COALESCE(SUM(CAST(${reportRequests.totalPrice} AS DECIMAL)), 0)::float` 
            })
            .from(reportRequests)
            .innerJoin(
              editHistory,
              eq(reportRequests.id, editHistory.reportRequestId)
            )
            .where(
              and(
                eq(editHistory.fieldName, 'status'),
                inArray(editHistory.newValue, ['invoiced', 'closed_deal']),
                gte(editHistory.createdAt, interval.start),
                lte(editHistory.createdAt, interval.end)
              )
            );

          return {
            date: interval.label,
            jobsScheduled: scheduledJobs[0]?.count || 0,
            jobsCompleted: completedJobs[0]?.count || 0,
            revenueCollected: revenueCollected[0]?.total || 0,
          };
        })
      );

      return {
        data: velocityData,
        interval: input.interval,
        dateRange: {
          start: input.startDate,
          end: input.endDate,
        },
      };
    }),
});

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
