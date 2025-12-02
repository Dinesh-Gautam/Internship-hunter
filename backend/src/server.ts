import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { InternShalaPlugin } from './plugins/internshala.js';
import { StorageService } from './services/storage.js';
import { AIService } from './services/ai.js';
import { PluginManager } from './plugin-manager.js';
import { CompanyDetails, Internship, InternshipDetails } from './interfaces/IPlugin.js';

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
        const enrichedInternships = internships.map(internship => {
            const company = storage.getCompanyAnalysis(internship.company);
            return {
                ...internship,
                companyDetails: company?.details,
                companyAnalysis: company?.analysis
            };
        });
        res.json(enrichedInternships);
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

app.post('/api/internships/:id/seen', async (req, res) => {
    try {
        await storage.toggleSeen(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle seen status' });
    }
});

app.delete('/api/internships/:id', async (req, res) => {
    try {
        await storage.deleteInternship(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete internship' });
    }
});


// Resume Upload
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { PDFParse as Pdf } from 'pdf-parse';

// Ensure uploads directory exists
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure Multer
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Rename to resume.pdf (or keep original name and store path)
        // For simplicity, we'll overwrite 'resume.pdf' so we always have one active resume
        const targetPath = path.join('uploads', 'resume.pdf');
        await fs.promises.rename(req.file.path, targetPath);

        console.log('Resume uploaded and saved to', targetPath);
        res.json({ success: true, message: 'Resume uploaded successfully' });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload resume' });
    }
});

app.get('/api/run', async (req, res) => {
    console.log('Starting manual run (SSE)...');

    // SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        sendEvent({ type: 'status', message: 'Fetching listings...' });

        // 0. Load Resume Text if available
        let resumeText = '';
        try {
            const resumePath = path.resolve('uploads/resume.pdf');
            const dataBuffer = await fs.promises.readFile(resumePath);
            const parser = new Pdf({ data: dataBuffer });
            const data = await parser.getText();
            resumeText = data.text;
            console.log('Loaded resume text, length:', resumeText.length);
        } catch (e) {
            console.log('No resume found or failed to parse:', e);
        }

        // 1. Fetch all listings
        const allListings = await pluginManager.fetchAllListings();

        // 2. Filter out processed AND blacklisted
        const newListings = allListings.filter(listing =>
            !storage.isProcessed(listing.id) && !storage.isBlacklisted(listing.company)
        ).slice(0, 3); // Limit to 3 for now

        console.log(`Found ${newListings.length} new internships.`);
        sendEvent({ type: 'status', message: `Found ${newListings.length} new internships to process.` });

        if (newListings.length === 0) {
            sendEvent({ type: 'complete', message: 'No new internships found.' });
            res.end();
            return;
        }

        for (const listing of newListings) {
            console.log(`Processing: ${listing.title} at ${listing.company}`);
            sendEvent({ type: 'status', message: `Analyzing ${listing.company}...` });

            // 1. Fetch Raw Details
            const rawDetails = await pluginManager.fetchDetailsForListing(listing);

            // 2. AI Extraction & Match
            console.log(`Running AI Extraction & Match for ${listing.company}`);
            sendEvent({ type: 'status', message: `Extracting details & matching resume...` });

            if (!rawDetails) {
                sendEvent({ type: 'status', message: `Failed to fetch details for ${listing.company}` });
                continue;
            }

            const aiResult = await aiService.extractAndMatch(rawDetails.meta, rawDetails.description, resumeText);

            const extractedDetails = aiResult?.details || {};
            const matchAnalysis = aiResult?.match;

            // 3. Company Analysis (Grounding)
            let company = storage.getCompanyAnalysis(listing.company);

            if (company) {
                console.log(`Using cached company analysis for ${listing.company}`);
                sendEvent({ type: 'status', message: `Using cached analysis for ${listing.company}...` });
            } else {
                console.log(`Running Company Analysis for ${listing.company}`);

                sendEvent({ type: 'status', message: `Verifying company ${listing.company}...` });

                let companyDetails: CompanyDetails | undefined;
                let companyAnalysis: string | null;

                companyDetails = await pluginManager.fetchCompanyDetails(listing, rawDetails.companyDetailPageUrl) ?? undefined;

                if (!companyDetails) {
                    sendEvent({ type: 'status', message: `Failed to fetch company details for ${listing.company}` });
                }

                companyAnalysis = await aiService.analyzeCompany(listing.company, companyDetails?.location, companyDetails?.about);

                company = {
                    details: companyDetails,
                    analysis: companyAnalysis
                }
                await storage.saveCompanyAnalysis(listing.company, company);
            }

            // 4. Merge & Save
            const enrichedDetails: Internship = {
                ...listing,
                ...extractedDetails,
                companyDetailPageUrl: rawDetails.companyDetailPageUrl,
                matchAnalysis: matchAnalysis,
                seen: false
            };

            await storage.saveInternship(enrichedDetails);

            // Send the new internship to the client
            sendEvent({ type: 'internship', internship: enrichedDetails, company });

            // Polite delay
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        sendEvent({ type: 'complete', message: 'Run completed.' });
    } catch (error: any) {
        console.error('Error during run:', error);
        sendEvent({ type: 'error', message: error.message || 'Unknown error' });
    } finally {
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
