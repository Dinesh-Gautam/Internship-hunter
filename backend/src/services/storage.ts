import fs from 'fs/promises';
import path from 'path';
import { Compnay, Internship } from '../interfaces/IPlugin.js';


export class StorageService {
    private filePath: string;
    private blacklistPath: string;
    private internships: Internship[] = [];
    private blacklist: string[] = [];
    private loaded = false;
    private companiesPath: string;
    private companies: Record<string, Compnay> = {};

    constructor(filePath?: string) {
        this.filePath = filePath || path.resolve('internships.json');
        this.blacklistPath = path.resolve('blacklist.json');
        this.companiesPath = path.resolve('companies.json');
    }

    async load() {
        try {
            // Load Internships
            try {
                const fileContent = await fs.readFile(this.filePath, 'utf-8');
                this.internships = JSON.parse(fileContent);
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    this.internships = [];
                } else {
                    throw error;
                }
            }

            // Load Blacklist
            try {
                const blacklistContent = await fs.readFile(this.blacklistPath, 'utf-8');
                this.blacklist = JSON.parse(blacklistContent);
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    this.blacklist = [];
                } else {
                    throw error;
                }
            }

            // Load Companies Cache
            try {
                const companiesContent = await fs.readFile(this.companiesPath, 'utf-8');
                this.companies = JSON.parse(companiesContent);
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    this.companies = {};
                } else {
                    throw error;
                }
            }

            this.loaded = true;
            console.log(`Loaded ${this.internships.length} internships, ${this.blacklist.length} blacklisted companies, and ${Object.keys(this.companies).length} cached companies.`);
        } catch (error) {
            console.error('Error loading storage:', error);
            throw error;
        }
    }

    isProcessed(id: string): boolean {
        if (!this.loaded) throw new Error('Storage not loaded. Call load() first.');
        return this.internships.some(item => item.id === id);
    }

    isBlacklisted(company: string): boolean {
        if (!this.loaded) throw new Error('Storage not loaded. Call load() first.');
        return this.blacklist.includes(company);
    }

    getCompanyAnalysis(company: string) {
        if (!this.loaded) throw new Error('Storage not loaded. Call load() first.');
        return this.companies[company];
    }

    async saveCompanyAnalysis(company: string, data: Compnay) {
        if (!this.loaded) await this.load();
        this.companies[company] = { ...data, savedOn: new Date() };
        await fs.writeFile(this.companiesPath, JSON.stringify(this.companies, null, 2), 'utf-8');
    }

    async saveInternship(internship: Internship) {
        if (!this.loaded) await this.load();

        if (!this.isProcessed(internship.id)) {
            // Add 'seen' property default to false
            const newInternship = { ...internship, seen: false, savedOn: new Date() };
            this.internships.push(newInternship);
            await fs.writeFile(this.filePath, JSON.stringify(this.internships, null, 2), 'utf-8');
            console.log(`Saved internship: ${internship.title}`);
        }
    }

    async toggleBlacklist(company: string) {
        if (!this.loaded) await this.load();

        if (this.blacklist.includes(company)) {
            this.blacklist = this.blacklist.filter(c => c !== company);
            console.log(`Removed ${company} from blacklist.`);
        } else {
            this.blacklist.push(company);
            console.log(`Added ${company} to blacklist.`);
        }
        await fs.writeFile(this.blacklistPath, JSON.stringify(this.blacklist, null, 2), 'utf-8');
    }

    async toggleSeen(id: string) {
        if (!this.loaded) await this.load();
        const internship = this.internships.find(item => item.id === id);
        if (internship) {
            internship.seen = !internship.seen;
            await fs.writeFile(this.filePath, JSON.stringify(this.internships, null, 2), 'utf-8');
            console.log(`Toggled seen for ${id} to ${internship.seen}`);
        }
    }

    async deleteInternship(id: string) {
        if (!this.loaded) await this.load();
        const initialLength = this.internships.length;
        this.internships = this.internships.filter(item => item.id !== id);
        if (this.internships.length !== initialLength) {
            await fs.writeFile(this.filePath, JSON.stringify(this.internships, null, 2), 'utf-8');
            console.log(`Deleted internship ${id}`);
        }
    }

    getInternships() {
        if (!this.loaded) throw new Error('Storage not loaded.');
        // Return internships that are NOT from blacklisted companies
        // Sort by newest first (reverse order of insertion)
        return this.internships
            .filter(item => !this.blacklist.includes(item.company))
            .reverse();
    }

    getBlacklist() {
        if (!this.loaded) throw new Error('Storage not loaded.');
        return this.blacklist;
    }
}
