import { IPlugin, InternshipListing, InternshipDetails, CompanyDetails } from "../interfaces/IPlugin.js";
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export class NaukriPlugin implements IPlugin {
    name = "naukri";
    private _temp = {} as Record<string, any>;

    canHandle(url: string): boolean {
        return url.includes("naukri.com");
    }

    async fetchListings(url: string): Promise<InternshipListing[]> {
        const browser = await puppeteer.launch({
            headless: true,
        });
        const page = await browser.newPage();
        let listings: InternshipListing[] | null = null;

        try {
            await page.setRequestInterception(true);

            page.on('request', (request) => {
                if (request.url().includes('jobapi/v3/search')) {
                    const urlObj = new URL(request.url());
                    urlObj.searchParams.set('noOfResults', '20');

                    request.continue({
                        url: urlObj.toString()
                    });
                } else {
                    request.continue();
                }
            });

            page.on('response', async (response) => {
                if (response.url().includes('jobapi/v3/search')) {
                    try {
                        const json = await response.json();
                        const jobs = json.jobDetails || [];

                        for (const job of jobs) {
                            if (!listings) listings = [];

                            listings.push({
                                id: job.jobId,
                                title: job.title,
                                company: job.companyName,
                                location: job.placeholders?.find((p: any) => p.type === 'location')?.label || 'Unknown',
                                link: `https://www.naukri.com${job.jdURL}`,
                                stipend: job.placeholders?.find((p: any) => p.type === 'salary')?.label || 'Not disclosed',
                                duration: job.placeholders?.find((p: any) => p.type === 'duration')?.label || 'Unknown',
                                source: 'naukri'
                            });
                        }
                    } catch (e) {
                        console.error("Error parsing Naukri response:", e);
                    }
                }
            });

            // Navigate to a page that triggers the search. 
            const targetUrl = url || 'https://www.naukri.com/internship-jobs?k=internship';

            await page.goto(targetUrl, { waitUntil: 'load' });

            // Wait a bit to ensure the request is captured
            await waitFor(() => Boolean(listings));

        } catch (error) {
            console.error("Error in Naukri fetchListings:", error);
        } finally {
            await browser.close();
        }

        return listings ?? [];
    }

    async fetchDetails(listing: InternshipListing): Promise<InternshipDetails | null> {
        const browser = await puppeteer.launch({
            headless: true,
        });
        const page = await browser.newPage();
        let details: InternshipDetails | null = null;

        try {
            await page.setRequestInterception(true);

            page.on('request', (request) => {
                request.continue();
            });

            page.on('response', async (response) => {
                // The URL pattern seems to be .../jobapi/v4/job/<jobId>?...
                if (response.url().includes('jobapi/v4/job')) {
                    try {
                        const json = await response.json();
                        if (json && json.jobDetails) {
                            const jd = json.jobDetails;

                            // Extract company page URL
                            let companyUrl;
                            if (jd.companyPageUrl) {
                                companyUrl = `https://www.naukri.com/${jd.companyPageUrl}`;
                            } else {
                                // temp store compnay info
                                this._temp[jd.companyId] = jd;
                            }

                            details = {
                                meta: "",
                                description: JSON.stringify(jd),
                                companyDetailPageUrl: companyUrl ?? `__internal__/${jd.companyId}`,
                            };
                        }
                    } catch (e) {
                        console.error("Error parsing Naukri details response:", e);
                    }
                }
            });

            await page.goto(listing.link, { waitUntil: 'load' });

            await waitFor(() => details !== null);

        } catch (error) {
            console.error("Error in Naukri fetchDetails:", error);
        } finally {
            await browser.close();
        }

        return details;
    }

    async fetchCompanyDetails(companyDetailPageUrl: string): Promise<CompanyDetails | null> {
        // check if it internal
        if (companyDetailPageUrl.startsWith("__internal__/")) {
            const companyId = companyDetailPageUrl.split("/")[1];
            const company = { ...this._temp[companyId] };
            // delete company from temp
            if (company) {
                delete this._temp[companyId];
                const c = company.companyDetail
                return {
                    name: c?.name || "",
                    about: c?.details || "",
                    location: c?.address || "",
                };
            } else {
                return null
            }
        }

        // Puppeteer logic for external URLs
        const browser = await puppeteer.launch({
            headless: true,
        });
        const page = await browser.newPage();
        let companyDetails: CompanyDetails | null = null;

        try {
            await page.setRequestInterception(true);

            page.on('request', (request) => {
                request.continue();
            });

            page.on('response', async (response) => {
                if (response.url().includes('companyapi/v1/company-group-data/desktop')) {
                    try {
                        const json = await response.json();
                        if (json) {
                            companyDetails = {
                                name: json.commonCompanyName || "",
                                about: json.sections.aboutUs?.data?.description || "",
                                location: json.sections.moreInfo.data?.Headquarters || "",
                                industry: json.tags?.[0] || "",
                                size: json.sections.moreInfo.data?.['Company Size'] || "",
                                websiteLink: json.sections.moreInfo.data?.Website || "",
                            };
                        }
                    } catch (e) {
                        console.error("Error parsing Naukri company details:", e);
                    }
                }
            });

            await page.goto(companyDetailPageUrl, { waitUntil: 'load' });

            await waitFor(() => companyDetails !== null);

        } catch (error) {
            console.error("Error in Naukri fetchCompanyDetails:", error);
        } finally {
            await browser.close();
        }

        return companyDetails;
    }
}

function waitFor(cb: () => boolean) {
    const MAX_WAIT = 10000; // 10 seconds
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            if (cb()) {
                clearInterval(interval);
                resolve(true);
            }
            if (Date.now() - startTime > MAX_WAIT) {
                clearInterval(interval);
                reject("Timeout waiting for condition");
            }
        }, 100);
    });
}