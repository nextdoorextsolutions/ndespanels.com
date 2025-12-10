/**
 * Products Router
 * Handles product catalog queries (shingles, materials, etc.)
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { products } from "../../../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";

export const productsRouter = router({
  /**
   * Get all shingles ordered by product name and color
   */
  getShingles: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const shingles = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.category, "Shingle"),
            eq(products.isActive, true)
          )
        )
        .orderBy(asc(products.productName), asc(products.color));
      
      return shingles;
    }),

  /**
   * Get all products by category
   */
  getByCategory: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const categoryProducts = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.category, input),
            eq(products.isActive, true)
          )
        )
        .orderBy(asc(products.productName), asc(products.color));
      
      return categoryProducts;
    }),
});
