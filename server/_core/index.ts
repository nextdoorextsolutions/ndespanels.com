import "dotenv/config";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerUploadRoute } from "./upload";
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

const missingRequired: string[] = [];
requiredEnvVars.forEach(key => {
  const value = process.env[key];
  if (!value) {
    missingRequired.push(key);
    console.error(`[Server] MISSING REQUIRED: ${key}`);
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
  "https://nextdoorestimate.com",
  "https://www.nextdoorestimate.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Add dynamic URLs from environment if they exist
if (frontendUrl) {
  allowedOrigins.push(frontendUrl);
}
if (clientUrl) {
  allowedOrigins.push(clientUrl);
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any Vercel preview deployment or localhost
    if (origin.endsWith(".vercel.app") || origin.includes("localhost")) {
      return callback(null, true);
    }
    
    console.warn(`[CORS] ✗ Blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  // CRITICAL: Allow Authorization header for Bearer token authentication
  allowedHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
}));

// ============================================
// File Upload Route (BEFORE body parsers)
// ============================================
// IMPORTANT: Upload route must be registered BEFORE body parsers
// because it needs to handle raw multipart data
try {
  registerUploadRoute(app);
  console.log("[Server] Upload route registered at /api/upload");
} catch (err) {
  console.error("[Server] Failed to register upload route:", err);
}

// ============================================
// Body Parsers
// ============================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ============================================
// Health Check Endpoint
// ============================================
app.get("/api/health", (_req: any, res: any) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
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
// Routes are registered and ready

// ============================================
// 404 Handler - Registered later after Vite in dev mode
// ============================================
// NOTE: In development, this is registered AFTER Vite middleware
// In production, this is registered immediately since there's no Vite
const register404Handler = () => {
  app.use((req: any, res: any) => {
    res.status(404).json({ 
      error: 'Route not found',
      path: req.path,
      originalUrl: req.originalUrl
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
  (async () => {
    try {
      // IMPORTANT: Middleware order matters!
      // 1. Serve static files (images, css, js) and SPA fallback
      await serveStatic(app);
      
      // 2. Register 404 handler (only for API routes that don't match)
      register404Handler();
      
      // 3. Register error handler (MUST be last)
      registerErrorHandler();
      
      app.listen(port, () => {
        console.log(`[Server] Production server running on port ${port}`);
      });
    } catch (err) {
      console.error("[Server] Failed to start production server:", err);
      process.exit(1);
    }
  })();
}
