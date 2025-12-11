/**
 * AI Router
 * Handles AI-powered content generation using Google Gemini
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Construct prompt based on whether product is selected
        let prompt = "";
        if (product) {
          // Enterprise-level persuasive Executive Summary
          prompt = `ROLE: You are a professional roofing consultant writing a persuasive Executive Summary for a high-end roofing proposal.

TASK: Write an Executive Summary for ${job.fullName}'s property in ${job.cityStateZip || job.address}.

PRODUCT TO HIGHLIGHT: ${product.productName} by ${product.manufacturer}
- Wind Rating: ${product.windRating}
- Warranty: ${product.warrantyInfo}
- Features: ${product.description}

TONE: Professional, reassuring, and value-focused. Avoid technical jargon. Write in a way that builds trust and confidence.

STRUCTURE:
1. Opening: Acknowledge the customer's need for a reliable roofing solution
2. Product Benefits: Highlight the key advantages of ${product.productName} (${product.manufacturer}) - focus on durability, protection, and peace of mind
3. Value Proposition: Emphasize long-term benefits, warranty coverage, and how this investment protects their home and family
4. Reassurance: Mention our expertise and commitment to quality workmanship

LENGTH: 2-3 well-crafted paragraphs (approximately 250-300 words)

AVOID: Technical specifications, pricing details, overly salesy language, phrases like "we believe" or "we think"

Then write a warm, professional closing statement (1 paragraph) that thanks the customer and encourages them to reach out with any questions.

Format your response as:
SCOPE:
[executive summary here]

CLOSING:
[closing statement here]`;
        } else {
          prompt = `ROLE: You are a professional roofing consultant writing a persuasive Executive Summary for a high-end roofing proposal.

TASK: Write an Executive Summary for ${job.fullName}'s property in ${job.cityStateZip || job.address}.

TONE: Professional, reassuring, and value-focused. Avoid technical jargon.

STRUCTURE:
1. Opening: Acknowledge the customer's need for a reliable roofing solution
2. Product Benefits: Highlight the advantages of premium architectural shingles - durability, protection, peace of mind
3. Value Proposition: Emphasize long-term benefits and warranty coverage
4. Reassurance: Mention our expertise and commitment to quality

LENGTH: 2-3 paragraphs (250-300 words)

Then write a warm closing statement (1 paragraph).

Format your response as:
SCOPE:
[executive summary here]

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
      // Verify API key is configured
      if (!process.env.GEMINI_API_KEY) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Missing GEMINI_API_KEY environment variable",
        });
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
- Use "draft_email" if the user asks to write, draft, or compose an email to a customer
- Use "update_job_status" if the user asks to change, update, or move a job's status/stage
- Use "general_chat" for everything else (greetings, general questions)

User Question: "${input.question}"
${input.jobContext ? `Current Job Context ID: ${input.jobContext}` : ''}

Return ONLY valid JSON in this exact format:
{
  "tool": "lookup_job" | "get_job_summary" | "check_statute" | "draft_email" | "update_job_status" | "general_chat",
  "search_term": "extracted search term or null",
  "reasoning": "brief explanation",
  "email_topic": "topic for email (if draft_email tool)",
  "new_status": "new status (if update_job_status tool)"
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

        case "draft_email": {
          console.log("[AI Assistant] Executing draft_email");
          
          // Get job context if available
          let jobInfo = null;
          if (input.jobContext) {
            const [job] = await db
              .select({
                id: reportRequests.id,
                fullName: reportRequests.fullName,
                address: reportRequests.address,
                cityStateZip: reportRequests.cityStateZip,
                status: reportRequests.status,
              })
              .from(reportRequests)
              .where(eq(reportRequests.id, input.jobContext))
              .limit(1);
            
            jobInfo = job;
          }

          const emailTopic = intentResponse.email_topic || "follow up";
          const customerName = jobInfo?.fullName || "the customer";
          const firstName = customerName.split(' ')[0];
          
          // Professional email generation with proper structure
          const emailPrompt = `Write a professional customer email for a roofing company.

CUSTOMER: ${customerName}
${jobInfo ? `ADDRESS: ${jobInfo.address}, ${jobInfo.cityStateZip}` : ''}
${jobInfo ? `STATUS: ${jobInfo.status}` : ''}
TOPIC: ${emailTopic}

REQUIREMENTS:
1. Use proper business email structure (greeting, body, closing)
2. Professional but warm tone
3. Clear and concise
4. Proper grammar and punctuation
5. Address customer as "${firstName}"
6. Sign off as "The NDE Panels Team"

Write the complete email including subject line.

Format:
SUBJECT: [subject line]

BODY:
[email body]`;

          try {
            const emailResult = await model.generateContent(emailPrompt);
            const emailResponse = await emailResult.response;
            const emailText = emailResponse.text();
            
            toolData = {
              emailDraft: emailText,
              customerName,
              jobInfo,
            };
            toolResult = "Professional email draft generated";
            console.log("[AI Assistant] Email draft created");
          } catch (error) {
            console.error("[AI Assistant] Email generation failed:", error);
            toolResult = "Failed to generate email draft";
            toolData = null;
          }
          break;
        }

        case "update_job_status": {
          console.log("[AI Assistant] Executing update_job_status");
          
          const jobId = input.jobContext;
          const newStatus = intentResponse.new_status;
          
          if (!jobId) {
            toolResult = "No job ID provided. Please specify which job to update.";
            break;
          }

          if (!newStatus) {
            toolResult = "No status provided. Please specify the new status.";
            break;
          }

          // Get current job info
          const [job] = await db
            .select({
              id: reportRequests.id,
              fullName: reportRequests.fullName,
              status: reportRequests.status,
            })
            .from(reportRequests)
            .where(eq(reportRequests.id, jobId))
            .limit(1);

          if (!job) {
            toolResult = `Job #${jobId} not found.`;
            break;
          }

          // Compliance check for "Completed" status
          let complianceWarning = "";
          if (newStatus.toLowerCase().includes("completed") || newStatus === "completed") {
            complianceWarning = "\n\n⚠️ CRITICAL COMPLIANCE ALERT:\nJob marked as COMPLETED. The 90-day lien rights clock has started per Florida Chapter 713. You MUST:\n1. Verify Notice to Owner (NTO) was sent within 45 days of first delivery\n2. Record Claim of Lien within 90 days of completion\n3. Failure to meet these deadlines = COMPLETE LOSS of lien rights";
          }

          toolData = {
            jobId,
            jobName: job.fullName,
            oldStatus: job.status,
            newStatus,
            complianceWarning,
          };
          
          toolResult = `Status update prepared for "${job.fullName}" from "${job.status}" to "${newStatus}"${complianceWarning}`;
          console.log("[AI Assistant] Status update prepared with compliance check");
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
      } catch (error) {
        console.error("AI CRASH REPORT:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred in AI assistant",
        });
      }
    }),

  /**
   * Process Job Photo with AI Analysis and Watermarking
   * Analyzes roof damage using Gemini Vision and stamps metadata
   */
  processJobPhoto: protectedProcedure
    .input(z.object({
      photoUrl: z.string().url(),
      jobId: z.number(),
      photoId: z.number(),
      date: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      console.log(`[Photo AI] Processing photo ${input.photoId} for job ${input.jobId}`);

      try {
        // ============ ACTION A: AI Vision Analysis (The Eyes) ============
        console.log("[Photo AI] Step 1: Analyzing image with Gemini Vision");
        
        const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // Fetch the image
        const imageResponse = await fetch(input.photoUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');
        
        // Analyze with Gemini Vision
        const analysisPrompt = `Analyze this roof photo for damage. Be liberal in detecting potential issues since this photo was flagged by a roofing professional.

Return ONLY valid JSON in this exact format:
{
  "damage_detected": boolean,
  "tags": ["tag1", "tag2"],
  "severity": "Low" | "Medium" | "High",
  "description": "brief description of findings"
}

Common roof damage types to look for:
- Missing shingles
- Hail damage (circular dents, bruising)
- Wind damage (lifted/torn shingles)
- Granule loss
- Cracking or splitting
- Storm damage
- Water damage or staining
- Structural issues

Be thorough but accurate. If you see potential damage, flag it.`;

        const visionResult = await visionModel.generateContent([
          analysisPrompt,
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageResponse.headers.get('content-type') || 'image/jpeg',
            },
          },
        ]);

        const visionResponse = await visionResult.response;
        const visionText = visionResponse.text();
        
        // Parse JSON response
        const jsonMatch = visionText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in AI response");
        }
        
        const analysis = JSON.parse(jsonMatch[0]);
        console.log("[Photo AI] Analysis complete:", analysis);

        // ============ ACTION B: Image Watermarking (The Stamp) ============
        // Note: Watermarking will be added in a future update with canvas-based approach
        console.log("[Photo AI] Step 2: Watermarking (skipped for now, returning original image)");

        // ============ ACTION C: Save Results ============
        console.log("[Photo AI] Step 3: Saving analysis results to database");
        
        // Note: You'll need to add aiTags and aiAnalysis columns to your photos table
        // For now, we'll return the data for the frontend to handle
        
        return {
          success: true,
          photoId: input.photoId,
          analysis: {
            damageDetected: analysis.damage_detected,
            tags: analysis.tags,
            severity: analysis.severity,
            description: analysis.description,
          },
        };
        
      } catch (error) {
        console.error("[Photo AI] Processing failed:", error);
        
        return {
          success: false,
          photoId: input.photoId,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});
