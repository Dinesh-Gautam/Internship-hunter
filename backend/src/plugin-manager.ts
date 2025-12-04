import { IPlugin, InternshipListing, InternshipDetails, CompanyDetails } from './interfaces/IPlugin.js';

export class PluginManager {
    private plugins: IPlugin[] = [];

    constructor() { }

    registerPlugin(plugin: IPlugin) {
        this.plugins.push(plugin);
        console.log(`Registered plugin: ${plugin.name}`);
    }

    getPlugin(source: string): IPlugin | undefined {
        return this.plugins.find(p => p.name === source);
    }

    async fetchAllListings(): Promise<InternshipListing[]> {
        console.log("Fetching listings from all plugins...");
        const allListings: InternshipListing[] = [];

        for (const plugin of this.plugins) {
            try {
                console.log(`Running plugin: ${plugin.name}`);
                const listings = await plugin.fetchListings();
                console.log(`Plugin ${plugin.name} found ${listings.length} listings.`);
                allListings.push(...listings);
            } catch (error) {
                console.error(`Error in plugin ${plugin.name}:`, error);
            }
        }

        return allListings;
    }

    async fetchDetailsForListing(listing: InternshipListing): Promise<InternshipDetails | null> {
        const plugin = this.plugins.find(p => p.name === listing.source);
        if (!plugin) {
            throw new Error(`No plugin found for source: ${listing.source}`);
        }
        return plugin.fetchDetails(listing);
    }

    async fetchCompanyDetails(listing: InternshipListing, companyDetailPageUrl: string): Promise<CompanyDetails | null> {
        const plugin = this.plugins.find(p => p.name === listing.source);
        if (!plugin) {
            throw new Error(`No plugin found for source: ${listing.source}`);
        }

        return plugin.fetchCompanyDetails(companyDetailPageUrl);
    }
}
