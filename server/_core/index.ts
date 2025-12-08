// @ts-nocheck
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

// ============================================
// Environment Variable Validation
// ============================================
const requiredEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const optionalEnvVars = [
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
// Create Express App
// ============================================
const app = express();

// ============================================
// CORS Configuration
// ============================================
const frontendUrl = process.env.FRONTEND_URL || "https://ndespanels.com";
console.log("[Server] FRONTEND_URL:", frontendUrl);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any Vercel preview deployment, local dev, or production
    const allowedOrigins = [
      frontendUrl,
      "https://ndespanels.com",
      "http://localhost:5173",
      "http://localhost:3000",
    ];
    
    if (
      origin.endsWith(".vercel.app") || 
      origin.includes("localhost") || 
      allowedOrigins.includes(origin)
    ) {
      console.log(`[CORS] Allowed origin: ${origin}`);
      return callback(null, true);
    }
    
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  // CRITICAL: Allow Authorization header for Bearer token authentication
  allowedHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
}));

console.log("[Server] CORS configured for:", { frontendUrl, allowedPatterns: ["*.vercel.app", "localhost", "ndespanels.com"] });

// ============================================
// DEBUG: Request Logging Middleware (FIRST)
// ============================================
app.use((req: any, _res: any, next: any) => {
  console.log('[DEBUG] === Incoming Request ===');
  console.log('[DEBUG] Method:', req.method);
  console.log('[DEBUG] Original URL:', req.originalUrl);
  console.log('[DEBUG] Path:', req.path);
  console.log('[DEBUG] Base URL:', req.baseUrl);
  console.log('[DEBUG] URL:', req.url);
  console.log('[DEBUG] Headers:', JSON.stringify({
    host: req.headers.host,
    'x-forwarded-proto': req.headers['x-forwarded-proto'],
    'x-vercel-id': req.headers['x-vercel-id'],
    'content-type': req.headers['content-type'],
  }, null, 2));
  console.log('[DEBUG] === End Request Info ===');
  next();
});

// ============================================
// Body Parsers
// ============================================
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// ============================================
// Health Check Endpoint
// ============================================
app.get("/api/health", (_req: any, res: any) => {
  console.log("[Health] Route hit: /api/health");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
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
    onError: ({ error, path }: { error: any; path: string | undefined }) => {
      console.error(`[tRPC] Error in ${path}:`, error.message);
    },
  })
);

// ============================================
// Log Registered Routes
// ============================================
console.log('[STARTUP] Registered Express routes:');
if (app._router && app._router.stack) {
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      console.log('[STARTUP] Route:', Object.keys(middleware.route.methods).join(',').toUpperCase(), middleware.route.path);
    } else if (middleware.name === 'router') {
      console.log('[STARTUP] Router middleware at:', middleware.regexp);
    }
  });
}

// ============================================
// 404 Handler (MUST be after all routes)
// ============================================
app.use((req: any, res: any) => {
  console.log('[404] No route matched for:', req.method, req.path);
  console.log('[404] Original URL:', req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    originalUrl: req.originalUrl,
    method: req.method 
  });
});

// ============================================
// Error Handler (MUST be last)
// ============================================
app.use((err: any, req: any, res: any, _next: any) => {
  console.error('[ERROR] Unhandled error:', err);
  console.error('[ERROR] Request was:', req.method, req.path);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ============================================
// Export for module imports
// ============================================
export default app;

// ============================================
// Server Startup
// ============================================
const port = parseInt(process.env.PORT || "3000");

if (process.env.NODE_ENV === "development") {
  // Development mode with Vite HMR
  (async () => {
    try {
      const { createServer } = await import("http");
      const { setupVite } = await import("./vite");
      
      const server = createServer(app);
      await setupVite(app, server);
      
      server.listen(port, () => {
        console.log(`[Server] Dev server running on http://localhost:${port}/`);
      });
    } catch (err) {
      console.error("[Server] Failed to start development server:", err);
    }
  })();
} else {
  // Production mode (Render)
  app.listen(port, () => {
    console.log(`[Server] Production server running on port ${port}`);
  });
}
