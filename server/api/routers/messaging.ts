/**
 * Unified Messaging Router
 * Consolidates globalChat, chat, and teamChat into a single router
 * 
 * Features:
 * - Channel-based messaging (from teamChat)
 * - AI streaming with Gemini (from globalChat)
 * - DM support
 * - Global channel for company-wide communication
 * - Unread counts and read receipts
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { VertexAI } from "@google-cloud/vertexai";
import { getDb } from "../../db";
import { chatChannels, chatMessages, channelMembers, users, activities } from "../../../drizzle/schema";
import { eq, desc, and, inArray, sql, or } from "drizzle-orm";

// Initialize Vertex AI with service account credentials
const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT || "",
  location: process.env.GCLOUD_LOCATION || "us-central1",
});

const ZEROX_SYSTEM_PROMPT = `You are Zerox, a Senior Technical Project Manager for a roofing and solar company's CRM platform.

Your role:
- Help with job summaries and customer information
- Draft professional replies to customers
- Answer technical questions about the CRM system
- Provide quick insights about jobs, invoices, and team activities

**PRIORITY HANDLING:**
- When you see 'callback_requested', treat it as your HIGHEST PRIORITY task to summarize or address
- Customer callbacks require immediate attention and action-oriented responses
- Urgent items need clear next steps and deadlines

Guidelines:
- Keep responses concise, professional, and action-oriented
- Use bullet points for lists
- Provide actionable advice with clear next steps
- If you don't know something, say so clearly
- Focus on helping the team work more efficiently

You have access to the company's CRM data through context provided in messages.`;

interface Activity {
  id: number;
  activityType: string;
  description: string;
  tags?: string[];
  createdAt: Date | string;
  metadata?: any;
}

/**
 * Build activity context for AI system instruction
 */
function buildActivityContext(activities: Activity[]): string {
  if (!activities || activities.length === 0) {
    return "";
  }

  const contextLines: string[] = ["\n\n=== RECENT ACTIVITY CONTEXT ==="];

  for (const activity of activities) {
    let prefix = "";
    
    if (activity.activityType === "callback_requested") {
      prefix = "[HIGH PRIORITY - CALLBACK REQUESTED]";
    } else if (activity.activityType === "customer_message") {
      prefix = "[CUSTOMER INQUIRY]";
    } else if (activity.tags && activity.tags.includes("urgent")) {
      prefix = "[URGENT]";
    } else {
      prefix = `[${activity.activityType.toUpperCase()}]`;
    }

    const timestamp = new Date(activity.createdAt).toLocaleString();
    contextLines.push(`${prefix} (${timestamp}): ${activity.description}`);
  }

  contextLines.push("=== END ACTIVITY CONTEXT ===\n");
  return contextLines.join("\n");
}

/**
 * Ensure global channel exists - lazy initialization
 * Uses INSERT ON CONFLICT to avoid race conditions and unnecessary queries
 * Only runs when a user actually tries to access channels
 */
async function ensureGlobalChannel(db: any, userId: number): Promise<void> {
  try {
    // Use INSERT ... ON CONFLICT DO NOTHING for idempotent channel creation
    // This is safe in serverless/containerized environments and handles race conditions
    const [globalChannel] = await db
      .insert(chatChannels)
      .values({
        name: "global",
        type: "public",
        description: "Company-wide announcements and discussions",
        createdBy: 1, // System/first admin
      })
      .onConflictDoNothing({ target: chatChannels.name })
      .returning();

    // If channel was just created (not a conflict), add all active users as members
    if (globalChannel) {
      console.log("[Messaging] Global channel created, adding members...");
      
      const allUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.isActive, true));

      if (allUsers.length > 0) {
        // Use INSERT ... ON CONFLICT for members too (in case of race conditions)
        await db.insert(channelMembers)
          .values(
            allUsers.map((u: { id: number }) => ({
              channelId: globalChannel.id,
              userId: u.id,
            }))
          )
          .onConflictDoNothing();
      }

      console.log(`[Messaging] Global channel created with ${allUsers.length} members`);
    } else {
      // Channel already exists, ensure current user is a member
      await db.insert(channelMembers)
        .values({
          channelId: (await db
            .select({ id: chatChannels.id })
            .from(chatChannels)
            .where(eq(chatChannels.name, "global"))
            .limit(1))[0].id,
          userId: userId,
        })
        .onConflictDoNothing();
    }
  } catch (error) {
    // Log but don't throw - global channel is a nice-to-have, not critical
    console.error("[Messaging] Failed to ensure global channel:", error);
  }
}

