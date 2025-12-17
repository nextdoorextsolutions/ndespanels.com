/**
 * Centralized Zod Validators
 * Common validation schemas used across multiple routers
 * Following DRY principle to avoid duplication
 */

import { z } from "zod";

/**
 * Common ID validators
 */
export const idSchema = z.object({ 
  id: z.number() 
});

export const jobIdSchema = z.object({ 
  jobId: z.number() 
});

export const userIdSchema = z.object({ 
  userId: z.number() 
});

/**
 * Pagination schemas
 */
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const cursorPaginationSchema = z.object({
  cursor: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
});

/**
 * Date range schemas
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const dateRangeRequiredSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

/**
 * Search and filter schemas
 */
export const searchSchema = z.object({
  query: z.string().min(1).max(255),
});

export const searchWithPaginationSchema = searchSchema.merge(paginationSchema);

/**
 * Email validation helper
 * Allows empty string or valid email
 */
export const emailOrEmpty = z.string().refine(
  (val) => !val || val.length === 0 || z.string().email().safeParse(val).success,
  { message: "Must be a valid email address or empty" }
);

/**
 * File upload schemas
 */
export const fileUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileData: z.string(), // Base64 encoded
  fileType: z.string().min(1).max(100),
});

export const fileUploadWithJobSchema = fileUploadSchema.extend({
  jobId: z.number(),
});

/**
 * Status and state schemas
 */
export const booleanToggleSchema = z.object({
  enabled: z.boolean(),
});

/**
 * Bulk operation schemas
 */
export const bulkIdsSchema = z.object({
  ids: z.array(z.number()).min(1).max(100),
});

/**
 * Sorting schemas
 */
export const sortOrderSchema = z.enum(["asc", "desc"]);

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema.optional(),
});

/**
 * Common field validators
 */
export const phoneSchema = z.string().optional();
export const zipCodeSchema = z.string().optional();
export const urlSchema = z.string().url();
export const optionalUrlSchema = z.string().url().optional();

/**
 * Money/currency schemas
 */
export const moneySchema = z.number().min(0).max(999999999.99);
export const optionalMoneySchema = moneySchema.optional();

/**
 * Metadata schemas
 */
export const metadataSchema = z.record(z.unknown()).optional();

/**
 * Common update patterns
 */
export const updateByIdSchema = z.object({
  id: z.number(),
  data: z.record(z.unknown()),
});

/**
 * Soft delete schema
 */
export const softDeleteSchema = z.object({
  id: z.number(),
  reason: z.string().optional(),
});
