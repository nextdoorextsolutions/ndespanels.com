/**
 * AI Router
 * Handles AI-powered content generation using Google Gemini
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { reportRequests, products, companySettings, activities } from "../../../drizzle/schema";
import { eq, or, ilike, desc } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Florida Construction Laws Knowledge Base
const FL_LAWS = `
FLORIDA CONSTRUCTION LAW REFERENCE:

Chapter 713 - Lien Deadlines:
- Notice to Owner (NTO): Must be served within 45 days of first labor/material delivery to project
- Claim of Lien: Must be recorded within 90 days of final furnishing of labor/materials
- Lien enforcement lawsuit: Must be filed within 1 year of recording lien
- Failure to meet these deadlines results in complete loss of lien rights

Chapter 626.854 - Public Adjuster Restrictions:
- Contractors CANNOT negotiate insurance claims unless separately licensed as a Public Adjuster
- Contractors cannot adjust, negotiate, or settle claims on behalf of policyholders
- Violating this statute may result in contractor license disciplinary action

Florida Statute 817.234 - Deductible Payment Prohibition:
- It is a THIRD-DEGREE FELONY to advertise or promise to pay a policyholder's insurance deductible
- Contractors cannot waive, rebate, or pay deductibles as an inducement for business
- This includes direct payment, credits, or any arrangement that effectively eliminates the deductible
- Marketing materials stating "we pay your deductible" violate this law

Chapter 558 - Pre-Suit Notice Requirements:
- Property owners must serve written Notice of Defect at least 60 days before filing construction defect lawsuit
- Contractors have 30 days to inspect after receiving notice
- Contractors then have 30 days after inspection to make settlement offer or repair proposal
- Failure by owner to provide proper notice can dismiss lawsuit

Assignment of Benefits (AOB) Restrictions (FS 627.7152 & 627.7153):
- Post-loss AOB agreements must meet strict formatting requirements
- 3-day rescission period for homeowner after signing AOB
- Cannot be executed until after insurer issues coverage determination
- Contractors must provide detailed disclosures about implications
`;

export const aiRouter = router({
  /**
   * Generate proposal content with AI
   * Fetches job, product, and company data, then generates AI content
   */
  generateProposalContent: protectedProcedure
    .input(z.object({
      jobId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch job data
      const [job] = await db
        .select()
        .from(reportRequests)
        .where(eq(reportRequests.id, input.jobId));

      if (!job) throw new Error("Job not found");

      // Fetch company settings
      const [company] = await db
        .select()
        .from(companySettings)
        .where(eq(companySettings.id, 1));

      // Fetch selected product if available
      let product = null;
      if (job.selectedProductId) {
        const [selectedProduct] = await db
          .select()
          .from(products)
          .where(eq(products.id, job.selectedProductId));
        product = selectedProduct || null;
      }

      // Generate AI content using Gemini
      let aiContent = {
        scope: "",
        closing: ""
      };

      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Construct prompt based on whether product is selected
        let prompt = "";
        if (product) {
          prompt = `You are a professional roofing estimator writing a proposal. Write a compelling "Scope of Work" section (2-3 paragraphs) for a roof replacement project using ${product.productName} shingles in ${product.color} color by ${product.manufacturer}. 

Key product features to highlight:
- Wind Rating: ${product.windRating}
- Warranty: ${product.warrantyInfo}
- Description: ${product.description}

The scope should be professional, detailed, and emphasize quality and protection. Do not include pricing.

Then write a warm, professional closing statement (1 paragraph) that thanks the customer and encourages them to reach out with questions.

Format your response as:
SCOPE:
[scope of work here]

CLOSING:
[closing statement here]`;
        } else {
          prompt = `You are a professional roofing estimator writing a proposal. Write a compelling "Scope of Work" section (2-3 paragraphs) for a roof replacement project using high-quality architectural shingles. 

The scope should be professional, detailed, and emphasize quality and protection. Do not include pricing or specific product names.

Then write a warm, professional closing statement (1 paragraph) that thanks the customer and encourages them to reach out with questions.

Format your response as:
SCOPE:
[scope of work here]

CLOSING:
[closing statement here]`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the response
        const scopeMatch = text.match(/SCOPE:\s*([\s\S]*?)(?=CLOSING:|$)/i);
        const closingMatch = text.match(/CLOSING:\s*([\s\S]*)$/i);

        aiContent = {
          scope: scopeMatch ? scopeMatch[1].trim() : text,
          closing: closingMatch ? closingMatch[1].trim() : "Thank you for considering us for your roofing project. We look forward to working with you!"
        };
      } catch (error) {
        console.error("Gemini AI error:", error);
        // Fallback content if AI fails
        if (product) {
          aiContent = {
            scope: `This proposal outlines a complete roof replacement using ${product.productName} in ${product.color} by ${product.manufacturer}. These premium shingles offer ${product.windRating} wind resistance and come with ${product.warrantyInfo}. Our experienced team will remove your existing roof, install new underlayment, and professionally install your new shingle system to manufacturer specifications.`,
            closing: "Thank you for considering us for your roofing project. We look forward to working with you and protecting your home for years to come."
          };
        } else {
          aiContent = {
            scope: "This proposal outlines a complete roof replacement using high-quality architectural shingles. Our experienced team will remove your existing roof, install new underlayment, and professionally install your new shingle system to manufacturer specifications.",
            closing: "Thank you for considering us for your roofing project. We look forward to working with you."
          };
        }
      }

      return {
        job,
        company: company || null,
        product,
        aiContent
      };
    }),

  /**
   * Multi-Tool AI Assistant
   * Uses intent classification to route requests to appropriate tools
   */
  askAssistant: protectedProcedure
    .input(z.object({
      question: z.string(),
      jobContext: z.number().optional(), // Optional job ID for context
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // ============ STEP 1: Define Available Tools ============
      const toolDefinitions = `
Available Tools:
1. "lookup_job" - Search for jobs by customer name, phone number, or address
2. "get_job_summary" - Get the latest 5 activities/updates for a specific job
3. "check_statute" - Check questions against Florida Construction Laws (liens, deadlines, Public Adjuster rules, deductibles, Florida Statutes 558/489/626/713/817)
4. "general_chat" - General conversation, email writing, or other non-CRM tasks
`;

      // ============ STEP 2: Intent Classification (AI Pass #1) ============
      console.log("[AI Assistant] Classifying intent for:", input.question);

      const intentPrompt = `You are a CRM assistant. Analyze the user's question and decide which tool to use.

${toolDefinitions}

Rules:
- Use "lookup_job" if the user asks about a person, phone number, or address
- Use "get_job_summary" if the user asks for "latest updates", "recent activity", "catch me up", or "what's happening" with a job
- Use "check_statute" if the user asks about liens, lien deadlines, Notice to Owner, Public Adjuster, paying deductibles, Florida Statutes (558/489/626/713/817), pre-suit notices, or legal compliance
- Use "general_chat" for everything else (greetings, email writing, general questions)

User Question: "${input.question}"
${input.jobContext ? `Current Job Context ID: ${input.jobContext}` : ''}

Return ONLY valid JSON in this exact format:
{
  "tool": "lookup_job" | "get_job_summary" | "check_statute" | "general_chat",
  "search_term": "extracted search term or null",
  "reasoning": "brief explanation"
}`;

      let intentResponse;
      try {
        const result = await model.generateContent(intentPrompt);
        const response = await result.response;
        const text = response.text();
        
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        
        intentResponse = JSON.parse(jsonMatch[0]);
        console.log("[AI Assistant] Intent classified:", intentResponse);
      } catch (error) {
        console.error("[AI Assistant] Intent classification failed:", error);
        // Fallback to general_chat
        intentResponse = {
          tool: "general_chat",
          search_term: null,
          reasoning: "Failed to classify intent, defaulting to general chat"
        };
      }

      // ============ STEP 3: Tool Execution (Switch Statement) ============
      let toolData: any = null;
      let toolResult = "";

      switch (intentResponse.tool) {
        case "lookup_job": {
          console.log("[AI Assistant] Executing lookup_job with term:", intentResponse.search_term);
          
          if (!intentResponse.search_term) {
            toolResult = "No search term provided. Please specify a name, phone, or address.";
            break;
          }

          const searchTerm = `%${intentResponse.search_term}%`;
          
          // Search jobs by name, phone, or address
          const jobs = await db
            .select({
              id: reportRequests.id,
              fullName: reportRequests.fullName,
              email: reportRequests.email,
              phone: reportRequests.phone,
              address: reportRequests.address,
              cityStateZip: reportRequests.cityStateZip,
              status: reportRequests.status,
              dealType: reportRequests.dealType,
              totalPrice: reportRequests.totalPrice,
              createdAt: reportRequests.createdAt,
            })
            .from(reportRequests)
            .where(
              or(
                ilike(reportRequests.fullName, searchTerm),
                ilike(reportRequests.phone, searchTerm),
                ilike(reportRequests.address, searchTerm)
              )
            )
            .limit(10);

          toolData = jobs;
          toolResult = jobs.length > 0 
            ? `Found ${jobs.length} job(s) matching "${intentResponse.search_term}"`
            : `No jobs found matching "${intentResponse.search_term}"`;
          
          console.log("[AI Assistant] Found", jobs.length, "jobs");
          break;
        }

        case "get_job_summary": {
          const jobId = input.jobContext || intentResponse.search_term;
          console.log("[AI Assistant] Executing get_job_summary for job:", jobId);
          
          if (!jobId) {
            toolResult = "No job ID provided. Please specify which job you want updates for.";
            break;
          }

          // Get job details
          const [job] = await db
            .select({
              id: reportRequests.id,
              fullName: reportRequests.fullName,
              address: reportRequests.address,
              status: reportRequests.status,
              dealType: reportRequests.dealType,
            })
            .from(reportRequests)
            .where(eq(reportRequests.id, Number(jobId)))
            .limit(1);

          if (!job) {
            toolResult = `Job #${jobId} not found.`;
            break;
          }

          // Get latest 5 activities
          const recentActivities = await db
            .select({
              id: activities.id,
              activityType: activities.activityType,
              description: activities.description,
              createdAt: activities.createdAt,
            })
            .from(activities)
            .where(eq(activities.reportRequestId, Number(jobId)))
            .orderBy(desc(activities.createdAt))
            .limit(5);

          toolData = {
            job,
            activities: recentActivities
          };
          
          toolResult = `Found job "${job.fullName}" with ${recentActivities.length} recent activities`;
          console.log("[AI Assistant] Retrieved job summary with", recentActivities.length, "activities");
          break;
        }

        case "check_statute": {
          console.log("[AI Assistant] Executing check_statute");
          
          // Pass user question and FL_LAWS to Gemini for analysis
          const statutePrompt = `You are a Florida Construction Compliance Assistant. Compare the user's question to the provided Florida Construction Laws and provide guidance.

USER QUESTION: "${input.question}"

FLORIDA CONSTRUCTION LAWS:
${FL_LAWS}

INSTRUCTIONS:
1. Identify which statute(s) apply to the user's question
2. Flag any compliance risks or deadline concerns
3. Cite the specific statute (e.g., "Per FS 817.234..." or "Under Chapter 713...")
4. Provide clear, actionable guidance
5. Use professional but direct language
6. If the question involves illegal activity (like paying deductibles), clearly state "NO" and explain why

Format your response professionally with statute citations.`;

          try {
            const statuteResult = await model.generateContent(statutePrompt);
            const statuteResponse = await statuteResult.response;
            const statuteAnswer = statuteResponse.text();
            
            toolData = {
              statuteGuidance: statuteAnswer,
              lawsReferenced: FL_LAWS
            };
            toolResult = "Florida statute guidance generated";
            console.log("[AI Assistant] Statute check completed");
          } catch (error) {
            console.error("[AI Assistant] Statute check failed:", error);
            toolResult = "Failed to analyze statute compliance";
            toolData = null;
          }
          break;
        }

        case "general_chat":
        default: {
          console.log("[AI Assistant] Executing general_chat");
          toolResult = "No database query needed - general conversation";
          toolData = null;
          break;
        }
      }

      // ============ STEP 4: Final Answer Generation (AI Pass #2) ============
      console.log("[AI Assistant] Generating final answer");

      const finalPrompt = `You are a helpful CRM assistant for a roofing company. Answer the user's question naturally and professionally.

User Question: "${input.question}"

Tool Used: ${intentResponse.tool}
Tool Result: ${toolResult}

${toolData ? `System Data:\n${JSON.stringify(toolData, null, 2)}` : 'No additional data available.'}

Instructions:
- Answer naturally in a conversational tone
- If data was found, present it clearly and helpfully
- If no data was found, acknowledge it and offer to help differently
- For statute guidance, present the information directly and clearly with citations
- For general chat, just respond naturally
- Keep responses concise but complete
- Use proper formatting for readability`;

      try {
        const finalResult = await model.generateContent(finalPrompt);
        const finalResponse = await finalResult.response;
        const answer = finalResponse.text();

        return {
          success: true,
          answer,
          intent: intentResponse,
          toolResult,
          dataFound: toolData !== null,
          toolData, // Include the actual data for rich media rendering
        };
      } catch (error) {
        console.error("[AI Assistant] Final answer generation failed:", error);
        
        // Fallback response
        return {
          success: false,
          answer: "I apologize, but I encountered an error processing your request. Please try again or rephrase your question.",
          intent: intentResponse,
          toolResult,
          dataFound: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }),
});