export const messagingRouter = router({
  /**
   * Get all channels the current user has access to
   */
  getChannels: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    const userId = ctx.user.id;

    // Lazy initialization: ensure global channel exists when user requests channels
    await ensureGlobalChannel(db, userId);

    // Get channels where user is a member
    const userChannels = await db
      .select({
        id: chatChannels.id,
        name: chatChannels.name,
        type: chatChannels.type,
        description: chatChannels.description,
        createdAt: chatChannels.createdAt,
        lastReadAt: channelMembers.lastReadAt,
      })
      .from(chatChannels)
      .innerJoin(channelMembers, eq(chatChannels.id, channelMembers.channelId))
      .where(eq(channelMembers.userId, userId))
      .orderBy(chatChannels.name);

    // Get unread counts for each channel
    const channelIds = userChannels.map(c => c.id);
    
    const unreadCounts = channelIds.length > 0 ? await db
      .select({
        channelId: chatMessages.channelId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(chatMessages)
      .where(
        and(
          inArray(chatMessages.channelId, channelIds),
          sql`${chatMessages.createdAt} > COALESCE((
            SELECT ${channelMembers.lastReadAt}
            FROM ${channelMembers}
            WHERE ${channelMembers.channelId} = ${chatMessages.channelId}
            AND ${channelMembers.userId} = ${userId}
          ), '1970-01-01'::timestamp)`
        )
      )
      .groupBy(chatMessages.channelId) : [];

    const unreadMap = new Map(unreadCounts.map(u => [u.channelId, u.count]));

    // Get members for each channel (for DM partner identification)
    const channelMembersData = channelIds.length > 0 ? await db
      .select({
        channelId: channelMembers.channelId,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(channelMembers)
      .innerJoin(users, eq(channelMembers.userId, users.id))
      .where(inArray(channelMembers.channelId, channelIds)) : [] as Array<{
        channelId: number;
        userId: number;
        userName: string | null;
        userEmail: string | null;
        userImage: string | null;
      }>;

    // Group members by channel
    const membersByChannel = new Map<number, Array<{ userId: number; userName: string | null; userEmail: string | null; userImage: string | null }>>();
    for (const member of channelMembersData) {
      if (!membersByChannel.has(member.channelId)) {
        membersByChannel.set(member.channelId, []);
      }
      membersByChannel.get(member.channelId)!.push({
        userId: member.userId,
        userName: member.userName,
        userEmail: member.userEmail,
        userImage: member.userImage,
      });
    }

    return userChannels.map(channel => ({
      ...channel,
      unreadCount: unreadMap.get(channel.id) || 0,
      members: membersByChannel.get(channel.id) || [],
    }));
  }),

  /**
   * Get messages for a specific channel
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        channelId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const userId = ctx.user.id;

      // Verify user has access to this channel
      const membership = await db
        .select()
        .from(channelMembers)
        .where(
          and(
            eq(channelMembers.channelId, input.channelId),
            eq(channelMembers.userId, userId)
          )
        )
        .limit(1);

      if (membership.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this channel",
        });
      }

      // Get messages with user info
      const messages = await db
        .select({
          id: chatMessages.id,
          content: chatMessages.content,
          userId: chatMessages.userId,
          userName: users.name,
          userEmail: users.email,
          userImage: users.image,
          metadata: chatMessages.metadata,
          isEdited: chatMessages.isEdited,
          editedAt: chatMessages.editedAt,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .innerJoin(users, eq(chatMessages.userId, users.id))
        .where(eq(chatMessages.channelId, input.channelId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return messages.reverse(); // Return oldest first
    }),

  /**
   * Send a message to a channel
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        channelId: z.number(),
        content: z.string().min(1).max(5000),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const userId = ctx.user.id;

      // Verify user has access to this channel
      const membership = await db
        .select()
        .from(channelMembers)
        .where(
          and(
            eq(channelMembers.channelId, input.channelId),
            eq(channelMembers.userId, userId)
          )
        )
        .limit(1);

      if (membership.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this channel",
        });
      }

      // Insert message
      const [message] = await db
        .insert(chatMessages)
        .values({
          channelId: input.channelId,
          userId: userId,
          content: input.content,
          metadata: input.metadata,
        })
        .returning();

      // Update last_read_at for sender
      await db
        .update(channelMembers)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(channelMembers.channelId, input.channelId),
            eq(channelMembers.userId, userId)
          )
        );

      return message;
    }),

  /**
   * Stream AI response from Gemini
   * CRITICAL FIX: Added ctx parameter to access authenticated user
   */
  streamAIMessage: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        history: z.array(
          z.object({
            role: z.enum(["user", "model"]),
            parts: z.string(),
          })
        ).optional(),
        channelId: z.number().optional(),
        jobId: z.number().optional(),
      })
    )
    .subscription(async ({ input, ctx }) => {  // FIXED: Added ctx parameter
      // CRITICAL: Verify user is authenticated before starting stream
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Please login (10001)",
        });
      }

      console.log(`[AI Stream] Starting stream for user ${ctx.user.email} (ID: ${ctx.user.id})`);

      return observable<{ chunk: string; done: boolean }>((emit) => {
        (async () => {
          try {
            const db = await getDb();
            
            if (!db) {
              throw new Error("Database connection failed");
            }
            
            // Fetch recent activities for context
            let recentActivities: Activity[] = [];
            
            if (input.jobId) {
              const dbActivities = await db
                .select({
                  id: activities.id,
                  activityType: activities.activityType,
                  description: activities.description,
                  tags: activities.tags,
                  createdAt: activities.createdAt,
                  metadata: activities.metadata,
                })
                .from(activities)
                .where(eq(activities.reportRequestId, input.jobId))
                .orderBy(desc(activities.createdAt))
                .limit(20);
              
              recentActivities = dbActivities as Activity[];
            } else {
              const dbActivities = await db
                .select({
                  id: activities.id,
                  activityType: activities.activityType,
                  description: activities.description,
                  tags: activities.tags,
                  createdAt: activities.createdAt,
                  metadata: activities.metadata,
                })
                .from(activities)
                .orderBy(desc(activities.createdAt))
                .limit(20);
              
              recentActivities = dbActivities as Activity[];
            }

            // Build enhanced system instruction with activity context
            const activityContext = buildActivityContext(recentActivities);
            const enhancedSystemPrompt = ZEROX_SYSTEM_PROMPT + activityContext;

            // Get generative model from Vertex AI
            const generativeModel = vertexAI.getGenerativeModel({
              model: "gemini-2.5-pro",
              systemInstruction: enhancedSystemPrompt,
            });

            // Build chat history in Vertex AI format
            const chatHistory = input.history?.map((msg) => ({
              role: msg.role,
              parts: [{ text: msg.parts }],
            })) || [];

            const chat = generativeModel.startChat({
              history: chatHistory,
              generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7,
              },
            });

            console.log(`[AI Stream] Sending message to Gemini for user ${ctx.user.email}`);

            // Stream the response using Vertex AI
            const result = await chat.sendMessageStream(input.message);

            for await (const chunk of result.stream) {
              const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (text) {
                emit.next({ chunk: text, done: false });
              }
            }

            console.log(`[AI Stream] Stream completed successfully for user ${ctx.user.email}`);

            // Signal completion
            emit.next({ chunk: "", done: true });
            emit.complete();
          } catch (error) {
            console.error("[AI Stream] Gemini streaming error:", error);
            emit.error(
              new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Failed to stream response",
              })
            );
          }
        })();
      });
    }),

  /**
   * Generate a draft reply (non-streaming)
   */
  generateDraft: protectedProcedure
    .input(
      z.object({
        type: z.enum(["grammar", "professional", "summarize"]),
        text: z.string(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (!process.env.GCLOUD_PROJECT) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "AI features are not configured. Please contact your administrator.",
          });
        }

        const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        let prompt = "";
        
        if (input.type === "grammar") {
          prompt = `Fix grammar and spelling in this text, keep the same tone:\n\n${input.text}`;
        } else if (input.type === "professional") {
          prompt = `Rewrite this message in a professional, business-appropriate tone:\n\n${input.text}`;
        } else if (input.type === "summarize") {
          prompt = `Summarize this conversation or text concisely with key points:\n\n${input.text}`;
        }

        if (input.context) {
          prompt += `\n\nContext: ${input.context}`;
        }

        const result = await model.generateContent(prompt);
        const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return {
          draft: response,
          success: true,
        };
      } catch (error) {
        console.error("Draft generation error:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate draft",
        });
      }
    }),

  /**
   * Mark channel as read
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        channelId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const userId = ctx.user.id;

      await db
        .update(channelMembers)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(channelMembers.channelId, input.channelId),
            eq(channelMembers.userId, userId)
          )
        );

      return { success: true };
    }),

  /**
   * Get channel by name (for direct access to global, etc.)
   */
  getChannelByName: protectedProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const userId = ctx.user.id;

      // Get channel and verify membership
      const [channel] = await db
        .select({
          id: chatChannels.id,
          name: chatChannels.name,
          type: chatChannels.type,
          description: chatChannels.description,
        })
        .from(chatChannels)
        .innerJoin(channelMembers, eq(chatChannels.id, channelMembers.channelId))
        .where(
          and(
            eq(chatChannels.name, input.name),
            eq(channelMembers.userId, userId)
          )
        )
        .limit(1);

      if (!channel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Channel not found or you don't have access",
        });
      }

      return channel;
    }),

  /**
   * Get channel members
   */
  getChannelMembers: protectedProcedure
    .input(
      z.object({
        channelId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const userId = ctx.user.id;

      // Verify user has access to this channel
      const membership = await db
        .select()
        .from(channelMembers)
        .where(
          and(
            eq(channelMembers.channelId, input.channelId),
            eq(channelMembers.userId, userId)
          )
        )
        .limit(1);

      if (membership.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this channel",
        });
      }

      // Get all members
      const members = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          role: users.role,
          joinedAt: channelMembers.joinedAt,
        })
        .from(channelMembers)
        .innerJoin(users, eq(channelMembers.userId, users.id))
        .where(eq(channelMembers.channelId, input.channelId));

      return members;
    }),

  /**
   * Get all active team members for User Directory
   */
  getTeamMembers: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    // Fetch all active users
    const teamMembers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
      })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.name);

    return teamMembers;
  }),

  /**
   * Get or create a DM channel between current user and target user
   */
  getOrCreateDM: protectedProcedure
    .input(
      z.object({
        targetUserId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const currentUserId = ctx.user.id;
      const { targetUserId } = input;

      // Validate target user exists and is not the current user
      if (currentUserId === targetUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create DM with yourself",
        });
      }

      // Check if DM channel already exists between these two users
      const existingDMs = await db
        .select({
          channelId: channelMembers.channelId,
        })
        .from(channelMembers)
        .innerJoin(chatChannels, eq(channelMembers.channelId, chatChannels.id))
        .where(
          and(
            eq(chatChannels.type, 'dm'),
            eq(channelMembers.userId, currentUserId)
          )
        )
        .groupBy(channelMembers.channelId);

      // For each potential DM channel, verify it has exactly these two members
      for (const dm of existingDMs) {
        const members = await db
          .select({ userId: channelMembers.userId })
          .from(channelMembers)
          .where(eq(channelMembers.channelId, dm.channelId));

        const memberIds = members.map(m => m.userId).sort();
        const targetIds = [currentUserId, targetUserId].sort();

        if (
          memberIds.length === 2 &&
          memberIds[0] === targetIds[0] &&
          memberIds[1] === targetIds[1]
        ) {
          // Found existing DM
          return { channelId: dm.channelId };
        }
      }

      // No existing DM found, create new one
      const sortedIds = [currentUserId, targetUserId].sort();
      const channelName = `dm-${sortedIds[0]}-${sortedIds[1]}`;

      // Create new DM channel
      const [newChannel] = await db
        .insert(chatChannels)
        .values({
          name: channelName,
          type: 'dm',
          createdBy: currentUserId,
        })
        .returning({ id: chatChannels.id });

      if (!newChannel) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create DM channel",
        });
      }

      // Add both users as members
      await db.insert(channelMembers).values([
        {
          channelId: newChannel.id,
          userId: currentUserId,
        },
        {
          channelId: newChannel.id,
          userId: targetUserId,
        },
      ]);

      return { channelId: newChannel.id };
    }),

  /**
   * Create a new channel (Owner only)
   */
  createChannel: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        allowedRoles: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const user = ctx.user;
      if (!user || user.role !== 'owner') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can create channels",
        });
      }

      // Create channel
      const [newChannel] = await db
        .insert(chatChannels)
        .values({
          name: input.name,
          type: 'public',
          description: input.description || null,
          createdBy: user.id,
        })
        .returning();

      // If allowedRoles specified, add members with those roles
      if (input.allowedRoles && input.allowedRoles.length > 0) {
        const validRoles = input.allowedRoles.filter(r => 
          ['user', 'admin', 'owner', 'office', 'sales_rep', 'project_manager', 'team_lead', 'field_crew'].includes(r)
        ) as Array<'user' | 'admin' | 'owner' | 'office' | 'sales_rep' | 'project_manager' | 'team_lead' | 'field_crew'>;
        
        if (validRoles.length > 0) {
          const allowedUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(inArray(users.role, validRoles));

          if (allowedUsers.length > 0) {
            await db.insert(channelMembers).values(
              allowedUsers.map(u => ({
                channelId: newChannel.id,
                userId: u.id,
              }))
            );
          }
        }
      }

      return newChannel;
    }),

  /**
   * Delete a channel (Owner only)
   */
  deleteChannel: protectedProcedure
    .input(z.object({ channelId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const user = ctx.user;
      if (!user || user.role !== 'owner') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can delete channels",
        });
      }

      // Delete channel members first (foreign key constraint)
      await db.delete(channelMembers).where(eq(channelMembers.channelId, input.channelId));

      // Delete messages
      await db.delete(chatMessages).where(eq(chatMessages.channelId, input.channelId));

      // Delete channel
      await db.delete(chatChannels).where(eq(chatChannels.id, input.channelId));

      return { success: true };
    }),

  /**
   * Add member to channel (Owner only)
   */
  addChannelMember: protectedProcedure
    .input(
      z.object({
        channelId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const user = ctx.user;
      if (!user || user.role !== 'owner') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can manage channel members",
        });
      }

      // Check if member already exists
      const existing = await db
        .select()
        .from(channelMembers)
        .where(
          and(
            eq(channelMembers.channelId, input.channelId),
            eq(channelMembers.userId, input.userId)
          )
        );

      if (existing.length > 0) {
        return { success: true, message: "User is already a member" };
      }

      await db.insert(channelMembers).values({
        channelId: input.channelId,
        userId: input.userId,
      });

      return { success: true };
    }),

  /**
   * Remove member from channel (Owner only)
   */
  removeChannelMember: protectedProcedure
    .input(
      z.object({
        channelId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const user = ctx.user;
      if (!user || user.role !== 'owner') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can manage channel members",
        });
      }

      await db
        .delete(channelMembers)
        .where(
          and(
            eq(channelMembers.channelId, input.channelId),
            eq(channelMembers.userId, input.userId)
          )
        );

      return { success: true };
    }),
});
