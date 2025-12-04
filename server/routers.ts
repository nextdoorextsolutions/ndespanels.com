import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { reportRequests } from "../drizzle/schema";
import { PRODUCTS, validatePromoCode } from "./products";
import { notifyOwner } from "./_core/notification";
import { sendSMSNotification } from "./sms";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { eq } from "drizzle-orm";

// Initialize Stripe
const stripe = new Stripe(ENV.stripeSecretKey || "", {
  apiVersion: "2025-11-17.clover",
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Report request procedures
  report: router({
    // Validate promo code
    validatePromo: publicProcedure
      .input(z.object({ code: z.string() }))
      .mutation(({ input }) => {
        const result = validatePromoCode(input.code);
        return result;
      }),

    // Submit report request (with or without payment)
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
        if (!db) {
          throw new Error("Database not available");
        }

        // Check if promo code is valid
        const promoResult = input.promoCode ? validatePromoCode(input.promoCode) : { valid: false, discountPercent: 0 };
        const isFree = promoResult.valid && promoResult.discountPercent === 100;

        // Format hands-on inspection for notifications
        const handsOnText = input.handsOnInspection ? "✅ YES - Requested" : "No";
        const concernsText = input.roofConcerns?.trim() || "None specified";

        if (isFree) {
          // Free submission with valid promo code
          const [result] = await db.insert(reportRequests).values({
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            address: input.address,
            cityStateZip: input.cityStateZip,
            roofAge: input.roofAge || null,
            roofConcerns: input.roofConcerns || null,
            handsOnInspection: input.handsOnInspection || false,
            promoCode: input.promoCode?.toUpperCase() || null,
            promoApplied: true,
            amountPaid: 0,
            status: "pending",
          });

          // Send email notification to owner
          await notifyOwner({
            title: input.handsOnInspection 
              ? "🏠🔧 New Storm Report Request (FREE + HANDS-ON)" 
              : "🏠 New Storm Report Request (FREE - Promo Code)",
            content: `
**New Report Request Received**

**Customer Details:**
- Name: ${input.fullName}
- Email: ${input.email}
- Phone: ${input.phone}

**Property:**
- Address: ${input.address}
- City/State/ZIP: ${input.cityStateZip}
- Roof Age: ${input.roofAge || "Not specified"}

**Roof Concerns:**
${concernsText}

**Hands-On Inspection:** ${handsOnText}

**Payment:**
- Promo Code: ${input.promoCode?.toUpperCase()}
- Amount: $0.00 (Fee Waived)

**Status:** Pending Scheduling
            `.trim(),
          });

          // Send SMS notification to owner
          await sendSMSNotification({
            customerName: input.fullName,
            customerPhone: input.phone,
            address: `${input.address}, ${input.cityStateZip}`,
            isPaid: false,
            promoCode: input.promoCode?.toUpperCase(),
          });

          return {
            success: true,
            requiresPayment: false,
            requestId: result.insertId,
          };
        } else {
          // Requires payment - create Stripe checkout session
          const origin = ctx.req.headers.origin || "http://localhost:3000";
          
          // Create a pending request first
          const [result] = await db.insert(reportRequests).values({
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            address: input.address,
            cityStateZip: input.cityStateZip,
            roofAge: input.roofAge || null,
            roofConcerns: input.roofConcerns || null,
            handsOnInspection: input.handsOnInspection || false,
            promoCode: input.promoCode?.toUpperCase() || null,
            promoApplied: false,
            amountPaid: 0,
            status: "pending",
          });

          const requestId = result.insertId;

          // Create Stripe checkout session
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
              {
                price_data: {
                  currency: PRODUCTS.STORM_REPORT.currency,
                  product_data: {
                    name: PRODUCTS.STORM_REPORT.name,
                    description: PRODUCTS.STORM_REPORT.description,
                  },
                  unit_amount: PRODUCTS.STORM_REPORT.priceInCents,
                },
                quantity: 1,
              },
            ],
            mode: "payment",
            success_url: `${origin}/?success=true&request_id=${requestId}`,
            cancel_url: `${origin}/?cancelled=true`,
            customer_email: input.email,
            client_reference_id: requestId.toString(),
            metadata: {
              request_id: requestId.toString(),
              customer_name: input.fullName,
              customer_email: input.email,
              customer_phone: input.phone,
              address: input.address,
              city_state_zip: input.cityStateZip,
              hands_on_inspection: input.handsOnInspection ? "yes" : "no",
            },
          });

          // Update request with checkout session ID
          await db.update(reportRequests)
            .set({ stripeCheckoutSessionId: session.id })
            .where(eq(reportRequests.id, requestId));

          return {
            success: true,
            requiresPayment: true,
            checkoutUrl: session.url,
            requestId,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
