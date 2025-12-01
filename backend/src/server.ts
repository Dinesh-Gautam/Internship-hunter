import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { InternShalaPlugin } from './plugins/internshala.js';
import { StorageService } from './services/storage.js';
import { AIService } from './services/ai.js';
import { PluginManager } from './plugin-manager.js';
import { InternshipDetails } from './interfaces/IPlugin.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const CONFIG = {
    internshipListUrl: 'https://internshala.com/internships/work-from-home-backend-development,front-end-development,full-stack-development,javascript-development,node-js-development,software-development,web-development-internships/',
    storageFile: 'internships.json'
};

const storage = new StorageService(CONFIG.storageFile);
const aiService = new AIService(process.env.GEMINI_API_KEY);
const pluginManager = new PluginManager();

// Initialize
(async () => {
    await storage.load();
    pluginManager.registerPlugin(new InternShalaPlugin(CONFIG));
})();

app.get('/api/internships', (req, res) => {
    try {
        const internships = storage.getInternships();
        res.json(internships);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch internships' });
    }
});

app.get('/api/blacklist', (req, res) => {
    try {
        const blacklist = storage.getBlacklist();
        res.json(blacklist);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blacklist' });
    }
});

app.post('/api/blacklist', async (req, res) => {
    const { company } = req.body;
    if (!company) {
        return res.status(400).json({ error: 'Company name is required' });
    }
    try {
        await storage.toggleBlacklist(company);
        res.json({ success: true, blacklist: storage.getBlacklist() });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update blacklist' });
    }
});

app.post('/api/run', async (req, res) => {
    console.log('Starting manual run...');
    res.json({ message: 'Scraping started', status: 'running' }); // Respond immediately

    try {
        // 1. Fetch all listings
        const allListings = await pluginManager.fetchAllListings();

        // 2. Filter out processed AND blacklisted
        const newListings = allListings.filter(listing =>
            !storage.isProcessed(listing.id) && !storage.isBlacklisted(listing.company)
        ).slice(0, 3); // Limit to 3 for now

        console.log(`Found ${newListings.length} new internships.`);

        for (const listing of newListings) {
            console.log(`Processing: ${listing.title} at ${listing.company}`);
            const details: InternshipDetails = await pluginManager.fetchDetailsForListing(listing);
            const analysis = await aiService.analyzeCompany(details.company, details.description);

            const enrichedDetails = { ...details, aiAnalysis: analysis };
            await storage.saveInternship(enrichedDetails);

            // Polite delay
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log('Run completed.');
    } catch (error) {
        console.error('Error during run:', error);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
