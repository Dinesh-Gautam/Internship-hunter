import { GoogleGenAI } from "@google/genai";

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
        Description Context: ${description.substring(0, 500)}...

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
}
