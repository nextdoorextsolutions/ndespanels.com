import { protectedProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../../db";
import { users, editHistory } from "../../../drizzle/schema";
import { eq, and, or, isNotNull, sql } from "drizzle-orm";
import { supabaseAdmin } from "../../lib/supabase";
import { sendWelcomeEmail } from "../../email";
import { 
  normalizeRole, 
  isOwner,
  getRoleDisplayName
} from "../../lib/rbac";

/**
 * Users Router
 * Handles user management, team members, roles, and permissions
 */
export const usersRouter = router({
  // Get current user's role and permissions
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) return null;
    
    const role = normalizeRole(user.role);
    return {
      role,
      roleDisplayName: getRoleDisplayName(user.role),
      canViewAll: role === "owner" || role === "admin",
      canEditAll: role === "owner" || role === "admin",
      canDelete: role === "owner",
      canViewEditHistory: role === "owner" || role === "admin",
      canManageTeam: role === "owner",
      isTeamLead: role === "team_lead",
      isSalesRep: role === "sales_rep",
    };
  }),

  // Get team members
  getTeam: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Filter out users without name or email (incomplete profiles)
    const team = await db.select().from(users)
      .where(and(isNotNull(users.name), isNotNull(users.email)))
      .orderBy(users.name);
    
    // Add role display names and team lead info
    const teamWithRoles = await Promise.all(team.map(async (member) => {
      let teamLeadName = null;
      if (member.teamLeadId) {
        const [teamLead] = await db.select({ name: users.name }).from(users).where(eq(users.id, member.teamLeadId));
        teamLeadName = teamLead?.name;
      }
      
      // Count team members if this user is a team lead
      let teamMemberCount = 0;
      if (member.role === "team_lead") {
        const [count] = await db.select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(eq(users.teamLeadId, member.id));
        teamMemberCount = count?.count || 0;
      }
      
      return {
        ...member,
        roleDisplayName: getRoleDisplayName(member.role),
        teamLeadName,
        teamMemberCount,
      };
    }));
    
    return teamWithRoles;
  }),

  // Get team leads for assignment dropdown (includes owners)
  getTeamLeads: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const teamLeads = await db.selectDistinct({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(or(eq(users.role, "team_lead"), eq(users.role, "owner")))
    .orderBy(users.role, users.name);

    // Filter to ensure unique users (in case of any duplicates)
    const uniqueLeads = teamLeads.filter((lead, index, self) => 
      index === self.findIndex(l => l.id === lead.id)
    );

    return uniqueLeads;
  }),

  // Update team member role (Owner only for role changes)
  updateTeamMember: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin", "owner", "office", "sales_rep", "project_manager", "team_lead", "field_crew"]),
      repCode: z.string().transform(v => v || null).optional(),
      isActive: z.boolean().optional(),
      teamLeadId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Only owners can change roles
      if (!isOwner(ctx.user)) {
        throw new Error("Only owners can update team member roles");
      }

      const updateData: Record<string, unknown> = { role: input.role };
      if (input.repCode !== undefined) updateData.repCode = input.repCode;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.teamLeadId !== undefined) updateData.teamLeadId = input.teamLeadId;

      await db.update(users).set(updateData).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Create team account (Owner only)
  createTeamAccount: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["admin", "owner", "office", "sales_rep", "team_lead", "field_crew"]),
      teamLeadId: z.number().optional(),
      password: z.string().min(6).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('[CreateAccount] Starting account creation for:', input.email);
      
      // Step 1: Check database connection
      const db = await getDb();
      if (!db) {
        console.error('[CreateAccount] STEP 1 FAILED: Database not available');
        throw new Error("[DB_ERROR] Database connection failed");
      }
      console.log('[CreateAccount] Step 1 passed: Database connected');

      // Step 2: Check permissions
      if (!isOwner(ctx.user)) {
        console.error('[CreateAccount] STEP 2 FAILED: User is not owner. User role:', ctx.user?.role);
        throw new Error("[PERMISSION_ERROR] Only owners can create team accounts");
      }
      console.log('[CreateAccount] Step 2 passed: User is owner');

      // Step 3: Check if email already exists
      try {
        const existing = await db.select().from(users).where(eq(users.email, input.email));
        if (existing.length > 0) {
          console.error('[CreateAccount] STEP 3 FAILED: Email already exists in users table');
          throw new Error("[DUPLICATE_ERROR] An account with this email already exists in CRM");
        }
        console.log('[CreateAccount] Step 3 passed: Email is unique in CRM');
      } catch (dbError: any) {
        if (dbError.message.includes('[DUPLICATE_ERROR]')) throw dbError;
        console.error('[CreateAccount] STEP 3 FAILED: Database query error:', dbError);
        throw new Error(`[DB_QUERY_ERROR] Failed to check existing users: ${dbError.message}`);
      }

      // Step 4: Generate temp password
      const tempPassword = input.password || `Temp${Math.random().toString(36).substring(2, 10)}!`;
      console.log('[CreateAccount] Step 4 passed: Generated temp password');

      // Step 5: Create Supabase Auth user
      console.log('[CreateAccount] Step 5: Creating Supabase Auth user...');
      let authData;
      try {
        const result = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            name: input.name,
            role: input.role,
          },
        });
        
        if (result.error) {
          console.error('[CreateAccount] STEP 5 FAILED: Supabase Auth error:', JSON.stringify(result.error));
          throw new Error(`[SUPABASE_AUTH_ERROR] ${result.error.message}`);
        }
        
        if (!result.data.user) {
          console.error('[CreateAccount] STEP 5 FAILED: No user returned from Supabase');
          throw new Error("[SUPABASE_AUTH_ERROR] No user returned from Supabase Auth");
        }
        
        authData = result.data;
        console.log('[CreateAccount] Step 5 passed: Supabase Auth user created with ID:', authData.user.id);
      } catch (supabaseError: any) {
        if (supabaseError.message.includes('[SUPABASE_AUTH_ERROR]')) throw supabaseError;
        console.error('[CreateAccount] STEP 5 FAILED: Supabase exception:', supabaseError);
        throw new Error(`[SUPABASE_EXCEPTION] ${supabaseError.message}`);
      }

      // Step 6: Create user in CRM database
      console.log('[CreateAccount] Step 6: Creating user in CRM database...');
      let newUser;
      try {
        const [insertedUser] = await db.insert(users).values({
          openId: authData.user.id,
          name: input.name,
          email: input.email,
          role: input.role,
          teamLeadId: input.teamLeadId || null,
          isActive: true,
        }).returning({ id: users.id });
        newUser = insertedUser;
        console.log('[CreateAccount] Step 6 passed: CRM user created with ID:', newUser.id);
      } catch (dbInsertError: any) {
        console.error('[CreateAccount] STEP 6 FAILED: CRM database insert error:', dbInsertError);
        // Try to clean up the Supabase Auth user since CRM insert failed
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          console.log('[CreateAccount] Cleaned up orphaned Supabase Auth user');
        } catch (cleanupError) {
          console.error('[CreateAccount] Failed to cleanup Supabase Auth user:', cleanupError);
        }
        throw new Error(`[CRM_DB_ERROR] Failed to create CRM user: ${dbInsertError.message}`);
      }

      // Login URL
      const loginUrl = 'https://ndespanels.com/login';
      
      try {
        await sendWelcomeEmail({
          recipientEmail: input.email,
          recipientName: input.name,
          role: input.role,
          loginUrl,
          companyName: 'NextDoor Exterior Solutions',
        });
      } catch (emailError) {
        console.error('[CreateAccount] Failed to send welcome email:', emailError);
        // Don't fail the account creation if email fails
      }

      return {
        id: newUser.id,
        name: input.name,
        email: input.email,
        role: input.role,
        loginUrl,
        tempPassword, // Return temp password so owner can share it
      };
    }),

  // Update user (Owner only) - with audit trail
  updateUser: protectedProcedure
    .input(z.object({
      targetUserId: z.number(),
      data: z.object({
        name: z.string().min(1).optional(),
        email: z.union([z.string().email(), z.literal('')]).optional(),
        phone: z.string().transform(v => v || null).optional(),
        role: z.enum(["user", "admin", "owner", "office", "sales_rep", "project_manager", "team_lead", "field_crew"]).optional(),
        repCode: z.string().transform(v => v || null).optional(),
        teamLeadId: z.number().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Only owners can edit users
      if (!isOwner(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners can edit user details" });
      }

      const { targetUserId, data } = input;

      // Fetch original user data for audit log
      const [oldUser] = await db.select().from(users).where(eq(users.id, targetUserId));
      if (!oldUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Build update object with only provided fields
      const updateData: Record<string, any> = {};
      const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

      if (data.name !== undefined && data.name !== oldUser.name) {
        updateData.name = data.name;
        changes.push({ field: "name", oldValue: oldUser.name || null, newValue: data.name });
      }
      if (data.email !== undefined && data.email !== oldUser.email) {
        updateData.email = data.email;
        changes.push({ field: "email", oldValue: oldUser.email || null, newValue: data.email });
      }
      if (data.phone !== undefined && data.phone !== oldUser.phone) {
        updateData.phone = data.phone;
        changes.push({ field: "phone", oldValue: oldUser.phone || null, newValue: data.phone });
      }
      if (data.role !== undefined && data.role !== oldUser.role) {
        updateData.role = data.role;
        changes.push({ field: "role", oldValue: oldUser.role || null, newValue: data.role });
      }
      if (data.repCode !== undefined && data.repCode !== oldUser.repCode) {
        updateData.repCode = data.repCode;
        changes.push({ field: "rep_code", oldValue: oldUser.repCode || null, newValue: data.repCode });
      }
      if (data.teamLeadId !== undefined && data.teamLeadId !== oldUser.teamLeadId) {
        updateData.teamLeadId = data.teamLeadId;
        changes.push({ field: "team_lead_id", oldValue: oldUser.teamLeadId?.toString() || null, newValue: data.teamLeadId?.toString() || null });
      }
      if (data.isActive !== undefined && data.isActive !== oldUser.isActive) {
        updateData.isActive = data.isActive;
        changes.push({ field: "is_active", oldValue: String(oldUser.isActive), newValue: String(data.isActive) });
      }

      // If no changes, return early
      if (Object.keys(updateData).length === 0) {
        return { success: true, message: "No changes to save" };
      }

      // Add updatedAt timestamp
      updateData.updatedAt = new Date();

      // Update user
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, targetUserId));

      // Log each change to edit history (using reportRequestId = 0 for user edits)
      for (const change of changes) {
        await db.insert(editHistory).values({
          reportRequestId: 0, // 0 indicates this is a user edit, not a job edit
          userId: ctx.user!.id,
          fieldName: `user.${change.field}`,
          oldValue: change.oldValue,
          newValue: change.newValue,
          editType: "update",
          ipAddress: (ctx.req?.headers?.["x-forwarded-for"] as string) || ctx.req?.ip || null,
          userAgent: (ctx.req?.headers?.["user-agent"] as string)?.substring(0, 500) || null,
        });
      }

      console.log(`[UpdateUser] Owner ${ctx.user?.name} updated user ${targetUserId}:`, changes);

      return { 
        success: true, 
        message: `User updated successfully. ${changes.length} field(s) changed.`,
        changes: changes.map(c => c.field),
      };
    }),
});
