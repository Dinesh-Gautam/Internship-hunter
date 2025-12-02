import { load } from "cheerio";
import { IPlugin, InternshipListing, InternshipDetails, CompanyDetails } from "../interfaces/IPlugin.js";

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

    async fetchDetails(listing: InternshipListing): Promise<InternshipDetails | null> {

        try {
            console.log(`Fetching details for ${listing.title} at ${listing.link}`);

            const response = await fetch(listing.link);
            const html = await response.text();
            const $ = load(html);

            const companyDetailPageUrl = $('.internship_meta .company .company_name a').attr('href')!;

            /**
             * Contains duration, location, stipend, etc.
             */
            const meta = $('.internship_meta').text().trim();
            /**
             * contains about internship, skills required, who can apply, other requirements, perks, stipend breakdown, job offer, copmany summary, etc.
             */
            const description = $(".internship_details").text().trim();

            const cleandDescription = description.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n');
            const cleanedMeta = meta.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n');

            return {
                description: cleandDescription,
                companyDetailPageUrl,
                meta: cleanedMeta
            };
        } catch (error: any) {
            console.error(`Failed to fetch details for ${listing.link}:`, error.message);
            return null;
        }
    }

    async fetchCompanyDetails(companyDetailPageUrl: string): Promise<CompanyDetails | null> {
        if (!companyDetailPageUrl.includes(this.baseUrl))
            companyDetailPageUrl = this.baseUrl + companyDetailPageUrl;
        try {
            console.log(`Fetching company details for ${companyDetailPageUrl}`);
            const response = await fetch(companyDetailPageUrl);
            const html = await response.text();
            const $ = load(html);

            const container = $('.overview-container');

            const getValueByTitle = (titleText: string): string => {
                let foundValue = "";
                container.find('.highlight').each((_, el) => {
                    const nameEl = $(el).find('.info .name');
                    const titleEl = nameEl.find('.title');
                    // Get text from .title if it exists, otherwise from .name
                    // We use .text() which concatenates all descendants. 
                    // For "Hiring since", it has spans, but .text() will get "Hiring since".
                    const label = titleEl.length ? titleEl.text().trim() : nameEl.text().trim();

                    if (label.toLowerCase().includes(titleText.toLowerCase())) {
                        foundValue = $(el).find('.info .value').text().trim();
                        return false; // break loop
                    }
                });
                return foundValue;
            };

            const name = container.find('.about-container h2').text().replace(/^About\s+/i, '').trim();
            const about = container.find('.about-container p').text().trim();

            // Attempt to find website link. It might be outside the overview container or not present in the snippet.
            // We'll try a generic selector or the old one if it still exists elsewhere on the page.
            const websiteLink = $('.company_website').attr('href') || $('.website-link').attr('href');

            const companyInfo: CompanyDetails = {
                name: name,
                about: about,
                location: getValueByTitle('Location'),
                industry: getValueByTitle('Industry'),
                size: getValueByTitle('Employee count'),
                opportunitiesPosted: getValueByTitle('Opportunities posted'),
                candidatesHired: getValueByTitle('Candidates hired'),
                hiringSince: getValueByTitle('Hiring Since'),
                websiteLink: websiteLink,
            };
            return companyInfo;
        } catch (error: any) {
            console.error(`Failed to fetch company details for ${companyDetailPageUrl}:`, error.message);
            return null;
        }
    }

}
