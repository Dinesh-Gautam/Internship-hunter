import { AiMatch } from "../services/ai.js";

export interface InternshipListing {
  id: string;
  title: string;
  company: string;
  location: string;
  link: string;
  stipend: string;
  duration: string;
  source: string;
}

export interface InternshipDetails {
  meta: string;
  description: string;
  companyDetailPageUrl: string;
}

export interface CompanyDetails {
  name: string;
  about: string;
  location: string;
  industry?: string;
  size?: string;
  websiteLink?: string;
  opportunitiesPosted?: string;
  candidatesHired?: string;
  hiringSince?: string;
}

export interface Compnay extends savedMetadata {
  details?: CompanyDetails;
  analysis?: string;
}

export interface Internship extends InternshipListing, savedMetadata {
  matchAnalysis?: AiMatch["match"];
  seen: boolean;
  description: string;
  companyDetailPageUrl?: string;
  skills?: string[];
  ppo?: string | null;
  postedOn?: string;
  applyBy?: string;
  locationType?: "Online" | "Hybrid" | "Onsite";
  savedResumeHtml?: string;
  savedResumeData?: any; // serialized ResumeData
}

export interface UserProfile {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  otherLinks?: { label: string; url: string }[];
  globalResumeInstructions?: string;
}

export interface savedMetadata {
  savedOn?: Date;
}

export interface IPlugin {
  name: string;

  /**
   * Checks if the plugin can handle the given URL.
   */
  canHandle(url: string): boolean;

  /**
   * Fetches the list of internships from the source.
   * @param url Optional URL to fetch listings from. If not provided, uses the default configuration.
   */
  fetchListings(url?: string): Promise<InternshipListing[]>;

  /**
   * Fetches the details for a specific internship listing.
   */
  fetchDetails(listing: InternshipListing): Promise<InternshipDetails | null>;

  fetchCompanyDetails(
    companyDetailPageUrl: string
  ): Promise<CompanyDetails | null>;
}
