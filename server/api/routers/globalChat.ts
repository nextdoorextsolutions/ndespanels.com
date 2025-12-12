/**
 * Global Chat Router
 * Handles real-time chat with Gemini AI streaming responses
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { observable } from "@trpc/server/observable";
import { getDb } from "../../db";
import { activities } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

interface ChatHistoryItem {
  role: "user" | "model";
  parts: string;
}

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
 * Maps database activity types to priority levels
 */
function buildActivityContext(activities: Activity[]): string {
  if (!activities || activities.length === 0) {
    return "";
  }

  const contextLines: string[] = ["\n\n=== RECENT ACTIVITY CONTEXT ==="];

  for (const activity of activities) {
    let prefix = "";
    
    // Map activity types to priority levels
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

export const globalChatRouter = router({
  /**
   * Stream a response from Gemini AI
   */
  streamMessage: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        history: z.array(
          z.object({
            role: z.enum(["user", "model"]),
            parts: z.string(),
          })
        ).optional(),
        threadId: z.string().optional(),
        jobId: z.number().optional(), // Optional job ID for context
      })
    )
    .subscription(async ({ input }) => {
      return observable<{ chunk: string; done: boolean }>((emit) => {
        (async () => {
          try {
            const db = await getDb();
            
            if (!db) {
              throw new Error("Database connection failed");
            }
            
            // Fetch recent activities for context (last 20 activities)
            let recentActivities: Activity[] = [];
            
            if (input.jobId) {
              // If job ID provided, get activities for that specific job
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
              // Otherwise, get recent activities across all jobs (for general context)
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

            const model = genAI.getGenerativeModel({ 
              model: "gemini-1.5-flash",
              systemInstruction: enhancedSystemPrompt,
            });

            // Build chat history
            const chatHistory = input.history?.map((msg) => ({
              role: msg.role,
              parts: [{ text: msg.parts }],
            })) || [];

            const chat = model.startChat({
              history: chatHistory,
              generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7,
              },
            });

            // Stream the response
            const result = await chat.sendMessageStream(input.message);

            for await (const chunk of result.stream) {
              const text = chunk.text();
              emit.next({ chunk: text, done: false });
            }

            // Signal completion
            emit.next({ chunk: "", done: true });
            emit.complete();
          } catch (error) {
            console.error("Gemini streaming error:", error);
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
   * Send a message and get complete response (non-streaming fallback)
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        history: z.array(
          z.object({
            role: z.enum(["user", "model"]),
            parts: z.string(),
          })
        ).optional(),
        jobId: z.number().optional(), // Optional job ID for context
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }
        
        // Fetch recent activities for context (last 20 activities)
        let recentActivities: Activity[] = [];
        
        if (input.jobId) {
          // If job ID provided, get activities for that specific job
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
          // Otherwise, get recent activities across all jobs (for general context)
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

        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          systemInstruction: enhancedSystemPrompt,
        });

        const chatHistory = input.history?.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.parts }],
        })) || [];

        const chat = model.startChat({
          history: chatHistory,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7,
          },
        });

        const result = await chat.sendMessage(input.message);
        const response = result.response.text();

        return {
          response,
          success: true,
        };
      } catch (error) {
        console.error("Gemini error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get response",
        });
      }
    }),

  /**
   * Generate a draft reply based on context
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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        const response = result.response.text();

        return {
          draft: response,
          success: true,
        };
      } catch (error) {
        console.error("Draft generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate draft",
        });
      }
    }),
});
