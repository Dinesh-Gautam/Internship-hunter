// content.js

function createUI() {
    const btn = document.createElement('button');
    btn.className = 'ai-analyzer-btn';
    btn.textContent = 'Analyze Company';
    
    const panel = document.createElement('div');
    panel.className = 'ai-analyzer-panel';
    panel.innerHTML = `
        <h2>
            Company Analysis
            <button class="ai-close-btn">&times;</button>
        </h2>
        <div class="ai-loader">Analyzing... <br><small>This may take a few seconds</small></div>
        <div class="ai-result ai-analyzer-content"></div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    // Close Button Logic
    panel.querySelector('.ai-close-btn').addEventListener('click', () => {
        panel.classList.remove('visible');
    });

    btn.addEventListener('click', async () => {
        const panelEl = document.querySelector('.ai-analyzer-panel');
        const loader = document.querySelector('.ai-loader');
        const resultEl = document.querySelector('.ai-result');

        panelEl.classList.add('visible');
        loader.classList.add('visible');
        resultEl.textContent = '';

        const data = scrapeCompanyData();
        console.log("Scraped Data:", data);

        if (!data.name) {
            resultEl.textContent = "Could not find company Name. Please ensure you are on a Company Page.";
            loader.classList.remove('visible');
            return;
        }

        chrome.runtime.sendMessage({
            action: "analyzeCompany",
            data: data
        }, (response) => {
            loader.classList.remove('visible');
            if (response && response.success) {
                // Render Markdown
                // marked is loaded via manifest injection
                resultEl.innerHTML = marked.parse(response.data.analysis);
            } else {
                resultEl.textContent = "Error: " + (response?.error || "Unknown error");
            }
        });
    });
}

function scrapeCompanyData() {
    // Selectors are tricky on LinkedIn and change often. 
    // We try multiple strategies.
    
    const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.innerText.trim() : "";
    }

    // 1. Name
    let name = getText('h1'); // Usually the company name is the main H1
    if (!name) name = getText('.org-top-card-summary__title');

    // 2. Location
    let location =  getText('.org-top-card-summary-info-list__info-item:nth-child(1)');

    // 3. About
    // This is hard because "About" is often in a different tab or further down.
    // We'll try to grab the first substantial text block in the about section if visible, 
    // or just send what we have.
    let about = getText('.org-about-module__description');
    if (!about) about = getText('.org-grid__content-height-enforcer p'); 

    // 4. Website
    let website = "";
    const websiteLink = document.querySelector('a[href^="http"] .link-without-visited-state'); // generic?
    // Try finding a link that looks like a website in the top card
    const linkEl = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Website') || (a.href && !a.href.includes('linkedin.com') && a.closest('.org-top-card')));
    if (linkEl) website = linkEl.href;

    return {
        name,
        location,
        about,
        website
    };
}

// Check if we are on a company page roughly
function checkAndInject() {
    if (window.location.href.includes('/company/')) {
        const btn = document.querySelector('.ai-analyzer-btn');
        if (!btn) {
            console.log("Company page detected, injecting UI...");
            createUI();
        }
    } else if (window.location.href.includes('/jobs/')) {
         const btn = document.querySelector('.ai-tailor-btn');
         // Job details load dynamically. We need to find the right container.
         // Usually .jobs-details__main-content exists when a job is selected.
         const container = document.querySelector('.jobs-details__main-content');
         if (container && !btn) {
             console.log("Job page detected, injecting UI...");
             createJobUI();
         }
    }
    
    else {
        // cleanup if needed
    }
}

function createJobUI() {
    // Locate the action buttons container
    // .jobs-s-apply or .job-details-jobs-unified-top-card__top-buttons
    const topCardParams = document.querySelector('.job-details-jobs-unified-top-card__top-buttons') || document.querySelector('.jobs-s-apply');
    
    if (!topCardParams) return; // Not ready yet

    const btn = document.createElement('button');
    btn.className = 'artdeco-button artdeco-button--2 artdeco-button--secondary ai-tailor-btn';
    btn.textContent = '✨ Tailor Resume';
    btn.style.marginLeft = '8px';
    btn.style.backgroundColor = '#e8f0fe';
    btn.style.color = '#0a66c2';
    btn.style.border = '1px solid #0a66c2';

    // Avoid duplicating
    if (document.querySelector('.ai-tailor-btn')) return;

    // Append to the container. 
    // If it's the `jobs-s-apply` container, there might be other buttons.
    // We try to append to the parent of Apply button if possible, or just the detected container.
    topCardParams.appendChild(btn);

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        btn.textContent = 'Processing...';
        btn.disabled = true;

        const data = scrapeJobData();
        console.log("Scraped Job Data:", data);

        if (!data.title || !data.company) {
             alert('Could not extract job details. Please try again.');
             btn.textContent = '✨ Tailor Resume';
             btn.disabled = false;
             return;
        }

        chrome.runtime.sendMessage({
            action: "createDraftResume",
            data: data
        }, (response) => {
            btn.textContent = '✨ Tailor Resume';
            btn.disabled = false;

            if (response && response.success) {
                // Open the frontend editor
                window.open(`http://localhost:5173/tailor/${response.id}`, '_blank');
            } else {
                alert("Error: " + (response?.error || "Unknown error"));
            }
        });
    });
}

function scrapeJobData() {
    const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.innerText.trim() : "";
    }

    // Selectors based on temp.html analysis and general LinkedIn structure
    const title = getText('.job-details-jobs-unified-top-card__job-title h1') || getText('h1');
    const company = getText('.job-details-jobs-unified-top-card__company-name a') || getText('.job-details-jobs-unified-top-card__company-name');
    
    // Description is often in #job-details
    const descriptionEl = document.querySelector('#job-details') || document.querySelector('.jobs-description-content__text');
    const description = descriptionEl ? descriptionEl.innerText : "";

    const url = window.location.href;

    return {
        title,
        company,
        description,
        url
    };
}

// Run periodically to handle SPA navigation
setInterval(checkAndInject, 1000);
