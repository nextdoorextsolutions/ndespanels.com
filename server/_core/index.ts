// @ts-nocheck
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";

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
const frontendUrl = process.env.FRONTEND_URL;
const clientUrl = process.env.CLIENT_URL;

// Build allowed origins list from environment variables and hardcoded values
const allowedOrigins = [
  "https://ndespanels.com",
  "https://www.ndespanels.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Add dynamic URLs from environment if they exist
if (frontendUrl) {
  allowedOrigins.push(frontendUrl);
  console.log("[Server] FRONTEND_URL:", frontendUrl);
}
if (clientUrl) {
  allowedOrigins.push(clientUrl);
  console.log("[Server] CLIENT_URL:", clientUrl);
}

console.log("[Server] Allowed CORS origins:", allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] ✓ Allowed origin: ${origin}`);
      return callback(null, true);
    }
    
    // Allow any Vercel preview deployment or localhost
    if (origin.endsWith(".vercel.app") || origin.includes("localhost")) {
      console.log(`[CORS] ✓ Allowed pattern match: ${origin}`);
      return callback(null, true);
    }
    
    console.warn(`[CORS] ✗ Blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  // CRITICAL: Allow Authorization header for Bearer token authentication
  allowedHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
}));

console.log("[Server] CORS configured successfully");

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
// 404 Handler - Registered later after Vite in dev mode
// ============================================
// NOTE: In development, this is registered AFTER Vite middleware
// In production, this is registered immediately since there's no Vite
const register404Handler = () => {
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
};

// ============================================
// Error Handler (MUST be last)
// ============================================
const registerErrorHandler = () => {
  app.use((err: any, req: any, res: any, _next: any) => {
    console.error('[ERROR] Unhandled error:', err);
    console.error('[ERROR] Request was:', req.method, req.path);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });
};

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
      
      // Register 404 and error handlers AFTER Vite middleware
      // This ensures Vite can handle frontend routes before 404 kicks in
      console.log('[Server] Registering 404 and error handlers after Vite setup');
      register404Handler();
      registerErrorHandler();
      
      server.listen(port, () => {
        console.log(`[Server] Dev server running on http://localhost:${port}/`);
      });
    } catch (err) {
      console.error("[Server] Failed to start development server:", err);
    }
  })();
} else {
  // Production mode (Render)
  // IMPORTANT: Middleware order matters!
  // 1. Serve static files (images, css, js) and SPA fallback
  console.log('[Server] Setting up static file serving for production');
  serveStatic(app);
  
  // 2. Register 404 handler (only for API routes that don't match)
  console.log('[Server] Registering 404 and error handlers for production');
  register404Handler();
  
  // 3. Register error handler (MUST be last)
  registerErrorHandler();
  
  app.listen(port, () => {
    console.log(`[Server] Production server running on port ${port}`);
  });
}
