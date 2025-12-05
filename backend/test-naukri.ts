import { NaukriPlugin } from './src/plugins/naukri.js';

(async () => {
    console.log("Testing NaukriPlugin...");
    const plugin = new NaukriPlugin();
    try {
        console.log("Fetching listings...");
        const listings = await plugin.fetchListings("https://www.naukri.com/internship-jobs?gad_campaignid=22496810618&glbl_qcrc=1028&wfhType=2");
        console.log(`Fetched ${listings.length} listings.`);

        if (listings.length > 0) {
            const firstListing = listings[0];
            console.log("First listing:", JSON.stringify(firstListing, null, 2));

            console.log(`Fetching details for ${firstListing.title} at ${firstListing.company}...`);
            const details = await plugin.fetchDetails(firstListing);
            console.log("Details:", JSON.stringify(details, null, 2));

            if (details && details.companyDetailPageUrl) {
                console.log(`Fetching company details from ${details.companyDetailPageUrl}...`);
                const companyDetails = await plugin.fetchCompanyDetails(details.companyDetailPageUrl);
                console.log("Company Details:", JSON.stringify(companyDetails, null, 2));
            } else {
                console.log("No company detail page URL found.");
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
})();
