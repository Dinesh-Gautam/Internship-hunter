import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

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

    async analyzeCompany(companyName: string, description: string): Promise<string> {
        if (!this.client) {
            return "AI analysis disabled (no API key).";
        }

        try {
            console.log(`Analyzing company: ${companyName}`);

            // Rate limit handling: simple delay
            // In a real app, we'd use a token bucket or similar
            await this.sleep(4000); // Wait 4 seconds between requests to be safe

            const prompt = `
        Analyze the following company and internship description to determine if it is a "Good" or "Bad" opportunity for an intern.
        
        Company: ${companyName}
        Description Context: ${description.substring(0, 2000)}...

        Task:
        1. Search for the company to verify its legitimacy and reputation.
        2. Identify the company's website URL.
        3. Estimate the company size (New/Small/Medium/Large).
        4. Determine if it's a well-known brand (like Zomato) or a small/unknown entity (like an individual name).

        Output format:
        **Rating:** [1-10]/10
        **Verdict:** [Good/Bad/Neutral]
        **Company Size:** [New/Small/Medium/Large]
        **Website:** [URL or "Not Found"]
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

    async analyzeInternshipMatch(internshipDetails: any, resumeText: string): Promise<string> {
        if (!this.client) {
            return JSON.stringify({
                matchScore: 0,
                verdict: "AI Disabled",
                summary: "AI analysis disabled (no API key).",
                pros: [],
                cons: []
            });
        }

        try {
            console.log(`Analyzing match for: ${internshipDetails.company}`);

            // Rate limit handling
            await this.sleep(2000);

            const prompt = `
        You are an expert career coach and technical recruiter.
        Compare the candidate's resume with the internship details.

        **Internship Details:**
        - Role: ${internshipDetails.title}
        - Company: ${internshipDetails.company}
        - Description: ${internshipDetails.description.substring(0, 3000)}...
        - Skills Required: ${internshipDetails.skills.join(', ')}

        **Candidate Resume:**
        ${resumeText.substring(0, 5000)}

        **Task:**
        Evaluate how well the candidate's skills and experience match the internship requirements.
      `;

            const matchSchema = z.object({
                matchScore: z.number().describe("A score from 0 to 100 indicating the match quality."),
                verdict: z.enum(["Good Match", "Average Match", "Poor Match"]).describe("The overall verdict of the match."),
                summary: z.string().describe("Brief summary of the fit (max 1 sentence)."),
                pros: z.array(z.string()).describe("List of specific pros based on the comparison. Very short and few"),
                cons: z.array(z.string()).describe("List of specific cons based on the comparison. Very short and few"),
            });

            const response = await this.client.models.generateContent({
                model: "gemini-flash-lite-latest",
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: z.toJSONSchema(matchSchema)
                }
            });

            if (response && response.text) {
                return response.text;
            } else if (response && response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    return candidate.content.parts.map(p => p.text).join(' ');
                }
            }

            return JSON.stringify({
                matchScore: 0,
                verdict: "Error",
                summary: "No analysis generated.",
                pros: [],
                cons: []
            });
        } catch (error: any) {
            console.error(`AI Match Error for ${internshipDetails.company}:`, error.message);
            return JSON.stringify({
                matchScore: 0,
                verdict: "Error",
                summary: `AI analysis failed: ${error.message}`,
                pros: [],
                cons: []
            });
        }
    }
}
