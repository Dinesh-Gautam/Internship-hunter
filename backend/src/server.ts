import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { InternShalaPlugin } from './plugins/internshala.js';
import { NaukriPlugin } from './plugins/naukri.js';
import { StorageService } from './services/storage.js';
import { AiMatch, AIService } from './services/ai.js';
import { PluginManager } from './plugin-manager.js';
import { CompanyDetails, Internship, InternshipDetails } from './interfaces/IPlugin.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { PDFParse as Pdf } from 'pdf-parse';
import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import { generateResumeHtml } from './utils/resumeTemplate.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const CONFIG = {
    internshipListUrl: 'https://internshala.com/internships/work-from-home-backend-development,front-end-development,full-stack-development,javascript-development,node-js-development,software-development,web-development-internships/',

    // internshipListUrl: "https://internshala.com/internships/backend-development,front-end-development,full-stack-development,javascript-development,node-js-development,software-development,web-development-internship/",
    storageFile: 'internships.json'
};

const storage = new StorageService(CONFIG.storageFile);
const aiService = new AIService(process.env.GEMINI_API_KEY);
const pluginManager = new PluginManager();

// Initialize
(async () => {
    await storage.load();
    pluginManager.registerPlugin(new InternShalaPlugin(CONFIG));
    pluginManager.registerPlugin(new NaukriPlugin());
})();

