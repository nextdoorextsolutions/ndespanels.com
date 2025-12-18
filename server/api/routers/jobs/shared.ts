/**
 * Shared utilities and types for jobs routers
 */

import { z } from "zod";

// Email validation helper - allows empty string or valid email
export const emailOrEmpty = z.string().refine(
  (val) => !val || val.length === 0 || z.string().email().safeParse(val).success,
  { message: "Must be a valid email address or empty" }
);

// Re-export commonly used imports
export { protectedProcedure, publicProcedure, router } from "../../../_core/trpc";
export { TRPCError } from "@trpc/server";
export { z } from "zod";
export { getDb } from "../../../db";
export { 
  reportRequests, 
  users, 
  activities, 
  documents, 
  editHistory, 
  jobAttachments, 
  notifications 
} from "../../../../drizzle/schema";
export { eq, desc, and, or, like, sql, gte, lte, inArray, isNotNull } from "drizzle-orm";
export { storagePut, STORAGE_BUCKET } from "../../../storage";
export { supabaseAdmin } from "../../../lib/supabase";
export { extractExifMetadata } from "../../../lib/exif";
export * as solarApi from "../../../lib/solarApi";
export { fetchEstimatorLeads, parseEstimatorAddress, formatEstimateData } from "../../../lib/estimatorApi";
export { sendLienRightsAlertNotification, getLienRightsAlertJobs } from "../../../lienRightsNotification";
export { 
  normalizeRole, 
  isOwner, 
  isAdmin, 
  isTeamLead, 
  canViewJob,
  canEditJob,
  canDeleteJob,
  canViewEditHistory,
  getTeamMemberIds,
  filterLeadsByRole,
} from "../../../lib/rbac";
export { logEditHistory } from "../../../lib/editHistory";
