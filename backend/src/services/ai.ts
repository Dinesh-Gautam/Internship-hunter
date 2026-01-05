import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { Internship } from "../interfaces/IPlugin.js";

const AiMatchSchema = z.object({
  score: z.number().describe("Score between 0 and 100"),
  verdict: z
    .enum(["Good Match", "Average Match", "Poor Match", "No Resume"])
    .describe("Verdict of the match"),
  summary: z.string().describe("One sentence short Summary of the match"),
  pros: z.array(z.string()).describe("Very short points, Pros of the match"),
  cons: z.array(z.string()).describe("Very short points, Cons of the match"),
});

const AiExtractAndMatchSchema = z.object({
  details: z.object({
    description: z
      .string()
      .describe("descript of the internship in proper markdown"),
    stipend: z.string(),
    company: z.string(),
    location: z.string().describe("City, State or Country"),
    locationType: z
      .enum(["Online", "Hybrid", "Onsite"])
      .describe("Type of internship"),
    duration: z.string(),
    ppo: z.string().describe("write about ppo").optional().nullable(),
    skills: z.array(z.string()),
    applyBy: z.string(),
    postedOn: z.string().describe("Date of posting the internship"),
  }),
  match: AiMatchSchema,
});

export type AiMatch = z.infer<typeof AiExtractAndMatchSchema>;

export const ResumeSchema = z.object({
  fullName: z.string(),
  contact: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    linkedin: z.string().describe("URL to the candidate's LinkedIn profile"),
    github: z.string().describe("URL to the candidate's GitHub profile"),
    portfolio: z.string().optional(),
    location: z.string().optional(),
  }),
  summary: z.string().describe("A professional summary tailored to the job"),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      location: z.string().optional(),
      date: z.string(),
      details: z.array(z.string()).optional(),
    })
  ),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      location: z.string().optional(),
      date: z.string(),
      details: z
        .array(z.string())
        .describe("Action-oriented bullet points tailored to the job"),
    })
  ),
  projects: z
    .array(
      z.object({
        name: z.string(),
        link: z.string().describe("URL to the project or PR"),
        technologies: z.string().optional(),
        date: z.string().optional(),
        details: z.array(z.string()),
      })
    )
    .optional(),
  openSource: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().optional().describe("Contributor, Maintainer, etc."),
        link: z.string(),
        details: z.array(z.string()),
      })
    )
    .optional(),
  skills: z.object({
    languages: z.array(z.string()).optional(),
    frameworks: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
    softSkills: z.array(z.string()).optional(),
  }),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string(),
        date: z.string().optional(),
      })
    )
    .optional(),
});

export type ResumeData = z.infer<typeof ResumeSchema>;

export class AIService {
  private client: GoogleGenAI | null;
  private modelName = "gemini-flash-latest";
  private apiKeys: string[] = [];
  private currentKeyIndex = 0;

  constructor(apiKey: string | undefined) {
    if (!apiKey) {
      console.warn(
        "Warning: GEMINI_API_KEY is not set. AI features will be disabled."
      );
      this.client = null;
    } else {
      this.apiKeys = apiKey
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      console.log(
        `AI Service initialized with ${this.apiKeys.length} keys.`,
        this.apiKeys
      );
      if (this.apiKeys.length > 0) {
        this.client = new GoogleGenAI({ apiKey: this.apiKeys[0] });
        console.log(
          `AI Service initialized with ${this.apiKeys.length} keys. Using key index 0.`
        );
      } else {
        console.warn(
          "Warning: GEMINI_API_KEY provided but contains no valid keys."
        );
        this.client = null;
      }
    }
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private rotateApiKey() {
    if (this.apiKeys.length <= 1) {
      return;
    }

    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    const newKey = this.apiKeys[this.currentKeyIndex];
    console.log(
      `Rotating API Key due to rate limit. Switching to key index ${this.currentKeyIndex} with: ${newKey}`
    );
    this.client = new GoogleGenAI({ apiKey: newKey });
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 2000
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (retries <= 0) throw error;
      console.warn(
        `AI Service Error (${error.message}). Retrying in ${delay}ms... (${retries} attempts left)`
      );
      const isRateLimit =
        error.status === 429 ||
        error.code === 429 ||
        (error.message && error.message.includes("429"));

      const isServiceUnavailable =
        error.status === 503 ||
        error.code === 503 ||
        (error.message && error.message.includes("503"));

      const isRetryable = isRateLimit || isServiceUnavailable;

      if (isRetryable) {
        // If it's a rate limit error (429), rotate the API key immediately
        if (isRateLimit) {
          this.rotateApiKey();
        }

        await this.sleep(delay);
        return this.retryOperation(operation, retries - 1, delay * 2);
      }

      throw error;
    }
  }

