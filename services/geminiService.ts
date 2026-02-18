
import { GoogleGenAI, Type } from "@google/genai";
import { FinancialData, LineItem } from "../types";

/**
 * AI Configuration and Extraction Rules.
 * Extracted from the main logic to allow for easier tuning of the extraction agent's "personality" and accuracy.
 */
const EXTRACTION_CONFIG = {
  MODEL: 'gemini-3-flash-preview',
  SYSTEM_INSTRUCTION: `
    You are an expert Financial Data Extraction Agent. Your task is to extract the Statement of Profit & Loss (Income Statement) into a structured JSON format.
    
    RULES:
    1. SECTION FILTERING: Extract ONLY from Income Statement sections. Ignore Balance Sheets or Cash Flows.
    2. MULTI-YEAR: Extract ALL visible reporting periods. Maintain column order.
    3. NUMERIC RELIABILITY: Extract ONLY visible numbers. Do NOT compute totals. Remove commas. Keep decimals.
    4. LINE ITEM STANDARDIZATION: Map original names to standard finance terms (e.g., "Revenue from ops" -> "Revenue from Operations").
    5. MISSING COMPONENTS: Flag if Revenue, Total Expenses, PBT, or PAT are missing.
  `,
  RESPONSE_SCHEMA: {
    type: Type.OBJECT,
    properties: {
      company_name: { type: Type.STRING },
      currency: { type: Type.STRING, nullable: true },
      units: { type: Type.STRING, nullable: true },
      years: { type: Type.ARRAY, items: { type: Type.STRING } },
      line_items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            standardized_name: { type: Type.STRING },
            yearly_values: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  year: { type: Type.STRING },
                  value: { type: Type.NUMBER, nullable: true }
                },
                required: ["year", "value"]
              }
            }
          },
          required: ["name", "standardized_name", "yearly_values"]
        }
      },
      missing_line_items: { type: Type.ARRAY, items: { type: Type.STRING } },
      completeness: { type: Type.STRING, enum: ["Complete", "Partial", "Not Found"] }
    },
    required: ["company_name", "years", "line_items", "missing_line_items", "completeness"]
  }
};

/**
 * High-level extraction service.
 * Handles communication with Gemini and reshapes the raw JSON into our internal 'FinancialData' type.
 */
export async function extractFinancialData(fileBase64: string, mimeType: string): Promise<FinancialData> {
  // We initialize the client inside the function to ensure we always have the freshest API key 
  // from the environment context, avoiding stale closure issues if keys change.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const response = await ai.models.generateContent({
    model: EXTRACTION_CONFIG.MODEL,
    contents: [{
      parts: [
        { inlineData: { data: fileBase64, mimeType: mimeType } },
        { text: "Extract the multi-year Income Statement from this document following the provided schema." }
      ]
    }],
    config: {
      systemInstruction: EXTRACTION_CONFIG.SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_CONFIG.RESPONSE_SCHEMA,
      temperature: 0, // High determinism for extraction tasks
    }
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("The extraction engine returned an empty response.");
  }

  try {
    const data = JSON.parse(rawText);
    return transformRawApiResponse(data);
  } catch (error) {
    console.error("[GeminiService] Failed to parse or transform API response:", error);
    throw new Error("The document was processed, but the data structure was unrecognizable.");
  }
}

/**
 * Normalizes the API response into the application's domain model.
 * Converting the nested 'yearly_values' array into a lookup map makes table rendering and CSV generation significantly more performant.
 */
function transformRawApiResponse(raw: any): FinancialData {
  const lineItems: LineItem[] = (raw.line_items || []).map((item: any) => ({
    name: item.name,
    standardized_name: item.standardized_name,
    // Flattening the years into an object key lookup: { "2024": 100.50 }
    values: (item.yearly_values || []).reduce((acc: any, v: any) => {
      acc[v.year] = v.value;
      return acc;
    }, {})
  }));

  return {
    company_name: raw.company_name || "Unknown Entity",
    currency: raw.currency || null,
    units: raw.units || null,
    years: raw.years || [],
    line_items: lineItems,
    missing_line_items: raw.missing_line_items || [],
    completeness: raw.completeness || "Not Found"
  };
}
