import { load } from "cheerio";
import { IPlugin, InternshipListing, InternshipDetails } from "../interfaces/IPlugin.js";

export class InternShalaPlugin implements IPlugin {
    name = "Internshala";
    private listingPageUrl: string;
    private baseUrl: string;

    constructor(config: { internshipListUrl: string }) {
        this.listingPageUrl = config.internshipListUrl;
        const url = new URL(this.listingPageUrl);
        this.baseUrl = url.protocol + "//" + url.host;
    }

    async fetchListings(): Promise<InternshipListing[]> {
        console.log(`Fetching listing page from: ${this.listingPageUrl}`);
        const response = await fetch(this.listingPageUrl);
        const html = await response.text();
        return this.parseListingPage(html);
    }

    private parseListingPage(html: string): InternshipListing[] {
        const $ = load(html);
        const internships: InternshipListing[] = [];

        const internshipCards = $('.individual_internship');
        console.log(`Found ${internshipCards.length} internship cards.`);

        internshipCards.each((_, element) => {
            const id = $(element).attr('internshipid');

            const titleElement = $(element).find('.job-internship-name a');
            const title = titleElement.text().trim();
            const linkRelative = titleElement.attr('href');
            const link = linkRelative ? this.baseUrl + linkRelative : "";

            const company = $(element).find('.company-name').text().trim();
            const location = $(element).find('.locations a').text().trim();
            const stipend = $(element).find('.stipend').text().trim();

            // Duration is in a row-1-item with a calendar icon
            const duration = $(element).find('.row-1-item').filter((_, el) => $(el).text().includes('Months') || $(el).text().includes('Weeks')).text().trim();

            if (id && title && link) {
                internships.push({
                    id,
                    title,
                    company,
                    location,
                    link,
                    stipend,
                    duration,
                    source: this.name
                });
            } else {
                // console.log(`Skipping internship due to missing fields. ID: ${id}, Title: ${title}, Link: ${link}`);
            }
        });

        return internships;
    }

    async fetchDetails(listing: InternshipListing): Promise<InternshipDetails> {
        try {
            console.log(`Fetching details for ${listing.title} at ${listing.link}`);
            const response = await fetch(listing.link);
            const html = await response.text();
            const $ = load(html);

            const description = $('.text-container').text().trim();
            const skills: string[] = [];
            $('.round_tabs .round_tabs_container span').each((_, el) => {
                skills.push($(el).text().trim());
            });

            const postedAt = $('.status-container .status-inactive').text().trim() || $('.status-container .status-success').text().trim();

            return {
                ...listing,
                description: description.substring(0, 1000) + '...', // Truncate to avoid huge context
                skills,
                postedAt
            };
        } catch (error: any) {
            console.error(`Failed to fetch details for ${listing.link}:`, error.message);
            return {
                ...listing,
                description: "Failed to fetch details.",
                skills: []
            };
        }
    }
}
