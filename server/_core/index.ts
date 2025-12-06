import "dotenv/config";
import express, { Request, Response, Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import Stripe from "stripe";
import { ENV } from "./env";
import { getDb } from "../db";
import { reportRequests } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./notification";
import { sendSMSNotification } from "../sms";

// ============================================
// Environment Variable Validation
// ============================================
const requiredEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const optionalEnvVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
];

console.log("[Server] Environment check:");
console.log("[Server] NODE_ENV:", process.env.NODE_ENV);

const missingRequired: string[] = [];
requiredEnvVars.forEach(key => {
  const value = process.env[key];
  if (!value) {
    missingRequired.push(key);
    console.error(`[Server] MISSING REQUIRED: ${key}`);
  } else {
    console.log(`[Server] ✓ ${key}: ${value.substring(0, 20)}...`);
  }
});

optionalEnvVars.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`[Server] ✓ ${key}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`[Server] ○ ${key}: not set (optional)`);
  }
});

if (missingRequired.length > 0) {
  console.error(`[Server] Missing required environment variables: ${missingRequired.join(", ")}`);
}

// ============================================
// Initialize Stripe (with error handling)
// ============================================
let stripe: Stripe | null = null;
try {
  if (ENV.stripeSecretKey) {
    stripe = new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2025-11-17.clover",
    });
    console.log("[Server] Stripe initialized successfully");
  } else {
    console.warn("[Server] Stripe not initialized - missing STRIPE_SECRET_KEY");
  }
} catch (err) {
  console.error("[Server] Failed to initialize Stripe:", err);
}

// ============================================
// Create Express App
// ============================================
const app: Express = express();

// ============================================
// Stripe Webhook Route (MUST be before express.json())
// ============================================
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  if (!stripe) {
    console.error("[Webhook] Stripe not initialized");
    return res.status(500).json({ error: "Stripe not configured" });
  }

  const sig = req.headers["stripe-signature"] as string;
  
  if (!sig) {
    console.error("[Webhook] Missing stripe-signature header");
    return res.status(400).send("Missing signature");
  }

  if (!ENV.stripeWebhookSecret) {
    console.error("[Webhook] Missing STRIPE_WEBHOOK_SECRET");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, ENV.stripeWebhookSecret);
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).send("Webhook signature verification failed");
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log("[Webhook] Received event:", event.type);

  // Process event with error handling
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const requestId = session.metadata?.request_id;
        
        if (requestId) {
          try {
            const db = await getDb();
            if (!db) {
              console.error("[Webhook] Database not available");
              break;
            }

            await db.update(reportRequests)
              .set({
                paymentStatus: "paid",
                amountPaid: session.amount_total || 19900,
                stripePaymentIntentId: session.payment_intent as string,
              })
              .where(eq(reportRequests.id, parseInt(requestId)));

            const [request] = await db.select().from(reportRequests).where(eq(reportRequests.id, parseInt(requestId)));
            
            if (request) {
              // Send notifications (non-blocking)
              try {
                await notifyOwner({
                  title: "💰 New PAID Storm Report Request",
                  content: `
**New Paid Report Request Received**

**Customer Details:**
- Name: ${request.fullName}
- Email: ${request.email}
- Phone: ${request.phone}

**Property:**
- Address: ${request.address}
- City/State/ZIP: ${request.cityStateZip}
- Roof Age: ${request.roofAge || "Not specified"}

**Payment:**
- Amount: $${((session.amount_total || 19900) / 100).toFixed(2)}
- Payment ID: ${session.payment_intent}

**Status:** Paid - Ready for Scheduling
                  `.trim(),
                });
              } catch (notifyError) {
                console.error("[Webhook] Failed to send owner notification:", notifyError);
              }

              try {
                await sendSMSNotification({
                  customerName: request.fullName,
                  customerPhone: request.phone,
                  address: `${request.address}, ${request.cityStateZip}`,
                  isPaid: true,
                  amount: session.amount_total || 19900,
                });
              } catch (smsError) {
                console.error("[Webhook] Failed to send SMS notification:", smsError);
              }
            }
          } catch (dbError) {
            console.error("[Webhook] Database operation failed:", dbError);
          }
        }
        break;
      }
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (processingError) {
    console.error("[Webhook] Event processing failed:", processingError);
    // Still return 200 to acknowledge receipt
  }

  res.json({ received: true });
});

// ============================================
// Body Parsers (after webhook route)
// ============================================
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// ============================================
// Health Check Endpoint
// ============================================
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    stripe: !!stripe,
    missingEnv: missingRequired,
  });
});

// ============================================
// OAuth Routes
// ============================================
try {
  registerOAuthRoutes(app);
  console.log("[Server] OAuth routes registered");
} catch (err) {
  console.error("[Server] Failed to register OAuth routes:", err);
}

// ============================================
// tRPC API
// ============================================
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      console.error(`[tRPC] Error in ${path}:`, error.message);
    },
  })
);

// ============================================
// Error Handler
// ============================================
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error("[Server] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ============================================
// Export for Vercel Serverless
// ============================================
export default app;

// ============================================
// Development Server (only runs locally)
// ============================================
if (process.env.NODE_ENV === "development") {
  (async () => {
    try {
      const { createServer } = await import("http");
      const { setupVite } = await import("./vite");
      
      const server = createServer(app);
      await setupVite(app, server);
      
      const port = parseInt(process.env.PORT || "3000");
      server.listen(port, () => {
        console.log(`[Server] Dev server running on http://localhost:${port}/`);
      });
    } catch (err) {
      console.error("[Server] Failed to start development server:", err);
    }
  })();
}
