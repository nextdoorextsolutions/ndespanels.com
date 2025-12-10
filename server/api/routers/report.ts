import { publicProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { validatePromoCode } from "../../products";

/**
 * Report Router
 * Handles public report request submissions from the landing page
 */
export const reportRouter = router({
  validatePromo: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(({ input }) => {
      const result = validatePromoCode(input.code);
      return result;
    }),

  submit: publicProcedure
    .input(z.object({
      fullName: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(10),
      address: z.string().min(5),
      cityStateZip: z.string().min(5),
      roofAge: z.string().optional(),
      roofConcerns: z.string().optional(),
      handsOnInspection: z.boolean().optional(),
      promoCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const promoResult = input.promoCode ? validatePromoCode(input.promoCode) : { valid: false, discountPercent: 0, salesRep: undefined };
      const isFree = promoResult.valid && promoResult.discountPercent === 100;
      const salesRepAttribution = promoResult.salesRep || "Direct/No Code";
      const handsOnText = input.handsOnInspection ? "✅ YES - Requested" : "No";
      const concernsText = input.roofConcerns?.trim() || "None specified";

      // Landing page/inspection submissions disabled - client portal only  
      // Return a disabled response instead of throwing to maintain type safety
      return { 
        success: false, 
        requiresPayment: false, 
        checkoutUrl: null, 
        requestId: null, 
        error: "Storm report submissions are not available. Please contact us directly." 
      };
    }),
});
