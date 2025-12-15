/**
 * Team Chat Router
 * Handles real-time team messaging with channels and DMs
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { chatChannels, chatMessages, channelMembers, users } from "../../../drizzle/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

export const teamChatRouter = router({
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

    return userChannels.map(channel => ({
      ...channel,
      unreadCount: unreadMap.get(channel.id) || 0,
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
   * Get channel by name (for direct access)
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
   * Get online users in a channel (for presence)
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
});
