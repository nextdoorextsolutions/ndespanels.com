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
      name: z.string().nullish().transform(val => val === "" ? null : val),
      role: z.string().nullish().transform(val => val === "" ? null : val),
      phone: z.string().nullish().transform(val => val === "" ? null : val),
      repCode: z.string().nullish().transform(val => val === "" ? null : val),
      image: z.string().nullish().transform(val => val === "" ? null : val),
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
          
          // LOOKUP FIRST STRATEGY - Avoids UPSERT conflicts and RLS issues
          
          // Step 1: Find existing user by open_id (Supabase Auth ID)
          console.log('[Sync] Step 1: Looking up user by open_id:', input.supabaseUserId);
          const [existingUser] = await db
            .select({
              id: users.id,
              openId: users.openId,
              email: users.email,
              name: users.name,
              role: users.role,
              isActive: users.isActive,
              // Safe selection - avoid problematic columns
            })
            .from(users)
            .where(eq(users.openId, input.supabaseUserId))
            .limit(1);
          
          // Step 2: Handle Match (The Happy Path)
          if (existingUser) {
            console.log('[Sync] ✅ User found by open_id. Updating last_signed_in...');
            
            // Only update email if it has changed to avoid unique constraint violations
            const updateData: any = {
              lastSignedIn: new Date(),
            };
            
            if (existingUser.email !== input.email) {
              console.log(`[Sync] Email changed from ${existingUser.email} to ${input.email}`);
              updateData.email = input.email;
            }
            
            const [updatedUser] = await db
              .update(users)
              .set(updateData)
              .where(eq(users.id, existingUser.id))
              .returning();
            
            console.log(`[Sync] Successfully updated user: ${updatedUser.email} (Role: ${updatedUser.role})`);
            return updatedUser;
          }
          
          // Step 3: Handle Email Link (The "Zombie" Fix)
          console.log('[Sync] Step 3: User not found by open_id. Looking up by email:', input.email);
          const [userByEmail] = await db
            .select({
              id: users.id,
              openId: users.openId,
              email: users.email,
              name: users.name,
              role: users.role,
              isActive: users.isActive,
              // Safe selection - avoid problematic columns
            })
            .from(users)
            .where(eq(users.email, input.email))
            .limit(1);
          
          if (userByEmail) {
            console.log('[Sync] ✅ User found by email. Linking open_id to existing account...');
            const [linkedUser] = await db
              .update(users)
              .set({
                openId: input.supabaseUserId,
                lastSignedIn: new Date(),
              })
              .where(eq(users.id, userByEmail.id))
              .returning();
            
            console.log(`[Sync] Successfully linked account: ${linkedUser.email} (Role: ${linkedUser.role})`);
            return linkedUser;
          }
          
          // Step 4: Create New (Fallback)
          console.log('[Sync] Step 4: User not found. Creating new user...');
          
          // Check if it's the very first user (Owner logic)
          const allUsers = await db.select({ id: users.id }).from(users).limit(1);
          const isFirstUser = allUsers.length === 0;
          console.log(`[Sync] Is first user: ${isFirstUser}`);
          
          // Determine Role
          let targetRole = input.role || 'user';
          if (isFirstUser) targetRole = 'owner';
          
          // Validate role against enum
          const validRoles = ['user', 'admin', 'owner', 'office', 'sales_rep', 'project_manager', 'team_lead', 'field_crew'];
          if (!validRoles.includes(targetRole)) {
            console.warn(`[Sync] Invalid role "${targetRole}", defaulting to "user"`);
            targetRole = 'user';
          }
          console.log(`[Sync] Target role: ${targetRole}`);
          
          // Input values are already sanitized by Zod transforms (empty strings → null)
          const insertValues = {
            openId: input.supabaseUserId,
            email: input.email,
            name: input.name || input.email.split('@')[0],
            phone: input.phone,
            image: input.image,
            role: targetRole as any,
            isActive: true,
            lastSignedIn: new Date(),
            repCode: input.repCode,
          };
          
          console.log('[Sync] Insert values:', JSON.stringify(insertValues, null, 2));
          
          let result;
          try {
            [result] = await db
              .insert(users)
              .values(insertValues)
              .returning();
          } catch (dbError: any) {
            // Log detailed postgres error information
            console.error('❌ [Sync] DATABASE INSERT FAILED - Death Loop Prevention');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('Postgres Error Code:', dbError.code); // 23505 = unique_violation, 23502 = not_null_violation
            console.error('Error Message:', dbError.message);
            console.error('Detail:', dbError.detail);
            console.error('Constraint Name:', dbError.constraint);
            console.error('Table:', dbError.table);
            console.error('Column:', dbError.column);
            console.error('Schema:', dbError.schema);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('Insert Values:', JSON.stringify(insertValues, null, 2));
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Provide actionable error message based on error code
            if (dbError.code === '23505') {
              console.error('⚠️  UNIQUE CONSTRAINT VIOLATION - Check for duplicate values in:', dbError.constraint);
            } else if (dbError.code === '23502') {
              console.error('⚠️  NOT NULL VIOLATION - Missing required field:', dbError.column);
            } else if (dbError.code === '23503') {
              console.error('⚠️  FOREIGN KEY VIOLATION - Referenced record does not exist');
            }
            
            throw dbError; // Re-throw to be caught by outer catch
          }
          
          if (!result) {
            throw new Error('Insert returned no result');
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
