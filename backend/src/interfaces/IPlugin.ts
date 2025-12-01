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

export interface InternshipDetails extends InternshipListing {
    description: string;
    skills: string[];
    postedAt?: string;
    aiAnalysis?: string;
    companyWebsite?: string;
    seen?: boolean;
    aiMatch?: {
        score: number;
        verdict: string;
        summary: string;
        pros: string[];
        cons: string[];
    };
}

export interface IPlugin {
    name: string;

    /**
     * Fetches the list of internships from the source.
     */
    fetchListings(): Promise<InternshipListing[]>;

    /**
     * Fetches the details for a specific internship listing.
     */
    fetchDetails(listing: InternshipListing): Promise<InternshipDetails>;
}
