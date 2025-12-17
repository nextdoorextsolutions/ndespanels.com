/**
 * Events Router
 * Calendar events with type support (inspection, call, meeting, zoom)
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { events, users, chatMessages, chatChannels, channelMembers } from "../../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export const eventsRouter = router({
  /**
   * Get events within a date range
   */
  getEvents: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      const eventsList = await db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          type: events.type,
          startTime: events.startTime,
          endTime: events.endTime,
          jobId: events.jobId,
          assignedTo: events.assignedTo,
          createdBy: events.createdBy,
          location: events.location,
          meetingUrl: events.meetingUrl,
          assignedUserName: users.name,
          assignedUserEmail: users.email,
        })
        .from(events)
        .leftJoin(users, eq(events.assignedTo, users.id))
        .where(
          and(
            gte(events.startTime, start),
            lte(events.startTime, end)
          )
        )
        .orderBy(events.startTime);

      return eventsList;
    }),

  /**
   * Create a new event
   * Sends notification to attendees via DM or system message
   */
  createEvent: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(["inspection", "call", "meeting", "zoom"]),
        color: z.string().optional(),
        startTime: z.string(),
        endTime: z.string().optional(),
        jobId: z.number().optional(),
        assignedTo: z.number().optional(),
        attendees: z.array(z.number()).optional(),
        location: z.string().optional(),
        meetingUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const user = ctx.user;

      // Auto-assign color based on type if not provided
      const eventColors = {
        inspection: "#ef4444", // Red
        call: "#22c55e", // Green
        meeting: "#3b82f6", // Blue
        zoom: "#a855f7", // Purple
      };
      const eventColor = input.color || eventColors[input.type];

      // Build attendees list
      const attendeesList = input.attendees || [];
      if (input.assignedTo && !attendeesList.includes(input.assignedTo)) {
        attendeesList.push(input.assignedTo);
      }

      // Create event
      const [newEvent] = await db
        .insert(events)
        .values({
          title: input.title,
          description: input.description || null,
          type: input.type,
          color: eventColor,
          startTime: new Date(input.startTime),
          endTime: input.endTime ? new Date(input.endTime) : null,
          jobId: input.jobId || null,
          assignedTo: input.assignedTo || null,
          createdBy: user.id,
          attendees: attendeesList,
          location: input.location || null,
          meetingUrl: input.meetingUrl || null,
        })
        .returning();

      // Send notifications to attendees
      try {
        const eventTypeEmoji = {
          inspection: "🔍",
          call: "📞",
          meeting: "👥",
          zoom: "💻",
        };

        const formattedDate = new Date(input.startTime).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const notificationMessage = `${eventTypeEmoji[input.type]} **New Event:** "${input.title}" scheduled for ${formattedDate}`;

        // Send to general announcements channel
        const [teamChannel] = await db
          .select()
          .from(chatChannels)
          .where(eq(chatChannels.name, "general-announcements"))
          .limit(1);

        if (teamChannel) {
          await db.insert(chatMessages).values({
            channelId: teamChannel.id,
            userId: user.id,
            content: notificationMessage,
          });
        }

        // Send DM to each attendee (if they're not the creator)
        for (const attendeeId of attendeesList) {
          if (attendeeId !== user.id) {
            // Find or create DM channel with attendee
            const sortedIds = [user.id, attendeeId].sort();
            const dmChannelName = `dm-${sortedIds[0]}-${sortedIds[1]}`;

            let dmChannel = await db
              .select()
              .from(chatChannels)
              .where(eq(chatChannels.name, dmChannelName))
              .limit(1);

            // Create DM channel if it doesn't exist
            if (!dmChannel || dmChannel.length === 0) {
              const [newDM] = await db
                .insert(chatChannels)
                .values({
                  name: dmChannelName,
                  type: 'dm',
                  createdBy: user.id,
                })
                .returning();

              // Add both users as members
              await db.insert(channelMembers).values([
                { channelId: newDM.id, userId: user.id },
                { channelId: newDM.id, userId: attendeeId },
              ]);

              dmChannel = [newDM];
            }

            // Send notification message
            if (dmChannel[0]) {
              await db.insert(chatMessages).values({
                channelId: dmChannel[0].id,
                userId: user.id,
                content: `📅 You've been invited to: **${input.title}** on ${formattedDate}${input.location ? ` at ${input.location}` : ''}`,
              });
            }
          }
        }
      } catch (error) {
        console.error("[createEvent] Failed to send notifications:", error);
        // Don't fail the event creation if notification fails
      }

      return newEvent;
    }),

  /**
   * Update an event
   */
  updateEvent: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        type: z.enum(["inspection", "call", "meeting", "zoom"]).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        jobId: z.number().optional(),
        assignedTo: z.number().optional(),
        location: z.string().optional(),
        meetingUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const user = ctx.user;

      // Check if user has permission to update
      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      if (!existingEvent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      if (existingEvent.createdBy !== user.id && user.role !== "owner" && user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to update this event" });
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.startTime !== undefined) updateData.startTime = new Date(input.startTime);
      if (input.endTime !== undefined) updateData.endTime = input.endTime ? new Date(input.endTime) : null;
      if (input.jobId !== undefined) updateData.jobId = input.jobId;
      if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
      if (input.location !== undefined) updateData.location = input.location;
      if (input.meetingUrl !== undefined) updateData.meetingUrl = input.meetingUrl;

      const [updatedEvent] = await db
        .update(events)
        .set(updateData)
        .where(eq(events.id, input.id))
        .returning();

      return updatedEvent;
    }),

  /**
   * Delete an event
   */
  deleteEvent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const user = ctx.user;

      // Check if user has permission to delete
      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      if (!existingEvent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      if (existingEvent.createdBy !== user.id && user.role !== "owner" && user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to delete this event" });
      }

      await db.delete(events).where(eq(events.id, input.id));

      return { success: true };
    }),
});
