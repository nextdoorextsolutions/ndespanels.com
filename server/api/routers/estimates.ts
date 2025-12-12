/**
 * Estimates Router
 * Handles AI-powered Xactimate Scope of Loss analysis using Google Gemini
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `
You are Zerox, a Senior Insurance Estimator and Xactimate Expert.
Your goal is to parse "Scope of Loss" documents and Xactimate estimates into structured data, identifying key line items, missing profits, and potential underpayments.

### 1. YOUR KNOWLEDGE BASE (THE "ROSETTA STONE")
You must recognize standard Xactimate Category Codes and their meanings.
Use this mapping logic:
- **RFG** = Roofing (Shingles, Felt, Drip Edge).
- **SFG** = Soffit, Fascia, & Gutter.
- **DRY** = Drywall (Repairs, Texture).
- **PNT** = Painting.
- **WTR** = Water Extraction/Remediation.
- **SDG** = Siding.
- **O&P** = Overhead and Profit (Crucial: typically 10% Overhead + 10% Profit).
- **ACV** = Actual Cash Value (Depreciated value).
- **RCV** = Replacement Cost Value (Full replacement cost).

### 2. DOCUMENT PARSING RULES
When given a Scope of Loss text or PDF content:
1. **Identify the Carrier:** Look for "State Farm", "Allstate", "Liberty Mutual", etc.
2. **Find the Claim Number:** Extract the specific claim ID.
3. **Parse Line Items:**
   - Extract the quantity (QTY), Unit Price, and Total.
   - Flag "Depreciation" amounts.
4. **Audit for "Red Flags" (The "Scope Gap"):**
   - **Missing O&P:** If the total is >$10k or includes >3 trades (e.g., RFG, EXT, PNT), check if "Overhead and Profit" is included. If not, FLAG IT as "Missing O&P".
   - **Missing Components:**
     - If RFG 300S (Shingles) is present, check for RFG FELT (Underlayment) and RFG DRIP (Drip edge). If missing, FLAG as "Missing Code Items".
     - If RFG R&R (Remove & Replace) is listed, ensure "Debris Removal" or "Dumpster" is included.

### 3. OUTPUT FORMAT
You must return the analysis in the specified JSON format. Be precise with money.
`;

const auditResultSchema = z.object({
  claim_info: z.object({
    carrier: z.string(),
    claim_number: z.string(),
    loss_date: z.string(),
    total_rcv: z.number(),
    total_acv: z.number(),
    deductible: z.number(),
  }),
  line_items_summary: z.array(
    z.object({
      category: z.string(),
      total_cost: z.number(),
      description: z.string(),
    })
  ),
  audit_flags: z.array(
    z.object({
      severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
      issue: z.string(),
      description: z.string(),
    })
  ),
  estimator_notes: z.string(),
});

export const estimatesRouter = router({
  analyzeScope: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10, "Scope text must be at least 10 characters"),
      })
    )
    .output(auditResultSchema)
    .mutation(async ({ input }) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gemini API key not configured",
        });
      }

      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
          systemInstruction: SYSTEM_PROMPT,
        });

        const result = await model.generateContent(
          `Here is the Scope of Loss text to analyze:\n\n${input.text}\n\nPlease respond with valid JSON only.`
        );

        const response = result.response;
        const text = response.text();

        if (!text) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No response generated from AI",
          });
        }

        const parsedResult = JSON.parse(text);
        return auditResultSchema.parse(parsedResult);
      } catch (error: any) {
        console.error("Gemini Analysis Failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to analyze scope",
        });
      }
    }),
});
