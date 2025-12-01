import fs from 'fs/promises';
import path from 'path';
import { InternshipDetails } from '../interfaces/IPlugin.js';

export class StorageService {
    private filePath: string;
    private blacklistPath: string;
    private data: InternshipDetails[] = [];
    private blacklist: string[] = [];
    private loaded = false;

    constructor(filePath?: string) {
        this.filePath = filePath || path.resolve('internships.json');
        this.blacklistPath = path.resolve('blacklist.json');
    }

    async load() {
        try {
            // Load Internships
            try {
                const fileContent = await fs.readFile(this.filePath, 'utf-8');
                this.data = JSON.parse(fileContent);
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    this.data = [];
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

            this.loaded = true;
            console.log(`Loaded ${this.data.length} internships and ${this.blacklist.length} blacklisted companies.`);
        } catch (error) {
            console.error('Error loading storage:', error);
            throw error;
        }
    }

    isProcessed(id: string): boolean {
        if (!this.loaded) throw new Error('Storage not loaded. Call load() first.');
        return this.data.some(item => item.id === id);
    }

    isBlacklisted(company: string): boolean {
        if (!this.loaded) throw new Error('Storage not loaded. Call load() first.');
        return this.blacklist.includes(company);
    }

    async saveInternship(internship: InternshipDetails) {
        if (!this.loaded) await this.load();

        if (!this.isProcessed(internship.id)) {
            this.data.push(internship);
            await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
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

    getInternships() {
        if (!this.loaded) throw new Error('Storage not loaded.');
        // Return internships that are NOT from blacklisted companies
        return this.data.filter(item => !this.blacklist.includes(item.company));
    }

    getBlacklist() {
        if (!this.loaded) throw new Error('Storage not loaded.');
        return this.blacklist;
    }
}
