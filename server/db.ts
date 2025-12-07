import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

// Singleton database connection
let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;
let _isInitialized = false;

/**
 * Get or create database connection singleton
 * Uses SUPABASE_URL or DATABASE_URL (SUPABASE_URL takes priority for Supabase projects)
 * Connection pooling configured for Supabase Transaction Mode (port 6543)
 */
export async function getDb() {
  if (_isInitialized && _db) {
    return _db;
  }

  // Priority: SUPABASE_URL (recommended for Supabase) > DATABASE_URL
  const connectionString = process.env.SUPABASE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("❌ MISSING: SUPABASE_URL or DATABASE_URL environment variable");
    console.error("Add SUPABASE_URL to Render Environment tab");
    return null;
  }

  console.log(`[Server] ✓ Database URL configured: ${connectionString.substring(0, 20)}...`);

  try {
    // Create postgres client with Supabase-optimized settings
    _client = postgres(connectionString, {
      // CRITICAL: Disable prepared statements for Supabase Transaction Mode (port 6543)
      prepare: false,
      
      // Connection pool settings
      max: 10, // Maximum connections in pool (Supabase free tier allows ~15)
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 30, // Connection timeout in seconds
      max_lifetime: 60 * 30, // Max connection lifetime (30 minutes)
      
      // SSL for Supabase (required for production)
      ssl: 'require',
      
      // Suppress PostgreSQL notices
      onnotice: () => {},
      
      // Transform connection to set search_path on EACH connection
      transform: {
        undefined: undefined,
        column: {},
        value: {},
        row: {}
      }
    });

    // Set search_path to public schema BEFORE creating drizzle instance
    // This ensures all queries use public schema instead of auth schema
    await _client.unsafe('SET search_path TO public');
    
    // Create drizzle ORM instance
    _db = drizzle(_client);
    _isInitialized = true;
    
    console.log("✅ Database client initialized with connection pooling");
    
    return _db;
  } catch (error) {
    console.error("[Database] Failed to initialize:", error);
    _db = null;
    _client = null;
    _isInitialized = false;
    return null;
  }
}

// Helper function to retry database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || '';
      
      // Check if it's a connection error worth retrying
      const isRetryable = 
        errorMessage.includes('socket disconnected') ||
        errorMessage.includes('TLS connection') ||
        errorMessage.includes('connection refused') ||
        errorMessage.includes('ECONNRESET');
      
      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }
      
      console.warn(`[Database] Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // DO NOT reset connection - use existing singleton pool
    }
  }
  
  throw lastError;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  return withRetry(async () => {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot upsert user: database not available");
      return;
    }

    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'owner';
      updateSet.role = 'owner';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL upsert using ON CONFLICT
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  });
}

export async function getUserByOpenId(openId: string) {
  console.log("[Database] Looking up user by openId:", openId);
  
  return withRetry(async () => {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot get user: database not available");
      return undefined;
    }

    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    console.log("[Database] User lookup result:", result.length > 0 ? { id: result[0].id, name: result[0].name, role: result[0].role } : "not found");
    return result.length > 0 ? result[0] : undefined;
  });
}

export async function getUserByEmail(email: string) {
  console.log("[Database] Looking up user by email:", email);
  
  return withRetry(async () => {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot get user: database not available");
      return undefined;
    }

    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    console.log("[Database] User lookup by email result:", result.length > 0 ? { id: result[0].id, name: result[0].name, role: result[0].role } : "not found");
    return result.length > 0 ? result[0] : undefined;
  });
}

export async function getUserCount() {
  return withRetry(async () => {
    const db = await getDb();
    if (!db) {
      return 0;
    }

    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    return result[0]?.count || 0;
  });
}

// TODO: add feature queries here as your schema grows.
