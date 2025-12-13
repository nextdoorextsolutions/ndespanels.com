import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../../_core/cookies";
import { publicProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../../db";
import { users } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req as any);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  
  // Sync Supabase Auth user to CRM users table
  syncSupabaseUser: publicProcedure
    .input(z.object({
      supabaseUserId: z.string(),
      email: z.string(),
      name: z.string().optional(),
      role: z.string().optional(),
      repCode: z.string().optional().nullable().transform(v => {
        // Convert empty strings to null for database
        if (!v || v.trim() === '') return null;
        return v;
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      console.log(`[Sync] Attempting sync for: ${input.email}`);
      
      try {
        // Timeout wrapper - fail fast if database hangs
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Sync timeout after 10 seconds')), 10000);
        });
        
        const syncPromise = (async () => {
          const db = await getDb();
          if (!db) {
            console.error('[Sync] Database not available');
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
          }
          
          // 1. Check if it's the very first user (Owner logic)
          console.log('[Sync] Checking for existing users...');
          const allUsers = await db.select({ id: users.id }).from(users).limit(1);
          const isFirstUser = allUsers.length === 0;
          console.log(`[Sync] Is first user: ${isFirstUser}`);
          
          // 2. Determine Role
          let targetRole = input.role || 'user';
          if (isFirstUser) targetRole = 'owner';
          
          // Validate role against enum
          const validRoles = ['user', 'admin', 'owner', 'office', 'sales_rep', 'project_manager', 'team_lead', 'field_crew'];
          if (!validRoles.includes(targetRole)) {
            console.warn(`[Sync] Invalid role "${targetRole}", defaulting to "user"`);
            targetRole = 'user';
          }
          console.log(`[Sync] Target role: ${targetRole}`);
          
          // 3. UPSERT using openId as conflict target (openId is the Supabase Auth unique identifier)
          console.log('[Sync] Performing upsert...');
          
          // Convert empty strings to null for repCode
          const cleanRepCode = input.repCode && input.repCode.trim() !== '' ? input.repCode : null;
          
          const insertValues = {
            openId: input.supabaseUserId,
            email: input.email,
            name: input.name || input.email.split('@')[0],
            role: targetRole as any,
            isActive: true,
            lastSignedIn: new Date(),
            repCode: cleanRepCode,
          };
          
          console.log('[Sync] Insert values:', JSON.stringify(insertValues, null, 2));
          
          let result;
          try {
            [result] = await db
              .insert(users)
              .values(insertValues)
              .onConflictDoUpdate({
                target: users.openId, // Unique constraint on open_id
                set: {
                  email: input.email, // Update email in case it changed in Supabase
                  lastSignedIn: new Date(),
                },
              })
              .returning();
          } catch (dbError: any) {
            // Log detailed postgres error information
            console.error('[Sync] Database error details:');
            console.error('  - Postgres Code:', dbError.code); // e.g., 23505 = unique_violation
            console.error('  - Message:', dbError.message);
            console.error('  - Detail:', dbError.detail);
            console.error('  - Constraint:', dbError.constraint);
            console.error('  - Table:', dbError.table);
            console.error('  - Column:', dbError.column);
            console.error('  - Schema:', dbError.schema);
            console.error('  - Insert values:', JSON.stringify(insertValues, null, 2));
            throw dbError; // Re-throw to be caught by outer catch
          }
          
          if (!result) {
            throw new Error('Upsert returned no result');
          }
          
          console.log(`[Sync] Successfully synced user: ${result.email} (Role: ${result.role}) in ${Date.now() - startTime}ms`);
          
          // Set session cookie
          console.log('[Sync] Creating session token...');
          const { sdk } = await import("../../_core/sdk");
          const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
          const sessionToken = await sdk.createSessionToken(input.supabaseUserId, {
            name: result.name || input.name || "",
            expiresInMs: ONE_YEAR_MS,
          });
          const cookieOptions = getSessionCookieOptions(ctx.req as any);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          
          console.log(`[Sync] ✅ Complete sync in ${Date.now() - startTime}ms`);
          
          return { 
            success: true, 
            user: { id: result.id, name: result.name, role: result.role, email: result.email },
            isNewUser: isFirstUser,
            isOwner: result.role === 'owner',
            sessionToken, // Return token for cross-origin auth via Authorization header
          };
        })();
        
        // Race between sync and timeout
        return await Promise.race([syncPromise, timeoutPromise]) as any;
        
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`❌ CRITICAL ERROR in syncSupabaseUser after ${duration}ms:`);
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Detail:', error.detail);
        console.error('Constraint:', error.constraint);
        console.error('Stack:', error.stack);
        
        // Always return a proper error response, never hang
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Sync failed: ${error.message}`,
          cause: error,
        });
      }
    }),
    
  loginWithPassword: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Find user by email
      const [user] = await db.select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      
      if (!user) {
        throw new Error("Invalid email or password");
      }
      
      if (!user.password) {
        throw new Error("Password not set. Contact your administrator.");
      }
      
      if (!user.isActive) {
        throw new Error("Account is deactivated. Contact your administrator.");
      }
      
      // Simple password comparison (in production, use bcrypt)
      // For now, we'll do a simple comparison since passwords are stored as plain text during account creation
      const crypto = await import("crypto");
      const hashedInput = crypto.createHash("sha256").update(input.password).digest("hex");
      
      if (user.password !== hashedInput && user.password !== input.password) {
        throw new Error("Invalid email or password");
      }
      
      // Update last signed in
      await db.update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));
      
      // Set session cookie using SDK
      const { sdk } = await import("../../_core/sdk");
      const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req as any);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      
      return { success: true, user: { id: user.id, name: user.name, role: user.role } };
    }),
});