  async analyzeCompany(
    companyName: string,
    location?: string,
    about?: string
  ): Promise<string | null> {
    if (!this.client) {
      return null;
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

        // NOTE: the above ' about ' is provided by the company. DO NOT TRUST THE ABOVE INFORMATION

        Task:
        1. Search for the company to verify its legitimacy and reputation.
        2. Identify the company's website URL.
        3. Estimate the company size (New/Small/Medium/Large).
        4. Determine if it's a well-known brand (like Zomato) or a small/unknown entity (like an individual name).
        5. Search for the typical salary range for entry-level positions at this company for software/frontend/fullstack developer.

        Output format in tabular format:
        **Rating:** [1-10]/10
        **Verdict:** [Good/Bad/Neutral]
        **Company Size:** [New/Small/Medium/Large]
        **Salary Range:** [Estimated Range or "Unknown"]
        **Website:** [URL in proper markdown format or "Not Found"]
        **Legitimacy:** [Verified/Unverified/Suspicious]
        **Summary:** [2 sentences on why]
        **Pros:** [List 1-2]
        **Cons:** [List 1-2]
      `;

      return await this.retryOperation(async () => {
        // Always access this.client inside the closure to pick up the updated client after rotation
        if (!this.client) throw new Error("Client initialization failed");

        console.log(`Using API Key: ${this.apiKeys[this.currentKeyIndex]}`);
        const response = await this.client.models.generateContent({
          model: this.modelName,
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        if (response && response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (
            candidate.content &&
            candidate.content.parts &&
            candidate.content.parts.length > 0
          ) {
            return candidate.content.parts.map((p) => p.text).join(" ");
          }
        }
        return "No analysis generated.";
      });
    } catch (error: any) {
      console.error(`AI Error for ${companyName}:`, error.message);
      return null;
    }
  }

  async extractAndMatch(
    meta: string,
    description: string,
    resumeText: string
  ): Promise<AiMatch | null> {
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
        - description: markdown format (make important words bold, iclude important things e.g(other requirements, perks, stipend structure etc.), try to compress the description, preserve important information ).
        - stipend: Exact string found.
        - skills: Array of strings.

        **Matching Rules:**
        - matchScore: 0-100.
        - verdict: "Good Match", "Average Match", "Poor Match", "No Resume".
        - summary: 1 sentence.
        - pros/cons: Short lists with short points.
      `;

      return await this.retryOperation(async () => {
        if (!this.client) throw new Error("Client initialization failed");

        const response = await this.client.models.generateContent({
          model: "gemini-flash-lite-latest",
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(AiExtractAndMatchSchema),
          },
        });

        if (response && response.text) {
          return JSON.parse(response.text);
        } else if (
          response &&
          response.candidates &&
          response.candidates.length > 0
        ) {
          const candidate = response.candidates[0];
          if (
            candidate.content &&
            candidate.content.parts &&
            candidate.content.parts.length > 0
          ) {
            const text = candidate.content.parts.map((p) => p.text).join(" ");
            return JSON.parse(text);
          }
        }
        return null;
      });
    } catch (error: any) {
      console.error(`AI Extraction/Match Error:`, error.message);
      return null;
    }
  }

  async matchInternshipWithResume(
    internship: Internship,
    resumeText: string
  ): Promise<AiMatch["match"] | null> {
    if (!this.client) {
      return null;
    }

    try {
      console.log("Matching details...");

      // Rate limit handling
      await this.sleep(2000);

      const prompt = `
        You are an expert career coach and your task is to match the internship with the candidate's resume.
        
        **Input Text (Internship Page):**
        ${Object.entries(internship)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")}

        **Candidate Resume:**
        ${resumeText ? resumeText.substring(0, 10000) : "No resume provided."}
      `;

      return await this.retryOperation(async () => {
        if (!this.client) throw new Error("Client initialization failed");

        const response = await this.client.models.generateContent({
          model: "gemini-flash-lite-latest",
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(AiMatchSchema),
          },
        });

        if (response && response.text) {
          return JSON.parse(response.text);
        } else if (
          response &&
          response.candidates &&
          response.candidates.length > 0
        ) {
          const candidate = response.candidates[0];
          if (
            candidate.content &&
            candidate.content.parts &&
            candidate.content.parts.length > 0
          ) {
            const text = candidate.content.parts.map((p) => p.text).join(" ");
            return JSON.parse(text);
          }
        }
        return null;
      });
    } catch (error: any) {
      console.error(`AI Extraction/Match Error:`, error.message);
      return null;
    }
  }

  async tailorResume(
    internshipDescription: string,
    resumeText: string,
    userProfile?: {
      email?: string;
      phone?: string;
      location?: string;
      linkedin?: string;
      github?: string;
      portfolio?: string;
      globalResumeInstructions?: string;
    },
    additionalInfo?: string
  ): Promise<ResumeData | null> {
    if (!this.client) {
      return null;
    }

    try {
      console.log("Tailoring resume (structured)...");
      // Rate limit handling
      await this.sleep(4000);

      // --- REDACTION LOGIC ---
      let safeResumeText = resumeText;

      // 1. Redact Email
      safeResumeText = safeResumeText.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        "[EMAIL_REDACTED]"
      );

      // 2. Redact Phone (Generic matcher for 10+ digits or common formats)
      // Matches: (123) 456-7890, 123-456-7890, 123 456 7890, +91 1234567890
      safeResumeText = safeResumeText.replace(
        /(?:(?:\+|00)[\d]{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
        "[PHONE_REDACTED]"
      );

      // 3. Redact Links (Linkedin, Github, others) to prevent AI from scraping them if user wants privacy
      // We will inject the user-provided ones later.
      safeResumeText = safeResumeText.replace(
        /https?:\/\/(www\.)?linkedin\.com\/[^\s]*/g,
        "[LINKEDIN_REDACTED]"
      );
      safeResumeText = safeResumeText.replace(
        /https?:\/\/(www\.)?github\.com\/[^\s]*/g,
        "[GITHUB_REDACTED]"
      );
      // Note: We don't blindly redact all links as project links might be needed for context,
      // but user mentioned "project links" too. Let's redact generic URLs if they look personal?
      // For now, let's trust the specific redactions and maybe a general one if safe.
      // User asked to hide "project links".
      safeResumeText = safeResumeText.replace(
        /https?:\/\/[^\s]+/g,
        "[LINK_REDACTED]"
      );

      const prompt = `
        You are an expert career coach and ATS (Applicant Tracking System) optimizer.
        Your goal is to rewrite the candidate's resume to strictly match the provided internship description, adhering to high-frequency trading/FAANG resume standards (clean, concise, metrics-driven).

        **Internship Description:**
        ${internshipDescription.substring(0, 5000)}

        **Candidate Resume (Redacted for Privacy):**
        ${safeResumeText.substring(0, 10000)}

        ${
          additionalInfo
            ? `**Additional Context/Instructions from Candidate:**
        ${additionalInfo}
        (Use the above information to enrich the resume, add specific project links, or emphasize certain skills/experiences as requested.)`
            : ""
        }

        ${
          userProfile?.globalResumeInstructions
            ? `**Global Resume Instructions (Apply to ALL applications):**
        ${userProfile.globalResumeInstructions}`
            : ""
        }

        **Transformation Rules (Strict Adherence Required):**


        1.  **General Tone & Formatting:**
            -   **No Buzzwords**: Do NOT use generic terms like "hardworking", "team player", "passionate". Show, don't tell.
            -   **Conciseness**: Aim for a density of information that fits a single-page resume.
            -   **Format & Highlight**: Use markdown bolding (e.g. **keyword**) to highlight key technologies, metrics/numbers, and impact.
            -   **Relevant Info Only**: Prioritize skills/hobbies relevant to Software Engineering. Do NOT remove valid information unless completely irrelevant.

        2.  **Professional Summary (Tailored for ATS):**
            -   Write exactly **1-2 sentences**.
            -   Integrate keywords from the Job Description naturally.
            -   Highlight top 2-3 relevant technical skills.
            -   **CRITICAL**: Mention years of experience **ONLY** if the candidate explicitly states them in the resume. **DO NOT calculate or round up** durations (e.g., do not turn 6 months into "1 year+"). If unsure, omit experience years.
            -   *Forbidden*: Do NOT mention the specific company name or specifically say "Seeking a role at X". Focus on what the candidate *offers*.

        3.  **Skills (Specialized & Ordered):**
            -   **Specific**: Avoid generic "Web Development"; use "React, TypeScript, Node.js".
            -   **Prioritize**: Place the most relevant skills for this job at the VERY TOP of the list.
            -   **No Bloat**: Remove outdated or irrelevant technologies not requested by the JD unless they show foundational strength.

        4.  **Experience & Projects (Metrics & Tech-Heavy):**
            -   **Bullet Limit**: Strictly **2-3 bullets** per role/project.
            -   **Structure**: Start with a strong action verb -> details of the task -> **specific technologies used** -> **quantifiable result/metric**.
            -   *Example*: "Engineered a real-time chat service using **Socket.io** and **Redis**, reducing message latency by **40%** for 10k+ concurrent users."
            -   **Daily Application**: Explicitly mention the tools/languages used effectively within the bullet point context.
            -   **DATA INTEGRITY**: **DO NOT** invent dates, roles, or durations. Use exactly what is in the resume. **DO NOT** add projects that do not exist.
            -   *Projects*: If the candidate lacks work experience, treat their best Projects as Experience, applying the same rigor.
            -   **Dates**: Ensure month/year format if generating dates (though primarily parsing).

        5.  **Education:**
            -   Include relevant coursework or specialized achievements (Hackathons, Club Leadership).
            -   **Exclude** generic "school projects" unless they are complex.

        6.  **Redaction Handling:**
            -   Do not hallucinate contact info. Use the provided placeholders (e.g., [EMAIL_REDACTED]) or leave fields empty if missing.
            -   Links: Preserve [LINK_REDACTED] or existing URLs. Only include links if they seem high-quality (GitHub, Portfolios).

        **Data Output Reference:**
        -   Return strictly structure JSON conforming to the schema.
      `;

      return await this.retryOperation(async () => {
        if (!this.client) throw new Error("Client initialization failed");

        const response = await this.client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(ResumeSchema),
          },
        });

        let data: ResumeData | null = null;

        if (response && response.text) {
          data = JSON.parse(response.text);
        } else if (response?.candidates?.[0]?.content?.parts?.[0]) {
          const text = response.candidates[0].content.parts
            .map((p) => p.text)
            .join(" ");
          data = JSON.parse(text);
        }

        if (data) {
          // --- INJECTION LOGIC ---
          // Overwrite contact details with user profile settings
          if (!data.contact) data.contact = { linkedin: "", github: "" }; // Ensure contact object exists

          if (userProfile?.email) data.contact.email = userProfile.email;
          if (userProfile?.phone) data.contact.phone = userProfile.phone;
          if (userProfile?.location)
            data.contact.location = userProfile.location;
          if (userProfile?.linkedin)
            data.contact.linkedin = userProfile.linkedin;
          if (userProfile?.github) data.contact.github = userProfile.github;
          if (userProfile?.portfolio)
            data.contact.portfolio = userProfile.portfolio;

          // If redacted placeholders remain and no user profile data, they might show up.
          // Ideally user provides data in Profile Settings.
        }

        return data;
      });
    } catch (error: any) {
      console.error("Error tailoring resume:", error);
      throw error;
    }
  }
}
