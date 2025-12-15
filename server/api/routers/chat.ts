/**
 * Chat Router - Real Team Messaging
 * Phase 2: Backend API for channels, messages, and DMs
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { chatChannels, chatMessages, channelMembers, users } from "../../../drizzle/schema";
import { eq, and, desc, inArray, or, gt } from "drizzle-orm";

export const chatRouter = router({
  /**
   * Get all channels the current user has access to
   */
  getChannels: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });

      // Get channels user is a member of
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
        .where(eq(channelMembers.userId, ctx.user.id))
        .orderBy(chatChannels.name);

      // Get unread counts for each channel
      const channelsWithUnread = await Promise.all(
        userChannels.map(async (channel) => {
          let unreadCount = 0;
          
          if (channel.lastReadAt) {
            const unreadMessages = await db
              .select({ id: chatMessages.id })
              .from(chatMessages)
              .where(
                and(
                  eq(chatMessages.channelId, channel.id),
                  gt(chatMessages.createdAt, channel.lastReadAt)
                )
              );
            unreadCount = unreadMessages.length;
          } else {
            // If never read, count all messages
            const allMessages = await db
              .select({ id: chatMessages.id })
              .from(chatMessages)
              .where(eq(chatMessages.channelId, channel.id));
            unreadCount = allMessages.length;
          }

          return {
            ...channel,
            unreadCount,
          };
        })
      );

      return channelsWithUnread;
    }),

  /**
   * Get messages for a specific channel
   */
  getMessages: protectedProcedure
    .input(z.object({
      channelId: z.number(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });

      // Verify user has access to this channel
      const membership = await db
        .select()
        .from(channelMembers)
        .where(
          and(
            eq(channelMembers.channelId, input.channelId),
            eq(channelMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (membership.length === 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this channel" });
      }

      // Fetch messages with user info
      const messages = await db
        .select({
          id: chatMessages.id,
          content: chatMessages.content,
          userId: chatMessages.userId,
          userName: users.name,
          userEmail: users.email,
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

      return messages.reverse(); // Return in chronological order
    }),

  /**
   * Send a message to a channel
   */
  sendMessage: protectedProcedure
    .input(z.object({
      channelId: z.number(),
      content: z.string().min(1),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });

      // Verify user has access to this channel
      const membership = await db
        .select()
        .from(channelMembers)
        .where(
          and(
            eq(channelMembers.channelId, input.channelId),
            eq(channelMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (membership.length === 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this channel" });
      }

      // Insert message
      const [message] = await db
        .insert(chatMessages)
        .values({
          channelId: input.channelId,
          userId: ctx.user.id,
          content: input.content,
          metadata: input.metadata,
        })
        .returning();

      return message;
    }),

  /**
   * Create a new channel
   */
  createChannel: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      type: z.enum(["public", "private"]),
      description: z.string().optional(),
      memberIds: z.array(z.number()).optional(), // For private channels
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });

      // Create channel
      const [channel] = await db
        .insert(chatChannels)
        .values({
          name: input.name,
          type: input.type,
          description: input.description,
          createdBy: ctx.user.id,
        })
        .returning();

      // Add creator as owner
      await db.insert(channelMembers).values({
        channelId: channel.id,
        userId: ctx.user.id,
        role: "owner",
      });

      // Add other members for private channels
      if (input.type === "private" && input.memberIds && input.memberIds.length > 0) {
        await db.insert(channelMembers).values(
          input.memberIds.map(userId => ({
            channelId: channel.id,
            userId,
            role: "member",
          }))
        );
      }

      // For public channels, add all users
      if (input.type === "public") {
        const allUsers = await db.select({ id: users.id }).from(users);
        await db.insert(channelMembers).values(
          allUsers
            .filter(u => u.id !== ctx.user.id) // Skip creator, already added
            .map(u => ({
              channelId: channel.id,
              userId: u.id,
              role: "member",
            }))
        );
      }

      return channel;
    }),

  /**
   * Create or get a DM channel with another user
   */
  createOrGetDM: protectedProcedure
    .input(z.object({
      otherUserId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });

      // Check if DM already exists between these two users
      const existingDMs = await db
        .select({
          channelId: channelMembers.channelId,
          type: chatChannels.type,
        })
        .from(channelMembers)
        .innerJoin(chatChannels, eq(channelMembers.channelId, chatChannels.id))
        .where(
          and(
            eq(chatChannels.type, "dm"),
            or(
              eq(channelMembers.userId, ctx.user.id),
              eq(channelMembers.userId, input.otherUserId)
            )
          )
        );

      // Find DM channel that has both users
      const dmChannelIds = existingDMs.map(dm => dm.channelId);
      if (dmChannelIds.length > 0) {
        for (const channelId of dmChannelIds) {
          const members = await db
            .select({ userId: channelMembers.userId })
            .from(channelMembers)
            .where(eq(channelMembers.channelId, channelId));

          const memberIds = members.map(m => m.userId);
          if (memberIds.includes(ctx.user.id) && memberIds.includes(input.otherUserId) && memberIds.length === 2) {
            // Found existing DM
            const [channel] = await db
              .select()
              .from(chatChannels)
              .where(eq(chatChannels.id, channelId))
              .limit(1);
            return channel;
          }
        }
      }

      // Create new DM channel
      const otherUser = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, input.otherUserId))
        .limit(1);

      if (otherUser.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const [channel] = await db
        .insert(chatChannels)
        .values({
          name: `DM: ${otherUser[0].name || otherUser[0].email}`,
          type: "dm",
          createdBy: ctx.user.id,
        })
        .returning();

      // Add both users as members
      await db.insert(channelMembers).values([
        { channelId: channel.id, userId: ctx.user.id, role: "member" },
        { channelId: channel.id, userId: input.otherUserId, role: "member" },
      ]);

      return channel;
    }),

  /**
   * Mark channel as read
   */
  markAsRead: protectedProcedure
    .input(z.object({
      channelId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });

      await db
        .update(channelMembers)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(channelMembers.channelId, input.channelId),
            eq(channelMembers.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  /**
   * Get all users for DM creation
   */
  getUsers: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });

      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id)); // Exclude current user

      return allUsers.filter(u => u.id !== ctx.user.id);
    }),
});
