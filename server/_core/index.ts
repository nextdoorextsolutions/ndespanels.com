import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import Stripe from "stripe";
import { ENV } from "./env";
import { getDb } from "../db";
import { reportRequests } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./notification";
import { sendSMSNotification } from "../sms";

const stripe = new Stripe(ENV.stripeSecretKey || "", {
  apiVersion: "2025-11-17.clover",
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Stripe webhook route - MUST be before express.json() middleware
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, ENV.stripeWebhookSecret);
    } catch (err: any) {
      console.error("[Webhook] Signature verification failed:", err.message);
      // Security fix: Return generic error message to prevent information disclosure
      return res.status(400).send("Webhook signature verification failed");
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log("[Webhook] Received event:", event.type);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const requestId = session.metadata?.request_id;
        
        if (requestId) {
          try {
            const db = await getDb();
            if (db) {
              // Update the report request status
              await db.update(reportRequests)
                .set({
                  paymentStatus: "paid",
                  amountPaid: session.amount_total || 19900,
                  stripePaymentIntentId: session.payment_intent as string,
                })
                .where(eq(reportRequests.id, parseInt(requestId)));

              // Get the request details for notification
              const [request] = await db.select().from(reportRequests).where(eq(reportRequests.id, parseInt(requestId)));
              
              if (request) {
                // Send email notification to owner
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

                // Send SMS notification to owner
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
            }
          } catch (dbError) {
            // Stability fix: Catch database errors to prevent crash loops
            console.error("[Webhook] Database operation failed:", dbError);
            // Don't throw - we still want to acknowledge the webhook
          }
        }
        break;
      }
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  });

  // Configure body parser with safe size limits
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
