import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CompanyDetails } from "../interfaces/IPlugin.js";

const AiMatchSchema = z.object({
    details: z.object({
        description: z.string().describe("descript of the internship in proper markdown"),
        stipend: z.string(),
        company: z.string(),
        location: z.string().describe("City, State or Country"),
        locationType: z.enum(["Online", "Hybrid", "Onsite"]).describe("Type of internship"),
        duration: z.string(),
        ppo: z.string().describe("Write about PPO if it is available").optional(),
        skills: z.array(z.string()),
        applyBy: z.string(),
    }),
    match: z.object({
        score: z.number(),
        verdict: z.enum(["Good Match", "Average Match", "Poor Match", "No Resume"]),
        summary: z.string(),
        pros: z.array(z.string()),
        cons: z.array(z.string()),
    }).optional(),
});

export type AiMatch = z.infer<typeof AiMatchSchema>;

export class AIService {
    private client: GoogleGenAI | null;
    private modelName = "gemini-flash-latest";

    constructor(apiKey: string | undefined) {
        if (!apiKey) {
            console.warn("Warning: GEMINI_API_KEY is not set. AI features will be disabled.");
            this.client = null;
        } else {
            this.client = new GoogleGenAI({ apiKey });
        }
    }

    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async analyzeCompany(companyName: string, location?: string, about?: string): Promise<string> {
        if (!this.client) {
            return "AI analysis disabled (no API key).";
        }

        try {
            console.log(`Analyzing company: ${companyName}`);

            // Rate limit handling: simple delay
            await this.sleep(4000);

            const prompt = `
        Analyze the following company and internship description to determine if it is a "Good" or "Bad" opportunity for an intern.
        
        Company: ${companyName}
        Location: ${location ? location : "No location provided."} 
        Comapny About: ${about ? about : "No about provided."}

        Task:
        1. Search for the company to verify its legitimacy and reputation.
        2. Identify the company's website URL.
        3. Estimate the company size (New/Small/Medium/Large).
        4. Determine if it's a well-known brand (like Zomato) or a small/unknown entity (like an individual name).

        Output format in tabular format:
        **Rating:** [1-10]/10
        **Verdict:** [Good/Bad/Neutral]
        **Company Size:** [New/Small/Medium/Large]
        **Website:** [URL in proper markdown format or "Not Found"]
        **Legitimacy:** [Verified/Unverified/Suspicious]
        **Summary:** [2 sentences on why]
        **Pros:** [List 1-2]
        **Cons:** [List 1-2]
      `;

            const response = await this.client.models.generateContent({
                model: this.modelName,
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            if (response && response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    return candidate.content.parts.map(p => p.text).join(' ');
                }
            }

            return "No analysis generated.";
        } catch (error: any) {
            if (error.status === 429 || error.code === 429 || (error.message && error.message.includes('429'))) {
                console.warn(`Rate limit hit for ${companyName}. Skipping analysis.`);
                return "Analysis skipped (Rate Limit).";
            }
            console.error(`AI Error for ${companyName}:`, error.message);
            return `AI analysis failed: ${error.message}`;
        }
    }

    async extractAndMatch(meta: string, description: string, resumeText: string): Promise<AiMatch | null> {
        if (!this.client) {
            return null;
        }

        try {
            console.log(`Extracting & Matching details...`);

            // Rate limit handling
            await this.sleep(2000);

            const prompt = `
        You are an expert career coach and data extractor.
        
        **Input Text (Internship Page):**
        meta: 
        ${meta.substring(0, 1000)}
        description:
        ${description.substring(0, 15000)}

        **Candidate Resume:**
        ${resumeText ? resumeText.substring(0, 5000) : "No resume provided."}

        **Task:**
        1. Extract structured details from the internship page.
        2. Compare the internship requirements with the candidate's resume (if provided).

        **Extraction Rules:**
        - description: markdown format (make important words bold, iclude important things e.g(other requirements, perks, etc.), try to compress the description, preserve important information ).
        - stipend: Exact string found.
        - skills: Array of strings.

        **Matching Rules:**
        - matchScore: 0-100.
        - verdict: "Good Match", "Average Match", "Poor Match", "No Resume".
        - summary: 1 sentence.
        - pros/cons: Short lists with short points.
      `;

            const response = await this.client.models.generateContent({
                model: "gemini-flash-lite-latest",
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: z.toJSONSchema(AiMatchSchema)
                }
            });

            if (response && response.text) {
                return JSON.parse(response.text);
            } else if (response && response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    const text = candidate.content.parts.map(p => p.text).join(' ');
                    return JSON.parse(text);
                }
            }

            return null;
        } catch (error: any) {
            console.error(`AI Extraction/Match Error:`, error.message);
            return null;
        }
    }
}
