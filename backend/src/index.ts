import 'dotenv/config';
import { InternShalaPlugin } from './plugins/internshala.js';
import { StorageService } from './services/storage.js';
import { AIService } from './services/ai.js';
import { PluginManager } from './plugin-manager.js';
import { InternshipDetails } from './interfaces/IPlugin.js';

const CONFIG = {
    internshipListUrl: 'https://internshala.com/internships/work-from-home-backend-development,front-end-development,full-stack-development,javascript-development,node-js-development,software-development,web-development-internships/',
    storageFile: 'internships.json'
};

async function main() {
    console.log('Starting Internship Hunter (TypeScript)...');

    const storage = new StorageService(CONFIG.storageFile);
    await storage.load();

    const aiService = new AIService(process.env.GEMINI_API_KEY);
    const pluginManager = new PluginManager();

    // Register Plugins
    pluginManager.registerPlugin(new InternShalaPlugin(CONFIG));

    // 1. Fetch all listings from all plugins
    const allListings = await pluginManager.fetchAllListings();

    // 2. Filter out already processed internships
    const newListings = allListings.filter(listing => !storage.isProcessed(listing.id))
        // temp limiting to 3 listing
        .slice(0, 3);
    console.log(`Found ${newListings.length} new internships to process.`);

    // 3. Process each new listing
    for (const listing of newListings) {
        console.log(`Processing: ${listing.title} at ${listing.company}`);

        // a. Fetch details
        const details: InternshipDetails = await pluginManager.fetchDetailsForListing(listing);

        // b. Enrich with AI Analysis
        const analysis = await aiService.analyzeCompany(details.company, details.description);

        // Attach analysis to the details object (extending the type dynamically or adding a field)
        // For now, we'll just append it to the description or log it
        // Ideally, we update the interface to include 'aiAnalysis'
        const enrichedDetails = {
            ...details,
            aiAnalysis: analysis
        };

        console.log(`AI Verdict: ${analysis.split('\n')[1] || 'N/A'}`); // Log the verdict line

        // c. Save immediately
        await storage.saveInternship(enrichedDetails);

        // Polite delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('All done!');
}

main().catch(console.error);
