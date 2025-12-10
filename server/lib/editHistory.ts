/**
 * Edit History Helpers
 * 
 * Utilities for logging changes to jobs/leads for audit trail.
 */

// Helper to log edit history
export async function logEditHistory(
  db: any,
  jobId: number,
  userId: number,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null,
  editType: "create" | "update" | "delete" | "assign" | "status_change" = "update",
  ctx?: any
): Promise<void> {
  const { editHistory } = await import("../../drizzle/schema");
  
  await db.insert(editHistory).values({
    reportRequestId: jobId,
    userId: userId,
    fieldName: fieldName,
    oldValue: oldValue,
    newValue: newValue,
    editType: editType,
    ipAddress: ctx?.req?.ip || ctx?.req?.headers?.["x-forwarded-for"] || null,
    userAgent: ctx?.req?.headers?.["user-agent"]?.substring(0, 500) || null,
  });
}