app.get('/api/internships', (req, res) => {
    try {
        const filter = req.query.filter as string || 'all';
        const internships = storage.getInternships();

        const filteredInternships = internships.filter(i => {
            if (filter === 'seen') return i.seen;
            if (filter === 'unseen') return !i.seen;
            return true;
        });

        const enrichedInternships = filteredInternships.map(internship => {
            const company = storage.getCompany(internship.company);
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

app.post('/api/internships/:id/retry-ai', async (req, res) => {
    const { id } = req.params;
    try {
        const internships = storage.getInternships();
        const internship = internships.find(i => i.id === id);

        if (!internship) {
            return res.status(404).json({ error: 'Internship not found' });
        }

        console.log(`Retrying AI for ${internship.company}...`);

        // Load Resume Text
        let resumeText = '';
        try {
            const resumePath = path.resolve('uploads/resume.pdf');
            if (fs.existsSync(resumePath)) {
                const dataBuffer = await fs.promises.readFile(resumePath);
                const parser = new Pdf({ data: dataBuffer });
                const data = await parser.getText();
                resumeText = data.text;
            }
        } catch (e) {
            console.log('No resume found or failed to parse:', e);
        }

        let aiExtractAndMatchResult: AiMatch | undefined;
        let aiCompanyAnalysisResult: string | undefined;

        if (!internship.matchAnalysis) {
            // 1. Re-run Extraction & Match
            aiExtractAndMatchResult = await aiService.extractAndMatch(JSON.stringify(internship), internship.description, resumeText) ?? undefined;
        }

        let existingCompanyData = storage.getCompany(internship.company);

        if (!existingCompanyData && internship.companyDetailPageUrl) {
            console.log(`Company ${internship.company} not found in storage.`);

            const plugin = pluginManager.getPlugin(internship.source);

            if (!plugin) {
                console.warn("Plugin not found for source: " + internship.source);
                return;
            }

            const companyDetails = await plugin.fetchCompanyDetails(internship.companyDetailPageUrl);

            existingCompanyData = {
                details: companyDetails ?? undefined,
            };
        }

        if (!existingCompanyData?.analysis) {
            // 2. Re-run Company Analysis
            const companyDetails = existingCompanyData?.details;

            aiCompanyAnalysisResult = await aiService.analyzeCompany(
                internship.company,
                companyDetails?.location || internship.location,
                companyDetails?.about
            ) ?? undefined;
        }

        // 3. Update Internship
        const internshipToSave: Internship = {
            ...internship,
            ...aiExtractAndMatchResult?.details,
            matchAnalysis: aiExtractAndMatchResult?.match,
        };


        await storage.saveCompany(internship.company, {
            details: existingCompanyData?.details,
            analysis: aiCompanyAnalysisResult
        });

        await storage.saveInternship(internshipToSave);

        // 4. Return Enriched Response
        res.json({ success: true, internship: internshipToSave });

    } catch (error: any) {
        console.error('Retry AI failed:', error);
        res.status(500).json({ error: 'Failed to retry AI analysis' });
    }
});

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
        const targetPath = path.join('uploads', 'resume.pdf');
        await fs.promises.rename(req.file.path, targetPath);

        console.log('Resume uploaded and saved to', targetPath);
        res.json({ success: true, message: 'Resume uploaded successfully' });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload resume' });
    }
});

app.get('/api/resume/status', async (req, res) => {
    try {
        const resumePath = path.resolve('uploads/resume.pdf');
        const exists = await fs.promises.access(resumePath).then(() => true).catch(() => false);
        res.json({ exists });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check resume status' });
    }
});

app.get('/api/presets', (req, res) => {
    try {
        const presets = storage.getPresets();
        res.json(presets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch presets' });
    }
});

app.post('/api/presets', async (req, res) => {
    const { name, urls } = req.body;
    if (!name || !urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'Name and URLs array are required' });
    }
    try {
        await storage.savePreset(name, urls);
        res.json({ success: true, presets: storage.getPresets() });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save preset' });
    }
});

app.delete('/api/presets/:name', async (req, res) => {
    const { name } = req.params;
    try {
        await storage.deletePreset(name);
        res.json({ success: true, presets: storage.getPresets() });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete preset' });
    }
});

app.get('/api/companies', (req, res) => {
    try {
        const companies = storage.getCompanies();
        const blacklist = storage.getBlacklist();
        const internships = storage.getInternships();

        const result = Object.entries(companies).map(([name, data]) => {
            const companyInternships = internships.filter(i => i.company === name);
            return {
                name,
                ...data,
                isBlacklisted: blacklist.includes(name),
                internships: companyInternships
            };
        });

        // Also include companies that have internships but no explicit company record yet (if any)
        // Although the current logic ensures company record creation on run, this is a safety net or just good practice
        // But for now, let's stick to the companies we know about from the companies storage + those in internships if we want to be thorough.
        // Actually, let's just stick to the companies storage for now as it's the source of truth for "Company Management".
        // If a company is in internships but not in companies.json, it might be missed here if we only iterate companies.json.
        // Let's ensure we capture all unique companies from internships too.

        const companiesFromInternships = new Set(internships.map(i => i.company));
        companiesFromInternships.forEach(companyName => {
            if (!companies[companyName]) {
                const companyInternships = internships.filter(i => i.company === companyName);
                result.push({
                    name: companyName,
                    isBlacklisted: blacklist.includes(companyName),
                    internships: companyInternships
                });
            }
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

app.post('/api/companies', async (req, res) => {
    const { name, location, about } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Company name is required' });
    }
    try {
        const existing = storage.getCompany(name);
        const details: CompanyDetails = {
            name,
            location: location || existing?.details?.location || '',
            about: about || existing?.details?.about || '',
            candidatesHired: existing?.details?.candidatesHired || '',
            hiringSince: existing?.details?.hiringSince || '',
            opportunitiesPosted: existing?.details?.opportunitiesPosted || '',
            websiteLink: existing?.details?.websiteLink || '',
            industry: existing?.details?.industry || '',
            size: existing?.details?.size || ''
        };

        await storage.saveCompany(name, {
            details,
            analysis: existing?.analysis
        });

        // Trigger analysis if new
        if (!existing?.analysis) {
            const analysis = await aiService.analyzeCompany(name, details.location, details.about);
            await storage.saveCompany(name, { details, analysis: analysis || undefined });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Error adding company:", error);
        res.status(500).json({ error: 'Failed to add company' });
    }
});

app.post('/api/companies/:name/analysis', async (req, res) => {
    const { name } = req.params;
    try {
        const company = storage.getCompany(name);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const analysis = await aiService.analyzeCompany(name, company.details?.location, company.details?.about);
        await storage.saveCompany(name, { ...company, analysis: analysis || undefined });
        res.json({ success: true, analysis });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate analysis' });
    }
});

app.post('/api/companies/:name/blacklist', async (req, res) => {
    const { name } = req.params;
    try {
        await storage.toggleBlacklist(name);
        res.json({ success: true, isBlacklisted: storage.isBlacklisted(name) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle blacklist' });
    }
});

app.post('/api/extension/analyze', async (req, res) => {
    const { name, location, about, website } = req.body;

    console.log(`Extension requested analysis for: ${name}`);

    if (!name) {
        return res.status(400).json({ error: 'Company name is required' });
    }

    try {
        // 1. Check Cache
        const existing = storage.getCompany(name);
        if (existing?.analysis) {
            console.log(`Cache hit for ${name}`);
            return res.json({ success: true, analysis: existing.analysis, cached: true });
        }

        // 2. Analyze
        // We pass the about text scraped from the page to help the AI
        const analysis = await aiService.analyzeCompany(name, location, about);

        // 3. Save
        const details: CompanyDetails = {
            name,
            location: location || existing?.details?.location || '',
            about: about || existing?.details?.about || '',
            websiteLink: website || existing?.details?.websiteLink || '',
            // Preserve existing fields if any
            candidatesHired: existing?.details?.candidatesHired || '',
            hiringSince: existing?.details?.hiringSince || '',
            opportunitiesPosted: existing?.details?.opportunitiesPosted || '',
            industry: existing?.details?.industry || '',
            size: existing?.details?.size || ''
        };

        if (analysis) {
            await storage.saveCompany(name, {
                details,
                analysis
            });
        }

        res.json({ success: true, analysis: analysis || "Could not generate analysis." });

        res.json({ success: true, analysis: analysis || "Could not generate analysis." });

    } catch (error: any) {
        console.error("Extension Analysis Error:", error);
        res.status(500).json({ error: error.message || 'Failed to analyze company' });
    }
});

app.post('/api/open-file', (req, res) => {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });

    // Sanitize path slightly to ensure it's absolute or allows running
    // For Windows 'start "" "path"'
    const command = `start "" "${filePath}"`;
    exec(command, (error) => {
        if (error) {
            console.error("Error opening file:", error);
            return res.status(500).json({ error: 'Failed to open file' });
        }
        res.json({ success: true });
    });
});

app.post('/api/show-in-folder', (req, res) => {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });

    // Windows explorer /select
    const command = `explorer.exe /select,"${filePath}"`;
    exec(command, (error) => {
        if (error) {
            console.error("Error opening folder:", error);
            return res.status(500).json({ error: 'Failed to open folder' });
        }
        res.json({ success: true });
    });
});

app.post('/api/internships/:id/tailor', async (req, res) => {
    const { id } = req.params;
    try {
        const internships = storage.getInternships();
        const internship = internships.find(i => i.id === id);

        if (!internship) {
            return res.status(404).json({ error: 'Internship not found' });
        }

        console.log(`Tailoring resume for ${internship.company}...`);

        // 1. Get Resume Text
        let resumeText = '';
        const resumePath = path.resolve('uploads/resume.pdf');
        if (fs.existsSync(resumePath)) {
            const dataBuffer = await fs.promises.readFile(resumePath);
            const parser = new Pdf({ data: dataBuffer });
            const data = await parser.getText();
            resumeText = data.text;
        } else {
            return res.status(400).json({ error: 'No resume found (uploads/resume.pdf)' });
        }

        // 2. Describe Internship
        // Use description + about + analysis to give context
        const companyData = storage.getCompany(internship.company);
        const description = `
            Title: ${internship.title}
            Company: ${internship.company}
            Skills: ${internship.skills?.join(', ') || ''}
            Description: ${internship.description || ''}
            About Company: ${companyData?.details?.about || ''}
        `;

        // 3. Generate Structured Resume Data & HTML
        const resumeData = await aiService.tailorResume(description, resumeText);

        if (!resumeData) {
            return res.status(500).json({ error: 'AI failed to generate resume data' });
        }

        const htmlResume = generateResumeHtml(resumeData);

        // 4. Generate PDF
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlResume, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'letter',
            printBackground: true,
            margin: { top: '0cm', right: '0.1cm', bottom: '0.1cm', left: '0.1cm' }
        });
        await browser.close();

        // 5. Save PDF
        const outputDir = path.resolve('tailored_resumes');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // Sanitize filename
        const safeCompany = internship.company.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const safeRole = internship.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const date = new Date().toISOString().split('T')[0];
        const filename = `${safeCompany}_${safeRole}_${date}.pdf`;
        const outputPath = path.join(outputDir, filename);

        await fs.promises.writeFile(outputPath, Buffer.from(pdfBuffer));

        console.log(`Tailored resume saved to: ${outputPath}`);

        res.json({ success: true, filePath: outputPath });

    } catch (error: any) {
        console.error('Tailor resume failed:', error);
        res.status(500).json({ error: 'Failed to tailor resume' });
    }
});


app.get('/api/run', async (req, res) => {
    console.log('Starting manual run (SSE)...');
    const presetName = req.query.preset as string;

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
            if (fs.existsSync(resumePath)) {
                const dataBuffer = await fs.promises.readFile(resumePath);
                const parser = new Pdf({ data: dataBuffer });
                const data = await parser.getText();
                resumeText = data.text;
                console.log('Loaded resume text, length:', resumeText.length);
            }
        } catch (e) {
            console.log('No resume found or failed to parse:', e);
        }

        // 1. Fetch all listings
        let allListings: any[] = [];
        if (presetName) {
            const presets = storage.getPresets();
            const urls = presets[presetName];
            if (urls) {
                console.log(`Using preset: ${presetName} with ${urls.length} URLs`);
                sendEvent({ type: 'status', message: `Using preset: ${presetName}...` });
                allListings = await pluginManager.fetchListingsFromUrls(urls);
            } else {
                sendEvent({ type: 'error', message: `Preset ${presetName} not found.` });
                res.end();
                return;
            }
        } else {
            allListings = await pluginManager.fetchAllListings();
        }

        // 2. Filter out processed AND blacklisted
        const newListings = allListings.filter(listing =>
            !storage.isProcessed(listing.id) && !storage.isBlacklisted(listing.company)
        )

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

            const extractedDetails = aiResult?.details || { description: rawDetails.description };
            const matchAnalysis = aiResult?.match;

            // 3. Company Analysis (Grounding)
            let company = storage.getCompany(listing.company);

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
                    analysis: companyAnalysis || undefined
                }
                await storage.saveCompany(listing.company, company);
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
