import { z } from "zod";
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import { getDb } from "../../db";
import { inventory, inventoryTransactions, reportRequests } from "../../../drizzle/schema";

export const inventoryRouter = router({
  // Get all inventory items
  getAll: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      lowStock: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      
      if (input?.category) {
        conditions.push(eq(inventory.category, input.category));
      }
      
      if (input?.lowStock) {
        conditions.push(sql`${inventory.quantity} <= ${inventory.reorderLevel}`);
      }

      const items = await db
        .select()
        .from(inventory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(inventory.itemName);

      return items;
    }),

  // Get inventory item by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [item] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, input.id))
        .limit(1);

      return item;
    }),

  // Create inventory item
  create: protectedProcedure
    .input(z.object({
      itemName: z.string(),
      description: z.string().optional(),
      category: z.string(),
      sku: z.string().optional(),
      quantity: z.number().default(0),
      unitOfMeasure: z.string().default("unit"),
      unitCost: z.number().optional(),
      reorderLevel: z.number().default(0),
      supplierName: z.string().optional(),
      supplierContact: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [item] = await db
        .insert(inventory)
        .values({
          itemName: input.itemName,
          description: input.description,
          category: input.category,
          sku: input.sku,
          quantity: input.quantity,
          unitOfMeasure: input.unitOfMeasure,
          unitCost: input.unitCost?.toString(),
          reorderLevel: input.reorderLevel,
          supplierName: input.supplierName,
          supplierContact: input.supplierContact,
          location: input.location,
          notes: input.notes,
        })
        .returning();

      return item;
    }),

  // Update inventory item
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      itemName: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      sku: z.string().optional(),
      quantity: z.number().optional(),
      unitOfMeasure: z.string().optional(),
      unitCost: z.number().optional(),
      reorderLevel: z.number().optional(),
      supplierName: z.string().optional(),
      supplierContact: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {};
      
      if (input.itemName) updateData.itemName = input.itemName;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.category) updateData.category = input.category;
      if (input.sku !== undefined) updateData.sku = input.sku;
      if (input.quantity !== undefined) updateData.quantity = input.quantity;
      if (input.unitOfMeasure) updateData.unitOfMeasure = input.unitOfMeasure;
      if (input.unitCost !== undefined) updateData.unitCost = input.unitCost.toString();
      if (input.reorderLevel !== undefined) updateData.reorderLevel = input.reorderLevel;
      if (input.supplierName !== undefined) updateData.supplierName = input.supplierName;
      if (input.supplierContact !== undefined) updateData.supplierContact = input.supplierContact;
      if (input.location !== undefined) updateData.location = input.location;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const [item] = await db
        .update(inventory)
        .set(updateData)
        .where(eq(inventory.id, input.id))
        .returning();

      return item;
    }),

  // Delete inventory item
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(inventory)
        .where(eq(inventory.id, input.id));

      return { success: true };
    }),

  // Record inventory transaction (purchase, usage, adjustment, return)
  recordTransaction: protectedProcedure
    .input(z.object({
      inventoryId: z.number(),
      transactionType: z.enum(["purchase", "usage", "adjustment", "return"]),
      quantity: z.number(),
      unitCost: z.number().optional(),
      projectId: z.number().optional(),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
      transactionDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Start transaction
      return await db.transaction(async (tx) => {
        // Get current inventory
        const [currentItem] = await tx
          .select()
          .from(inventory)
          .where(eq(inventory.id, input.inventoryId))
          .limit(1);

        if (!currentItem) {
          throw new Error("Inventory item not found");
        }

        // Calculate new quantity based on transaction type
        let newQuantity = currentItem.quantity || 0;
        
        if (input.transactionType === "purchase" || input.transactionType === "return") {
          newQuantity += input.quantity;
        } else if (input.transactionType === "usage") {
          newQuantity -= input.quantity;
          if (newQuantity < 0) {
            throw new Error("Insufficient inventory");
          }
        } else if (input.transactionType === "adjustment") {
          newQuantity = input.quantity; // Direct set for adjustments
        }

        // Update inventory quantity
        await tx
          .update(inventory)
          .set({ 
            quantity: newQuantity,
            lastRestocked: input.transactionType === "purchase" ? new Date() : currentItem.lastRestocked,
          })
          .where(eq(inventory.id, input.inventoryId));

        // Record transaction
        const [transaction] = await tx
          .insert(inventoryTransactions)
          .values({
            inventoryId: input.inventoryId,
            transactionType: input.transactionType,
            quantity: input.quantity,
            unitCost: input.unitCost?.toString(),
            projectId: input.projectId,
            referenceNumber: input.referenceNumber,
            notes: input.notes,
            transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
            createdBy: ctx.user.id,
          })
          .returning();

        return { transaction, newQuantity };
      });
    }),

  // Get transaction history for an item
  getTransactionHistory: protectedProcedure
    .input(z.object({ inventoryId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const transactions = await db
        .select({
          transaction: inventoryTransactions,
          project: {
            id: reportRequests.id,
            fullName: reportRequests.fullName,
          },
        })
        .from(inventoryTransactions)
        .leftJoin(reportRequests, eq(inventoryTransactions.projectId, reportRequests.id))
        .where(eq(inventoryTransactions.inventoryId, input.inventoryId))
        .orderBy(desc(inventoryTransactions.transactionDate));

      return transactions;
    }),

  // Get low stock items
  getLowStock: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const items = await db
      .select()
      .from(inventory)
      .where(sql`${inventory.quantity} <= ${inventory.reorderLevel}`)
      .orderBy(inventory.itemName);

    return items;
  }),

  // Get categories
  getCategories: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const categories = await db
      .selectDistinct({ category: inventory.category })
      .from(inventory);

    return categories.map((c) => c.category).filter(Boolean);
  }),

  // Get inventory stats
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [stats] = await db
      .select({
        totalItems: sql<number>`COUNT(*)`,
        totalValue: sql<number>`SUM(${inventory.quantity} * COALESCE(${inventory.unitCost}, 0))`,
        lowStockCount: sql<number>`COUNT(CASE WHEN ${inventory.quantity} <= ${inventory.reorderLevel} THEN 1 END)`,
        outOfStockCount: sql<number>`COUNT(CASE WHEN ${inventory.quantity} = 0 THEN 1 END)`,
      })
      .from(inventory);

    return {
      totalItems: Number(stats.totalItems) || 0,
      totalValue: Number(stats.totalValue) || 0,
      lowStockCount: Number(stats.lowStockCount) || 0,
      outOfStockCount: Number(stats.outOfStockCount) || 0,
    };
  }),
});
